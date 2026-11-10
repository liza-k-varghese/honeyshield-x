import * as THREE from 'three';
import { WatchModel, WatchConfig } from '../WatchModel';
import { CHRONOS_COLORS } from '../Materials';

export interface TimepieceMetrics {
  fps: number;
  balanceAngleDeg: number;
  tourbillonAngleDeg: number;
  explodedRatio: number;
  isTicking: boolean;
}

export type CameraPresetType = 'dial' | 'tourbillon' | 'profile' | 'exploded';

export class TimepieceEngine {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private watchModel: WatchModel;
  private clock: THREE.Clock;
  private animId: number | null = null;

  // Camera preset interpolation
  private targetCamPos = new THREE.Vector3(0, 0, 9.8);
  private targetLookAt = new THREE.Vector3(0, 0, 0);

  // Model rotation & damping
  private isDragging = false;
  private prevPointer = { x: 0, y: 0 };
  private modelRotation = { x: 0.15, y: -0.2 };

  // Current config
  private config: WatchConfig = {
    caseFinish: 'gold',
    dialStyle: 'skeleton',
    strapStyle: 'alligator',
    tourbillonSpeed: 1,
    explodedRatio: 0,
    isTicking: true,
  };

  // Telemetry broadcast
  private telemetrySubscribers: Set<(metrics: TimepieceMetrics) => void> = new Set();
  private frameCount = 0;
  private lastFpsCalcTime = 0;
  private currentFps = 60;

  // DOM Event handlers bound to instance
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;

  constructor(initialPreset: CameraPresetType = 'dial') {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CHRONOS_COLORS.background);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0, 9.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.setupLighting();

    this.watchModel = new WatchModel();
    this.scene.add(this.watchModel.group);

    this.clock = new THREE.Clock();

    // Bind event handlers
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);

    // Apply initial preset configuration
    if (initialPreset === 'exploded') {
      this.targetCamPos.set(4.2, 2.8, 6.8);
      this.modelRotation = { x: 0.35, y: -0.45 };
      this.config.explodedRatio = 1.0;
    }
    this.watchModel.group.rotation.x = this.modelRotation.x;
    this.watchModel.group.rotation.y = this.modelRotation.y;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x1C2730, 1.8);
    this.scene.add(ambientLight);

    // Key Antique Gold Spotlight
    const keyGoldLight = new THREE.DirectionalLight(0xF0E9DD, 2.8);
    keyGoldLight.position.set(5, 7, 6);
    this.scene.add(keyGoldLight);

    // Fill Warm Light
    const fillLight = new THREE.DirectionalLight(0xC8AA73, 1.6);
    fillLight.position.set(-6, -4, 4);
    this.scene.add(fillLight);

    // Rim Silhouette Light
    const rimLight = new THREE.DirectionalLight(0xAEB8BC, 2.2);
    rimLight.position.set(0, 8, -5);
    this.scene.add(rimLight);

    // Focused Tourbillon Cavity Light
    const tourbPointLight = new THREE.PointLight(0xC8AA73, 2.0, 5);
    tourbPointLight.position.set(0, -1.05, 1.5);
    this.scene.add(tourbPointLight);
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    container.appendChild(this.renderer.domElement);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDownBound);
    dom.addEventListener('pointermove', this.onPointerMoveBound);
    dom.addEventListener('pointerup', this.onPointerUpBound);
    dom.addEventListener('wheel', this.onWheelBound, { passive: false });

    this.startAnimationLoop();
  }

  public unmount(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.renderer.domElement) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this.onPointerDownBound);
      dom.removeEventListener('pointermove', this.onPointerMoveBound);
      dom.removeEventListener('pointerup', this.onPointerUpBound);
      dom.removeEventListener('wheel', this.onWheelBound);

      if (this.container && dom.parentElement === this.container) {
        this.container.removeChild(dom);
      }
    }

    this.container = null;
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public updateConfig(newConfig: Partial<WatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.watchModel.applyCustomConfig(this.config);
  }

  public setPreset(preset: CameraPresetType): void {
    switch (preset) {
      case 'dial':
        this.targetCamPos.set(0, 0, 9.8);
        this.targetLookAt.set(0, 0, 0);
        this.modelRotation = { x: 0.15, y: -0.2 };
        this.updateConfig({ explodedRatio: 0 });
        break;
      case 'tourbillon':
        this.targetCamPos.set(0, -1.05, 3.4);
        this.targetLookAt.set(0, -1.05, 0);
        this.modelRotation = { x: 0.1, y: 0 };
        break;
      case 'profile':
        this.targetCamPos.set(5.5, 0, 3.0);
        this.targetLookAt.set(0, 0, 0);
        this.modelRotation = { x: 0.1, y: Math.PI / 3 };
        break;
      case 'exploded':
        this.targetCamPos.set(4.2, 2.8, 6.8);
        this.targetLookAt.set(0, 0, 0);
        this.modelRotation = { x: 0.35, y: -0.45 };
        this.updateConfig({ explodedRatio: 1.0 });
        break;
    }
  }

  public subscribeTelemetry(callback: (metrics: TimepieceMetrics) => void): () => void {
    this.telemetrySubscribers.add(callback);
    return () => this.telemetrySubscribers.delete(callback);
  }

  private startAnimationLoop(): void {
    this.clock.start();
    this.lastFpsCalcTime = performance.now();
    this.frameCount = 0;

    const tick = () => {
      this.animId = requestAnimationFrame(tick);
      const delta = this.clock.getDelta();

      // Update watch mechanics
      this.watchModel.update(delta, this.config);

      // Smooth rotation damping
      this.watchModel.group.rotation.x += (this.modelRotation.x - this.watchModel.group.rotation.x) * 0.1;
      this.watchModel.group.rotation.y += (this.modelRotation.y - this.watchModel.group.rotation.y) * 0.1;

      // Smooth camera interpolation
      this.camera.position.lerp(this.targetCamPos, 0.08);
      this.camera.lookAt(this.targetLookAt);

      this.renderer.render(this.scene, this.camera);

      // Telemetry calculation
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsCalcTime >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsCalcTime));
        this.frameCount = 0;
        this.lastFpsCalcTime = now;

        if (this.telemetrySubscribers.size > 0) {
          const metrics: TimepieceMetrics = {
            fps: this.currentFps,
            balanceAngleDeg: Math.round(this.watchModel.getBalanceAngle() * (180 / Math.PI)),
            tourbillonAngleDeg: Math.round(this.watchModel.getTourbillonAngle() * (180 / Math.PI)) % 360,
            explodedRatio: this.config.explodedRatio,
            isTicking: this.config.isTicking,
          };
          this.telemetrySubscribers.forEach((cb) => cb(metrics));
        }
      }
    };

    tick();
  }

  private onPointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.prevPointer = { x: e.clientX, y: e.clientY };
    if (this.renderer.domElement) {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevPointer.x;
    const dy = e.clientY - this.prevPointer.y;
    this.prevPointer = { x: e.clientX, y: e.clientY };

    this.modelRotation.y += dx * 0.007;
    this.modelRotation.x += dy * 0.007;
    this.modelRotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.modelRotation.x));
  }

  private onPointerUp(e: PointerEvent): void {
    this.isDragging = false;
    if (this.renderer.domElement && this.renderer.domElement.hasPointerCapture(e.pointerId)) {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.005;
    const curDist = this.targetCamPos.length();
    const newDist = Math.max(3.0, Math.min(12.0, curDist + zoomDelta));
    this.targetCamPos.setLength(newDist);
  }

  public dispose(): void {
    this.unmount();
    this.renderer.dispose();
  }
}

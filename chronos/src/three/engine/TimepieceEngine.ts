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

  // Viewport visibility & context loss handling
  private intersectionObserver: IntersectionObserver | null = null;
  private isVisible = true;
  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: () => void;

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.setupLighting();
    this.setupStudioEnvironment();

    this.watchModel = new WatchModel();
    this.scene.add(this.watchModel.group);

    this.clock = new THREE.Clock();

    // Bind event handlers
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onContextLostBound = this.onContextLost.bind(this);
    this.onContextRestoredBound = this.onContextRestored.bind(this);

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
    const ambientLight = new THREE.AmbientLight(0x1C2730, 1.4);
    this.scene.add(ambientLight);

    // Key Specular Antique Gold Light
    const keyGoldLight = new THREE.DirectionalLight(0xF0E9DD, 2.4);
    keyGoldLight.position.set(5, 7, 6);
    this.scene.add(keyGoldLight);

    // Rim Silhouette Light
    const rimLight = new THREE.DirectionalLight(0xAEB8BC, 1.8);
    rimLight.position.set(0, 8, -5);
    this.scene.add(rimLight);

    // Focused Tourbillon Cavity Light
    const tourbPointLight = new THREE.PointLight(0xC8AA73, 1.8, 5);
    tourbPointLight.position.set(0, -1.05, 1.5);
    this.scene.add(tourbPointLight);
  }

  private setupStudioEnvironment(): void {
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();

      const width = 512;
      const height = 256;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Base dark obsidian studio gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1C2730');
        grad.addColorStop(0.35, '#24323D');
        grad.addColorStop(0.5, '#0D1117');
        grad.addColorStop(1, '#050709');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Overhead soft golden studio softbox highlight
        const overhead = ctx.createRadialGradient(width * 0.5, height * 0.2, 10, width * 0.5, height * 0.2, 120);
        overhead.addColorStop(0, 'rgba(230, 210, 176, 0.95)');
        overhead.addColorStop(0.5, 'rgba(200, 170, 115, 0.45)');
        overhead.addColorStop(1, 'rgba(28, 39, 48, 0)');
        ctx.fillStyle = overhead;
        ctx.fillRect(0, 0, width, height);

        // Lateral fill rim highlight for metallic reflection
        const lateral = ctx.createRadialGradient(width * 0.85, height * 0.45, 10, width * 0.85, height * 0.45, 90);
        lateral.addColorStop(0, 'rgba(174, 184, 188, 0.6)');
        lateral.addColorStop(1, 'rgba(13, 17, 23, 0)');
        ctx.fillStyle = lateral;
        ctx.fillRect(0, 0, width, height);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      this.scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();
    } catch {
      // Fallback silently if canvas or webgl context in pure headless fails
    }
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
    dom.addEventListener('webglcontextlost', this.onContextLostBound, false);
    dom.addEventListener('webglcontextrestored', this.onContextRestoredBound, false);

    // Viewport intersection observer: pause rendering loop when element is offscreen
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          this.isVisible = entry ? entry.isIntersecting : true;
        },
        { threshold: 0.05 }
      );
      this.intersectionObserver.observe(container);
    }

    this.startAnimationLoop();
  }

  public unmount(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.renderer.domElement) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointerdown', this.onPointerDownBound);
      dom.removeEventListener('pointermove', this.onPointerMoveBound);
      dom.removeEventListener('pointerup', this.onPointerUpBound);
      dom.removeEventListener('wheel', this.onWheelBound);
      dom.removeEventListener('webglcontextlost', this.onContextLostBound);
      dom.removeEventListener('webglcontextrestored', this.onContextRestoredBound);

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
      if (!this.isVisible) {
        return;
      }
      const delta = Math.min(this.clock.getDelta(), 0.1);

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

  private onContextLost(e: Event): void {
    e.preventDefault();
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private onContextRestored(): void {
    this.setupLighting();
    this.setupStudioEnvironment();
    this.startAnimationLoop();
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

import * as THREE from 'three';
import { TimelineSpirals, EpochItem, HOROLOGICAL_EPOCHS } from '../TimelineSpirals';
import { CHRONOS_COLORS } from '../Materials';

export class EpochsEngine {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private timeline: TimelineSpirals;
  private clock: THREE.Clock;
  private animId: number | null = null;

  private targetCamPos = new THREE.Vector3(0, 0, 7);
  private targetLookAt = new THREE.Vector3(0, 0, 0);

  // Pointer drag and zoom controls
  private isDragging = false;
  private prevPointer = { x: 0, y: 0 };
  private orbitRotation = { x: 0, y: 0 };

  // Viewport visibility & context loss handling
  private intersectionObserver: IntersectionObserver | null = null;
  private isVisible = true;
  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: () => void;

  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CHRONOS_COLORS.background);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 2, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    this.setupLighting();
    this.setupStudioEnvironment();

    this.timeline = new TimelineSpirals();
    this.scene.add(this.timeline.group);

    this.clock = new THREE.Clock();

    // Bind event handlers
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onContextLostBound = this.onContextLost.bind(this);
    this.onContextRestoredBound = this.onContextRestored.bind(this);

    // Default target: Harrison H4 (index 2)
    const defaultEpoch = HOROLOGICAL_EPOCHS[2];
    this.focusEpoch(defaultEpoch);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x1C2730, 2.0);
    this.scene.add(ambient);

    const keyGold = new THREE.PointLight(0xC8AA73, 2.5, 30);
    keyGold.position.set(0, 5, 8);
    this.scene.add(keyGold);

    const fillBlue = new THREE.DirectionalLight(0xAEB8BC, 1.2);
    fillBlue.position.set(-8, -4, -4);
    this.scene.add(fillBlue);
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
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1C2730');
        grad.addColorStop(0.4, '#24323D');
        grad.addColorStop(0.6, '#0D1117');
        grad.addColorStop(1, '#050709');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(width * 0.5, height * 0.3, 10, width * 0.5, height * 0.3, 140);
        glow.addColorStop(0, 'rgba(200, 170, 115, 0.7)');
        glow.addColorStop(1, 'rgba(13, 17, 23, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      this.scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();
    } catch {
      // Fallback silently if canvas context fails
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

  public focusEpoch(epoch: EpochItem): void {
    this.targetLookAt.copy(epoch.position);
    this.targetCamPos.set(
      epoch.position.x + 1.2,
      epoch.position.y + 0.8,
      epoch.position.z + 3.8
    );
  }

  private startAnimationLoop(): void {
    this.clock.start();

    const tick = () => {
      this.animId = requestAnimationFrame(tick);
      if (!this.isVisible) return;
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.timeline.update(delta);

      // Smooth orbit rotation damping
      this.timeline.group.rotation.y += (this.orbitRotation.y - this.timeline.group.rotation.y) * 0.08;
      this.timeline.group.rotation.x += (this.orbitRotation.x - this.timeline.group.rotation.x) * 0.08;

      // Smooth camera translation
      this.camera.position.lerp(this.targetCamPos, 0.05);
      this.camera.lookAt(this.targetLookAt);

      this.renderer.render(this.scene, this.camera);
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

    this.orbitRotation.y += dx * 0.005;
    this.orbitRotation.x += dy * 0.005;
    this.orbitRotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.orbitRotation.x));
  }

  private onPointerUp(e: PointerEvent): void {
    this.isDragging = false;
    if (this.renderer.domElement && this.renderer.domElement.hasPointerCapture(e.pointerId)) {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.004;
    const offset = new THREE.Vector3().subVectors(this.targetCamPos, this.targetLookAt);
    const newLen = Math.max(2.5, Math.min(14.0, offset.length() + zoomDelta));
    offset.setLength(newLen);
    this.targetCamPos.addVectors(this.targetLookAt, offset);
  }

  public dispose(): void {
    this.unmount();
    this.renderer.dispose();
  }
}

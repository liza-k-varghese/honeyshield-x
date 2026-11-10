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

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CHRONOS_COLORS.background);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 2, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.setupLighting();

    this.timeline = new TimelineSpirals();
    this.scene.add(this.timeline.group);

    this.clock = new THREE.Clock();

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

  public mount(container: HTMLElement): void {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    container.appendChild(this.renderer.domElement);

    this.startAnimationLoop();
  }

  public unmount(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.renderer.domElement && this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
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
      const delta = this.clock.getDelta();

      this.timeline.update(delta);

      // Smooth camera translation
      this.camera.position.lerp(this.targetCamPos, 0.05);
      this.camera.lookAt(this.targetLookAt);

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  public dispose(): void {
    this.unmount();
    this.renderer.dispose();
  }
}

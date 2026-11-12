/**
 * CHRONOS — System 2 Advanced 3D Integration Contract
 * 
 * ARCHITECTURAL SPECIFICATION:
 * - System 1: Client-facing React frontend, typography, layout, content narrative, and base Three.js stages.
 * - System 2: Future advanced 3D development (high-density volumetric shaders, procedural celestial particle systems,
 *             photorealistic PBR ray-tracing passes, and cinematic camera choreography) developed on dedicated hardware.
 * 
 * This contract establishes the formal typed boundary between System 1 presentation
 * and System 2 3D rendering engines, allowing independent development without frontend rewrites.
 */

export type System2QualitySetting = 'cinematic' | 'high' | 'balanced' | 'power_save';

export type System2ChapterId = 'origins' | 'ancient' | 'mechanical' | 'modern' | 'philosophy';

export type System2CameraPresetId =
  | 'overview_stage'
  | 'tourbillon_macro'
  | 'bezel_profile'
  | 'exploded_full'
  | 'helix_ancient'
  | 'helix_verge'
  | 'helix_harrison'
  | 'helix_quartz'
  | 'helix_quantum';

export interface System2CameraCoordinate {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export interface System2SceneLoadStatus {
  isLoaded: boolean;
  isLoading: boolean;
  progressPercent: number; // 0 to 100
  activeStage: System2ChapterId;
  error?: string | null;
}

export interface System2TelemetrySample {
  fps: number;
  frameTimeMs: number;
  balancePhaseRad: number;
  balanceAngleDeg: number;
  tourbillonAngleDeg: number;
  drawCalls: number;
  triangles: number;
  activeQuality: System2QualitySetting;
}

export interface System2ScrollDrivenProgress {
  globalProgress: number;     // 0.0 to 1.0 through the document
  chapterProgress: number;    // 0.0 to 1.0 within the active chapter
  activeChapter: System2ChapterId;
  scrollVelocity: number;
}

export interface System2InteractionEvent {
  type:
    | 'pointer_down'
    | 'pointer_move'
    | 'pointer_up'
    | 'wheel_zoom'
    | 'touch_pinch'
    | 'preset_select'
    | 'layer_explode'
    | 'quality_change'
    | 'audio_toggle';
  payload: Record<string, unknown>;
  timestamp: number;
}

/**
 * Formal System 2 Engine Lifecycle Interface
 * Any future advanced 3D engine created on System 2 must implement this interface.
 */
export interface ISystem2SpatialEngine {
  readonly id: string;
  readonly chapter: System2ChapterId;

  /** Initialize WebGL context and mount into target DOM element */
  mount(container: HTMLElement): Promise<void> | void;

  /** Handle responsive viewport resize */
  resize(width: number, height: number, devicePixelRatio?: number): void;

  /** Update active camera preset with smooth interpolation */
  setCameraPreset(presetId: System2CameraPresetId): void;

  /** Update scroll-driven progress across chapter narrative */
  updateScrollProgress(progress: System2ScrollDrivenProgress): void;

  /** Adjust rendering quality preset */
  setQuality(quality: System2QualitySetting): void;

  /** Subscribe to real-time engine telemetry (FPS, angles, draw calls) */
  subscribeTelemetry(callback: (sample: System2TelemetrySample) => void): () => void;

  /** Cleanly unmount DOM elements, release RAF loop, and dispose GPU memory */
  dispose(): void;
}

/**
 * Standard Viewport Dimension Contracts for System 1 Containers
 */
export const SYSTEM2_VIEWPORT_SPECS = {
  desktopWide: { width: 1440, minHeight: 740, maxHeight: 860, aspect: 16 / 9 },
  tabletLandscape: { width: 1024, minHeight: 640, maxHeight: 720, aspect: 4 / 3 },
  tabletPortrait: { width: 768, minHeight: 600, maxHeight: 680, aspect: 3 / 4 },
  mobilePhone: { width: 390, minHeight: 520, maxHeight: 600, aspect: 9 / 16 },
  dprLimits: { mobile: 1.5, desktop: 2.0 },
  maxTextureSize: 2048,
  expectedColorSpace: 'srgb',
} as const;

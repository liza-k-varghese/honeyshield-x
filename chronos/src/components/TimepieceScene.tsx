import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WatchConfig } from '../three/WatchModel';
import { TimepieceEngine, CameraPresetType, TimepieceMetrics } from '../three/engine/TimepieceEngine';
import { SceneContainer, CameraPresetOption } from './common/SceneContainer';
import {
  Layers,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sliders,
  Activity,
} from 'lucide-react';
import { horologyAudio } from './AudioHaptics';

interface TimepieceSceneProps {
  watchConfig: WatchConfig;
  onConfigChange: (newConfig: Partial<WatchConfig>) => void;
  onOpenSpecs: () => void;
  initialPreset?: CameraPresetType;
  heightClass?: string;
}

const CAMERA_PRESETS: CameraPresetOption<CameraPresetType>[] = [
  { id: 'dial', label: 'Dial' },
  { id: 'tourbillon', label: 'Tourbillon' },
  { id: 'profile', label: 'Profile' },
  { id: 'exploded', label: 'Exploded', icon: <Layers className="w-3.5 h-3.5" /> },
];

export const TimepieceScene: React.FC<TimepieceSceneProps> = ({
  watchConfig,
  onConfigChange,
  onOpenSpecs,
  initialPreset = 'dial',
  heightClass = 'h-[620px] md:h-[760px]',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TimepieceEngine | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetType>(initialPreset);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [telemetry, setTelemetry] = useState<TimepieceMetrics>({
    fps: 60,
    balanceAngleDeg: 0,
    tourbillonAngleDeg: 0,
    explodedRatio: watchConfig.explodedRatio,
    isTicking: watchConfig.isTicking,
  });

  // Mount Three.js Engine once canvas container mounts
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new TimepieceEngine(initialPreset);
    engine.mount(mountRef.current);
    engine.updateConfig(watchConfig);
    engineRef.current = engine;

    const unsubscribe = engine.subscribeTelemetry((metrics) => {
      setTelemetry(metrics);
    });

    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handle Preset Switching
  const handleSelectPreset = useCallback((preset: CameraPresetType) => {
    setActivePreset(preset);
    if (engineRef.current) {
      engineRef.current.setPreset(preset);
    }
    if (preset === 'dial') {
      onConfigChange({ explodedRatio: 0 });
    } else if (preset === 'exploded') {
      onConfigChange({ explodedRatio: 1.0 });
    }
  }, [onConfigChange]);

  // Audio Toggle
  const handleAudioToggle = () => {
    const active = horologyAudio.toggleMute();
    setIsAudioActive(active);
  };

  // Sync Watch Config to Engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(watchConfig);
    }
  }, [watchConfig]);

  // Viewport Resize Callback
  const handleResize = useCallback((width: number, height: number) => {
    if (engineRef.current) {
      engineRef.current.resize(width, height);
    }
  }, []);

  return (
    <SceneContainer<CameraPresetType>
      calibreBadge="Calibre CH-01 • 28,800 vph"
      cameraPresets={CAMERA_PRESETS}
      activePreset={activePreset}
      onSelectPreset={handleSelectPreset}
      heightClass={heightClass}
      onResizeViewport={handleResize}
      topRightSlot={
        <div className="hidden lg:flex items-center gap-2 bg-[rgba(28,39,48,0.85)] px-2.5 py-1.5 border border-[rgba(200,170,115,0.25)] rounded text-[10px] font-mono">
          <Activity className="w-3 h-3 text-[#C8AA73]" />
          <span className="text-[#AEB8BC]">FPS:</span>
          <span className="text-[#F0E9DD]">{telemetry.fps}</span>
          <span className="text-[rgba(200,170,115,0.4)]">|</span>
          <span className="text-[#AEB8BC]">BAL:</span>
          <span className="text-[#C8AA73]">{telemetry.balanceAngleDeg}°</span>
        </div>
      }
      bottomLeftSlot={
        <div className="flex items-center gap-1.5 bg-[rgba(28,39,48,0.9)] backdrop-blur-md p-1.5 border border-[rgba(200,170,115,0.3)] rounded">
          {/* Play / Pause */}
          <button
            onClick={() => onConfigChange({ isTicking: !watchConfig.isTicking })}
            className="p-1.5 text-[#C8AA73] hover:text-[#F0E9DD] transition-colors rounded"
            title={watchConfig.isTicking ? 'Pause Movement' : 'Start Movement'}
          >
            {watchConfig.isTicking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="h-4 w-[1px] bg-[rgba(200,170,115,0.3)]" />

          {/* Speed Multipliers */}
          {[1, 5, 60].map((s) => (
            <button
              key={s}
              onClick={() => onConfigChange({ tourbillonSpeed: s })}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                watchConfig.tourbillonSpeed === s
                  ? 'bg-[rgba(200,170,115,0.25)] text-[#C8AA73] font-bold'
                  : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
              }`}
            >
              {s}x
            </button>
          ))}

          <div className="h-4 w-[1px] bg-[rgba(200,170,115,0.3)]" />

          {/* Acoustic Haptics Toggle */}
          <button
            onClick={handleAudioToggle}
            className={`p-1.5 transition-colors rounded ${
              isAudioActive ? 'text-[#C8AA73]' : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
            }`}
            title="Toggle Escapement Sound"
          >
            {isAudioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      }
      bottomCenterSlot={
        <div className="flex items-center gap-2.5 bg-[rgba(28,39,48,0.9)] backdrop-blur-md px-3.5 py-1.5 border border-[rgba(200,170,115,0.3)] rounded">
          <Layers className="w-3.5 h-3.5 text-[#C8AA73]" />
          <span className="text-[11px] font-cinzel text-[#F0E9DD] hidden sm:inline">Exploded View</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={watchConfig.explodedRatio}
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
              onConfigChange({ explodedRatio: clamped });
            }}
            aria-label="Adjust Exploded View Ratio"
            className="w-24 sm:w-28 accent-[#C8AA73] cursor-pointer"
          />
          <span className="text-xs font-mono text-[#AEB8BC] min-w-[32px] text-right">
            {Math.round(watchConfig.explodedRatio * 100)}%
          </span>
        </div>
      }
      bottomRightSlot={
        <button
          onClick={onOpenSpecs}
          className="btn-gold !py-2 !px-3.5 text-xs shadow-md"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Specifications</span>
        </button>
      }
    >
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing canvas-wrapper"
      />
    </SceneContainer>
  );
};

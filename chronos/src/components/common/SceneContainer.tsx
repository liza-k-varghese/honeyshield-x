import React, { useRef, useEffect } from 'react';
import { Compass, Sparkles } from 'lucide-react';

export interface CameraPresetOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface SceneContainerProps<T extends string = string> {
  title?: string;
  calibreBadge?: string;
  engineBadge?: string;
  cameraPresets?: CameraPresetOption<T>[];
  activePreset?: T;
  onSelectPreset?: (preset: T) => void;
  topRightSlot?: React.ReactNode;
  bottomLeftSlot?: React.ReactNode;
  bottomCenterSlot?: React.ReactNode;
  bottomRightSlot?: React.ReactNode;
  overlayContent?: React.ReactNode;
  heightClass?: string;
  onResizeViewport?: (width: number, height: number) => void;
  children: React.ReactNode;
}

export function SceneContainer<T extends string = string>({
  calibreBadge = 'Calibre CH-01 • 28,800 vph',
  engineBadge = 'Spatial Engine • 4.0 Hz',
  cameraPresets,
  activePreset,
  onSelectPreset,
  topRightSlot,
  bottomLeftSlot,
  bottomCenterSlot,
  bottomRightSlot,
  overlayContent,
  heightClass = 'h-[580px] sm:h-[660px] lg:h-[740px]',
  onResizeViewport,
  children,
}: SceneContainerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !onResizeViewport) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          onResizeViewport(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [onResizeViewport]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${heightClass} overflow-hidden rounded-lg border border-[rgba(200,170,115,0.24)] bg-[#0D1117] blueprint-frame shadow-2xl transition-all duration-300`}
    >
      {/* 3D WebGL Canvas Injection Target */}
      <div className="w-full h-full select-none">
        {children}
      </div>

      {/* Top Floating Control HUD */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none z-20">
        {/* Left Badges */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Main Calibre Designation */}
          <div className="flex items-center gap-2 bg-[rgba(28,39,48,0.88)] backdrop-blur-md px-3.5 py-1.5 border border-[rgba(200,170,115,0.28)] rounded shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C8AA73] animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider text-[#F0E9DD] uppercase">
              {calibreBadge}
            </span>
          </div>

          {/* Spatial Engine Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 bg-[rgba(28,39,48,0.8)] backdrop-blur-md px-2.5 py-1.5 border border-[rgba(174,184,188,0.2)] rounded text-[10px] font-mono">
            <Compass className="w-3 h-3 text-[#C8AA73]" />
            <span className="text-[#AEB8BC]">{engineBadge}</span>
          </div>
        </div>

        {/* Right Camera Presets / Telemetry Slot */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {cameraPresets && cameraPresets.length > 0 && (
            <div className="flex items-center gap-1 bg-[rgba(28,39,48,0.88)] backdrop-blur-md p-1 border border-[rgba(200,170,115,0.28)] rounded">
              {cameraPresets.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset && onSelectPreset(preset.id)}
                    className={`px-2.5 py-1 text-[11px] font-cinzel rounded transition-all flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#C8AA73] text-[#0D1117] font-bold shadow-sm'
                        : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
                    }`}
                  >
                    {preset.icon}
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {topRightSlot}
        </div>
      </div>

      {/* Overlay Content Slot (e.g. Landmark Details Dossier) */}
      {overlayContent && (
        <div className="pointer-events-none z-10">
          {overlayContent}
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      {(bottomLeftSlot || bottomCenterSlot || bottomRightSlot) && (
        <div className="absolute bottom-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
          {/* Bottom Left Controls (Playback & Acoustics) */}
          <div className="pointer-events-auto flex items-center gap-2">
            {bottomLeftSlot}
          </div>

          {/* Bottom Center Controls (Exploded Separation) */}
          {bottomCenterSlot && (
            <div className="pointer-events-auto flex items-center gap-2">
              {bottomCenterSlot}
            </div>
          )}

          {/* Bottom Right Controls (Specifications Trigger) */}
          {bottomRightSlot && (
            <div className="pointer-events-auto flex items-center gap-2">
              {bottomRightSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

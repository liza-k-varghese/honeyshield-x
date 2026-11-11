import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EpochsEngine } from '../three/engine/EpochsEngine';
import { HOROLOGICAL_EPOCHS, EpochItem } from '../three/TimelineSpirals';
import { SceneContainer } from './common/SceneContainer';
import { ChevronRight, ChevronLeft, Orbit } from 'lucide-react';

interface EpochsTimelineSceneProps {
  activeIdx?: number;
  onSelectIdx?: (idx: number) => void;
}

export const EpochsTimelineScene: React.FC<EpochsTimelineSceneProps> = ({
  activeIdx: controlledIdx,
  onSelectIdx,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EpochsEngine | null>(null);
  const [internalIdx, setInternalIdx] = useState(0); // Default to Ancient 1500 BCE
  const activeIdx = controlledIdx !== undefined ? controlledIdx : internalIdx;
  const selectedEpoch = HOROLOGICAL_EPOCHS[activeIdx];

  // Initialize EpochsEngine
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new EpochsEngine();
    engine.mount(mountRef.current);
    engine.focusEpoch(HOROLOGICAL_EPOCHS[activeIdx]);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync external index changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.focusEpoch(HOROLOGICAL_EPOCHS[activeIdx]);
    }
  }, [activeIdx]);

  const handleSelectEpoch = useCallback((idx: number) => {
    setInternalIdx(idx);
    if (onSelectIdx) {
      onSelectIdx(idx);
    }
    const epoch = HOROLOGICAL_EPOCHS[idx];
    if (engineRef.current) {
      engineRef.current.focusEpoch(epoch);
    }
  }, [onSelectIdx]);

  const handleNext = () => {
    const nextIdx = (activeIdx + 1) % HOROLOGICAL_EPOCHS.length;
    handleSelectEpoch(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeIdx - 1 + HOROLOGICAL_EPOCHS.length) % HOROLOGICAL_EPOCHS.length;
    handleSelectEpoch(prevIdx);
  };

  const handleResize = useCallback((width: number, height: number) => {
    if (engineRef.current) {
      engineRef.current.resize(width, height);
    }
  }, []);

  return (
    <SceneContainer
      calibreBadge="Spacetime Helix • 3,500 Years of Chronometry"
      heightClass="h-[620px] md:h-[750px]"
      onResizeViewport={handleResize}
      topRightSlot={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[rgba(28,39,48,0.88)] backdrop-blur-md p-1 border border-[rgba(200,170,115,0.28)] rounded overflow-x-auto max-w-[280px] sm:max-w-none">
            {HOROLOGICAL_EPOCHS.map((ep, idx) => (
              <button
                key={ep.id}
                onClick={() => handleSelectEpoch(idx)}
                className={`px-2.5 py-1 rounded text-xs font-cinzel transition-all ${
                  activeIdx === idx
                    ? 'bg-[#C8AA73] text-[#0D1117] font-bold shadow-sm'
                    : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
                }`}
              >
                {ep.year}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 bg-[rgba(28,39,48,0.85)] hover:bg-[#C8AA73] hover:text-[#0D1117] text-[#F0E9DD] border border-[rgba(200,170,115,0.3)] rounded transition-colors"
              title="Previous Epoch"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 bg-[rgba(28,39,48,0.85)] hover:bg-[#C8AA73] hover:text-[#0D1117] text-[#F0E9DD] border border-[rgba(200,170,115,0.3)] rounded transition-colors"
              title="Next Epoch"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      }
      overlayContent={
        <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md pointer-events-none">
          <div className="pointer-events-auto bg-[rgba(28,39,48,0.92)] backdrop-blur-xl p-5 border border-[rgba(200,170,115,0.32)] rounded shadow-2xl space-y-3 blueprint-frame">
            <div className="flex items-center justify-between border-b border-[rgba(200,170,115,0.2)] pb-2">
              <span className="text-[11px] font-mono tracking-widest text-[#C8AA73] uppercase flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-[#C8AA73]" />
                Temporal Landmark
              </span>
              <span className="text-xs font-mono px-2 py-0.5 bg-[rgba(200,170,115,0.15)] text-[#C8AA73] rounded border border-[rgba(200,170,115,0.3)]">
                {selectedEpoch.year}
              </span>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-cinzel font-bold text-[#F0E9DD]">
                {selectedEpoch.title}
              </h3>
              <p className="text-xs font-mono text-[#AEB8BC] mt-0.5">
                {selectedEpoch.subtitle}
              </p>
            </div>

            <p className="text-xs leading-relaxed text-[#AEB8BC]">
              {selectedEpoch.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(200,170,115,0.15)] text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#AEB8BC] block uppercase">Oscillator</span>
                <span className="text-[#F0E9DD] font-semibold">{selectedEpoch.oscillator}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#AEB8BC] block uppercase">Accuracy</span>
                <span className="text-[#C8AA73] font-semibold">{selectedEpoch.accuracy}</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div ref={mountRef} className="w-full h-full canvas-wrapper" />
    </SceneContainer>
  );
};

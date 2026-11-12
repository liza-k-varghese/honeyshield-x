import React from 'react';
import { WatchConfig } from '../three/WatchModel';
import { TimepieceScene } from './TimepieceScene';
import { ChronosChapterTab } from './Header';
import { Clock, Layers, Compass, BookOpen, Cpu, ArrowRight, Sparkles, Sun } from 'lucide-react';

interface OriginsHeroProps {
  watchConfig: WatchConfig;
  onConfigChange: (newConfig: Partial<WatchConfig>) => void;
  onOpenSpecs: () => void;
  onSelectChapter: (chapter: ChronosChapterTab) => void;
}

export const OriginsHero: React.FC<OriginsHeroProps> = ({
  watchConfig,
  onConfigChange,
  onOpenSpecs,
  onSelectChapter,
}) => {
  return (
    <div className="space-y-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Hero Visual Composition & Narrative Prologue */}
      <div className="text-center space-y-5 max-w-3xl mx-auto pt-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[rgba(200,170,115,0.12)] border border-[rgba(200,170,115,0.28)] rounded-full text-xs font-mono text-[#C8AA73]">
          <Sun className="w-3.5 h-3.5 text-[#C8AA73]" />
          <span>CHAPTER 00 • CELESTIAL CYCLES, SOLAR MOTION & ENTROPY</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-cinzel font-black tracking-tight text-[#F0E9DD] leading-none">
          THE ARCHITECTURE <br />
          <span className="text-gold-gradient">OF TIME</span>
        </h1>

        <p className="text-sm md:text-base text-[#AEB8BC] leading-relaxed font-sans max-w-2xl mx-auto">
          Time is the unseen dimension through which cosmic entropy and human consciousness unfold.
          Traverse 3,500 years of chronometry—from solar shadows and marine balance springs to
          high-frequency tourbillons and quantum optical lattice resonance.
        </p>

        {/* Narrative Chapter Fast-Travel Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onSelectChapter('ancient')}
            className="btn-outline"
          >
            <Sun className="w-4 h-4 text-[#C8AA73]" />
            <span>01 Ancient Shadows</span>
          </button>
          <button
            onClick={() => onSelectChapter('mechanical')}
            className="btn-gold"
          >
            <Layers className="w-4 h-4" />
            <span>02 Mechanical Tourbillon</span>
          </button>
          <button
            onClick={() => onSelectChapter('modern')}
            className="btn-outline"
          >
            <Cpu className="w-4 h-4 text-[#C8AA73]" />
            <span>03 Modern Precision</span>
          </button>
          <button
            onClick={() => onSelectChapter('philosophy')}
            className="btn-outline !border-[rgba(174,184,188,0.25)] hover:!border-[#C8AA73]"
          >
            <BookOpen className="w-4 h-4 text-[#C8AA73]" />
            <span>04 Philosophy</span>
          </button>
        </div>
      </div>

      {/* Metrology Benchmark Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-2 border-y border-[rgba(200,170,115,0.18)] text-center font-mono">
        <div className="py-2.5">
          <span className="text-[10px] text-[#AEB8BC] uppercase tracking-wider block">Harmonic Frequency</span>
          <span className="text-xs sm:text-sm md:text-base text-[#F0E9DD] font-semibold">4.0 Hz / 28,800 vph</span>
        </div>
        <div className="py-2.5 border-l border-[rgba(174,184,188,0.12)]">
          <span className="text-[10px] text-[#AEB8BC] uppercase tracking-wider block">Gravitational Neutralizer</span>
          <span className="text-xs sm:text-sm md:text-base text-[#C8AA73] font-semibold">60s Flying Tourbillon</span>
        </div>
        <div className="py-2.5 border-l border-[rgba(174,184,188,0.12)]">
          <span className="text-[10px] text-[#AEB8BC] uppercase tracking-wider block">Autonomous Energy</span>
          <span className="text-xs sm:text-sm md:text-base text-[#F0E9DD] font-semibold">72-Hour Twin Barrels</span>
        </div>
        <div className="py-2.5 border-l border-[rgba(174,184,188,0.12)]">
          <span className="text-[10px] text-[#AEB8BC] uppercase tracking-wider block">Frictionless Pivot</span>
          <span className="text-xs sm:text-sm md:text-base text-[#C8AA73] font-semibold">34 Synthetic Rubies</span>
        </div>
      </div>

      {/* Central 3D Interactive Spatial Stage */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-cinzel font-bold text-[#F0E9DD]">
              Calibre CH-01 Spatial Prototype
            </h2>
            <p className="text-xs text-[#AEB8BC] font-mono">
              Drag to rotate in 3D • Scroll to zoom • Select camera presets or adjust mechanical speed
            </p>
          </div>
        </div>

        <TimepieceScene
          watchConfig={watchConfig}
          onConfigChange={onConfigChange}
          onOpenSpecs={onOpenSpecs}
          initialPreset="dial"
        />
      </section>

      {/* Three Foundational Pillars of Horology */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="glass-panel p-6 sm:p-7 rounded-lg space-y-3 glass-panel-hover blueprint-frame">
          <div className="w-10 h-10 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)]">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-cinzel text-base font-bold text-[#F0E9DD]">
            The Gravitational Dilemma
          </h3>
          <p className="text-xs text-[#AEB8BC] leading-relaxed">
            Terrestrial gravity pulls unevenly on oscillating balance springs across varying physical orientations.
            The 60-second rotating cage continuously averages out positional rate variations in three-dimensional space.
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-7 rounded-lg space-y-3 glass-panel-hover blueprint-frame">
          <div className="w-10 h-10 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)]">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-cinzel text-base font-bold text-[#F0E9DD]">
            Skeletal Architecture
          </h3>
          <p className="text-xs text-[#AEB8BC] leading-relaxed">
            Every structural bridge, pinion tooth, and ruby jewel is exposed to human sight.
            Experience interactive Z-axis exploded layer separation with physically based lighting.
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-7 rounded-lg space-y-3 glass-panel-hover blueprint-frame">
          <div className="w-10 h-10 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)]">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-cinzel text-base font-bold text-[#F0E9DD]">
            28,800 vph Regulation
          </h3>
          <p className="text-xs text-[#AEB8BC] leading-relaxed">
            High-frequency 4.0 Hz harmonic oscillation dividing every single second into 8 discrete impulses,
            producing mechanical tick-tack acoustics synthesized via real-time Web Audio API.
          </p>
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { WatchConfig } from '../three/WatchModel';
import { TimepieceScene } from './TimepieceScene';
import { AtelierConfigurator } from './AtelierConfigurator';
import { Layers, Sliders, Cpu, Activity, Clock, Shield, Sparkles } from 'lucide-react';

interface MechanicalSectionProps {
  watchConfig: WatchConfig;
  onConfigChange: (newConfig: Partial<WatchConfig>) => void;
  onOpenSpecs: () => void;
}

export const MechanicalSection: React.FC<MechanicalSectionProps> = ({
  watchConfig,
  onConfigChange,
  onOpenSpecs,
}) => {
  return (
    <div className="space-y-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Chapter Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[rgba(200,170,115,0.18)] pb-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(200,170,115,0.12)] border border-[rgba(200,170,115,0.28)] rounded-full text-xs font-mono text-[#C8AA73]">
            <Clock className="w-3.5 h-3.5 text-[#C8AA73]" />
            <span>CHAPTER 02 • GEAR TRAINS, ESCAPEMENTS & ISOCHRONISM</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-cinzel font-black tracking-tight text-[#F0E9DD]">
            THE MECHANICAL REVOLUTION & <br />
            <span className="text-gold-gradient">THE KINEMATIC TOURBILLON</span>
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#AEB8BC] leading-relaxed font-sans">
            How humanity transformed continuous gravitational falling weight into disciplined harmonic ticks.
            Inspect the 4.0 Hz Calibre CH-01 60-second flying tourbillon, deconstruct its architectural layers in 3D,
            and explore precious metallurgy in real time.
          </p>
        </div>

        {/* Quick Exploded Separation Presets */}
        <div className="flex items-center gap-2 bg-[#1C2730] p-1.5 rounded border border-[rgba(200,170,115,0.25)] self-start md:self-auto blueprint-frame">
          <span className="text-[10px] font-mono text-[#AEB8BC] px-2 uppercase">Decomposition:</span>
          {[
            { label: '0%', val: 0 },
            { label: '35%', val: 0.35 },
            { label: '70%', val: 0.7 },
            { label: '100%', val: 1.0 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onConfigChange({ explodedRatio: item.val })}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                Math.abs(watchConfig.explodedRatio - item.val) < 0.08
                  ? 'bg-[#C8AA73] text-[#0D1117] font-bold'
                  : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary 3D Exploded Anatomy Stage */}
      <section className="space-y-4">
        <TimepieceScene
          watchConfig={{ ...watchConfig, explodedRatio: watchConfig.explodedRatio || 0.85 }}
          onConfigChange={onConfigChange}
          onOpenSpecs={onOpenSpecs}
          initialPreset="exploded"
        />

        {/* 4 Architectural Tier Decomposition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {[
            {
              tier: 'Tier 1 • Frontage',
              title: 'Stepped Bezel & Glass',
              desc: 'Antique gold fluted bezel securing a 1.2mm domed anti-reflective sapphire crystal preventing chromatic distortion.',
              ratio: 0.25,
            },
            {
              tier: 'Tier 2 • Display',
              title: 'Dial & Dauphine Hands',
              desc: 'Skeletonized chapter ring with warm ivory luminescent inserts, polished bevels, and faceted gold hour/minute hands.',
              ratio: 0.5,
            },
            {
              tier: 'Tier 3 • Kinetic Core',
              title: 'Gear Train & Tourbillon',
              desc: 'Center wheel, third wheel, fourth wheel, and 60-second flying tourbillon carriage rotating on 34 synthetic ruby bearings.',
              ratio: 0.75,
            },
            {
              tier: 'Tier 4 • Potential Energy',
              title: 'Twin Barrels & 22K Rotor',
              desc: 'Dual high-torque mainspring barrels delivering 72 hours of linear power, wound by an engraved guilloché oscillating mass.',
              ratio: 1.0,
            },
          ].map((item) => (
            <button
              key={item.tier}
              onClick={() => onConfigChange({ explodedRatio: item.ratio })}
              className="bg-[#1C2730] p-4 rounded border text-left transition-all blueprint-frame hover:border-[#C8AA73] hover:bg-[#24323D] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73]"
              style={{
                borderColor:
                  Math.abs(watchConfig.explodedRatio - item.ratio) < 0.15
                    ? '#C8AA73'
                    : 'rgba(200,170,115,0.2)',
              }}
            >
              <span className="text-[10px] font-mono text-[#C8AA73] uppercase block group-hover:text-[#E6D2B0]">
                {item.tier}
              </span>
              <h4 className="font-cinzel text-sm font-bold text-[#F0E9DD] mt-1 group-hover:text-[#C8AA73] transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-[#AEB8BC] mt-1.5 leading-relaxed font-sans">
                {item.desc}
              </p>
              <span className="text-[10px] font-mono text-[#C8AA73]/70 mt-2 block">
                Click to separate to {Math.round(item.ratio * 100)}% →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Secondary Horological Atelier Metallurgy & Physics Sandbox */}
      <section className="pt-8 border-t border-[rgba(200,170,115,0.18)] space-y-6">
        <div className="space-y-1">
          <span className="text-xs font-mono tracking-widest text-[#C8AA73] uppercase block">
            Materiality & Acoustic Synthesis
          </span>
          <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-[#F0E9DD]">
            Horological Metallurgy & Harmonics Sandbox
          </h3>
          <p className="text-xs md:text-sm text-[#AEB8BC] max-w-2xl font-sans">
            Customize case alloys, dial architecture, and deployment straps. Listen to the mechanical 4.0 Hz
            escapement clicks synthesized via real-time Web Audio API.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 3D Model Viewport (2 Cols) */}
          <div className="lg:col-span-2">
            <TimepieceScene
              watchConfig={watchConfig}
              onConfigChange={onConfigChange}
              onOpenSpecs={onOpenSpecs}
              initialPreset="dial"
              heightClass="h-[540px] sm:h-[620px] lg:h-[700px]"
            />
          </div>

          {/* Configurator Controls (1 Col) */}
          <div className="lg:col-span-1 space-y-4">
            <AtelierConfigurator
              config={watchConfig}
              onChange={onConfigChange}
            />

            {/* Material Physics Dossier Card */}
            <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] text-xs font-mono space-y-2 blueprint-frame">
              <span className="text-[10px] text-[#C8AA73] uppercase block font-bold">
                Active Material Metrology
              </span>
              <div className="flex justify-between py-1 border-b border-[rgba(174,184,188,0.1)]">
                <span className="text-[#AEB8BC]">Active Alloy</span>
                <span className="text-[#C8AA73] uppercase font-semibold">
                  {watchConfig.caseFinish === 'gold'
                    ? '18K 4N Antique Gold'
                    : watchConfig.caseFinish === 'obsidian'
                    ? 'Obsidian DLC (3,000 HV)'
                    : 'Grade 5 Titanium'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[rgba(174,184,188,0.1)]">
                <span className="text-[#AEB8BC]">Dial Display</span>
                <span className="text-[#F0E9DD] uppercase">{watchConfig.dialStyle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[rgba(174,184,188,0.1)]">
                <span className="text-[#AEB8BC]">Strap Integration</span>
                <span className="text-[#F0E9DD] uppercase">{watchConfig.strapStyle}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#AEB8BC]">Harmonic Cadence</span>
                <span className="text-[#C8AA73]">8 Impulses / Second (4 Hz)</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { WatchConfig } from '../three/WatchModel';
import { SlidersHorizontal, RefreshCw, Sparkles, Layers, Shield } from 'lucide-react';

interface AtelierConfiguratorProps {
  config: WatchConfig;
  onChange: (newConfig: Partial<WatchConfig>) => void;
}

export const AtelierConfigurator: React.FC<AtelierConfiguratorProps> = ({ config, onChange }) => {
  return (
    <div className="bg-[#1C2730]/90 backdrop-blur-xl border border-[rgba(200,170,115,0.25)] rounded-lg p-5 sm:p-6 space-y-6 blueprint-frame shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(200,170,115,0.2)] pb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#C8AA73] uppercase block">
            Chapter 02 • Metallurgy & Aesthetics
          </span>
          <h3 className="font-cinzel text-base sm:text-lg font-bold text-[#F0E9DD] uppercase tracking-wider">
            Horological Atelier
          </h3>
          <p className="text-xs text-[#AEB8BC] font-mono mt-0.5">
            PBR Metallurgy & Harmonic Physics Sandbox
          </p>
        </div>
        <button
          onClick={() =>
            onChange({
              caseFinish: 'gold',
              dialStyle: 'skeleton',
              strapStyle: 'alligator',
              tourbillonSpeed: 1,
              explodedRatio: 0,
            })
          }
          className="text-xs text-[#C8AA73] hover:text-[#F0E9DD] flex items-center gap-1.5 font-mono transition-colors px-2 py-1 rounded bg-[rgba(200,170,115,0.1)] border border-[rgba(200,170,115,0.2)]"
          title="Reset to Master Prototype"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Case Metallurgy Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-cinzel font-semibold tracking-wider text-[#F0E9DD] uppercase flex items-center justify-between">
          <span>Case Metallurgy</span>
          <span className="text-[11px] font-mono text-[#C8AA73]">
            {config.caseFinish === 'gold'
              ? 'Antique Gold (18K 4N)'
              : config.caseFinish === 'obsidian'
              ? 'Obsidian DLC (3,000 HV)'
              : 'Aerospace Titanium (Gr. 5)'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            onClick={() => onChange({ caseFinish: 'gold' })}
            className={`p-3 rounded border text-left transition-all ${
              config.caseFinish === 'gold'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#C8AA73] mb-1.5 border border-[#E6D2B0]" />
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">18K Gold</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">4N Precious Alloy</div>
          </button>

          <button
            onClick={() => onChange({ caseFinish: 'obsidian' })}
            className={`p-3 rounded border text-left transition-all ${
              config.caseFinish === 'obsidian'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#080B0F] mb-1.5 border border-[rgba(200,170,115,0.4)]" />
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Obsidian</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Diamond-Like Carbon</div>
          </button>

          <button
            onClick={() => onChange({ caseFinish: 'titanium' })}
            className={`p-3 rounded border text-left transition-all ${
              config.caseFinish === 'titanium'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#24323D] mb-1.5 border border-[#AEB8BC]" />
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Titanium</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Micro-Blasted Ti-6Al-4V</div>
          </button>
        </div>
      </div>

      {/* 2. Dial Architecture Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-cinzel font-semibold tracking-wider text-[#F0E9DD] uppercase flex items-center justify-between">
          <span>Dial Architecture</span>
          <span className="text-[11px] font-mono text-[#C8AA73]">
            {config.dialStyle === 'skeleton'
              ? 'Open-Worked Skeleton'
              : config.dialStyle === 'sunburst_black'
              ? 'Guilloché Clous de Paris'
              : 'Grand Feu Warm Ivory'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            onClick={() => onChange({ dialStyle: 'skeleton' })}
            className={`p-3 rounded border text-left transition-all ${
              config.dialStyle === 'skeleton'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Skeleton</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Open Train Transmission</div>
          </button>

          <button
            onClick={() => onChange({ dialStyle: 'sunburst_black' })}
            className={`p-3 rounded border text-left transition-all ${
              config.dialStyle === 'sunburst_black'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Guilloché</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Clous de Paris Pattern</div>
          </button>

          <button
            onClick={() => onChange({ dialStyle: 'warm_ivory' })}
            className={`p-3 rounded border text-left transition-all ${
              config.dialStyle === 'warm_ivory'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Warm Ivory</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Grand Feu Enamel</div>
          </button>
        </div>
      </div>

      {/* 3. Strap & Bracelet Integration */}
      <div className="space-y-2.5">
        <label className="text-xs font-cinzel font-semibold tracking-wider text-[#F0E9DD] uppercase flex items-center justify-between">
          <span>Strap Integration</span>
          <span className="text-[11px] font-mono text-[#C8AA73]">
            {config.strapStyle === 'alligator'
              ? 'Obsidian Alligator'
              : config.strapStyle === 'gold_mesh'
              ? 'Articulated Gold Milanese'
              : 'Hand-Waxed Slate Calf'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            onClick={() => onChange({ strapStyle: 'alligator' })}
            className={`p-3 rounded border text-left transition-all ${
              config.strapStyle === 'alligator'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Alligator</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Matte Obsidian Hide</div>
          </button>

          <button
            onClick={() => onChange({ strapStyle: 'gold_mesh' })}
            className={`p-3 rounded border text-left transition-all ${
              config.strapStyle === 'gold_mesh'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Gold Mesh</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Articulated Milanese</div>
          </button>

          <button
            onClick={() => onChange({ strapStyle: 'slate_leather' })}
            className={`p-3 rounded border text-left transition-all ${
              config.strapStyle === 'slate_leather'
                ? 'border-[#C8AA73] bg-[rgba(200,170,115,0.15)] shadow-md'
                : 'border-[rgba(174,184,188,0.2)] bg-[#0D1117] hover:border-[rgba(200,170,115,0.4)]'
            }`}
          >
            <div className="text-xs font-cinzel font-bold text-[#F0E9DD]">Slate Calf</div>
            <div className="text-[10px] text-[#AEB8BC] font-mono">Hand-Waxed Stitching</div>
          </button>
        </div>
      </div>
    </div>
  );
};

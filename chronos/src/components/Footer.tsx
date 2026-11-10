import React from 'react';
import { Award, Compass, Shield, Orbit, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#080B0F] border-t border-[rgba(200,170,115,0.2)] py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[rgba(174,184,188,0.12)]">
          {/* Col 1: Brand & Narrative Philosophy */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8AA73]" />
              <span className="font-cinzel text-xl font-bold tracking-[0.2em] text-[#F0E9DD] block">
                CHRONOS
              </span>
            </div>
            <p className="text-xs font-mono text-[#C8AA73] tracking-widest uppercase">
              The Architecture of Time • Spatial Exhibition
            </p>
            <p className="text-xs text-[#AEB8BC] leading-relaxed max-w-lg">
              Exploring 3,500 years of chronometry—from ancient shadow gnomons and water clocks to 
              mechanical tourbillon regulation and modern strontium optical lattice atomic resonance.
              A celebration of humanity's spatial answer to entropy and gravity.
            </p>
          </div>

          {/* Col 2: Color Architecture Matrix */}
          <div className="space-y-2.5 text-xs font-mono">
            <span className="text-[#C8AA73] font-cinzel font-bold uppercase tracking-wider block">
              Chromatic System
            </span>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#0D1117] border border-[#C8AA73]" />
              <span className="text-[#AEB8BC]">Obsidian Black #0D1117 (Void)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#1C2730] border border-[#AEB8BC]" />
              <span className="text-[#AEB8BC]">Deep Slate #1C2730 (Structure)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#C8AA73]" />
              <span className="text-[#AEB8BC]">Antique Gold #C8AA73 (Trim)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#F0E9DD]" />
              <span className="text-[#AEB8BC]">Warm Ivory #F0E9DD (Lume)</span>
            </div>
          </div>

          {/* Col 3: Standards & References */}
          <div className="space-y-2 text-xs font-mono">
            <span className="text-[#C8AA73] font-cinzel font-bold uppercase tracking-wider block">
              Horological Metrology
            </span>
            <div className="text-[#AEB8BC] flex items-center gap-1.5">
              <span className="text-[#C8AA73]">•</span> ISO 3159 Certified Chronometer
            </div>
            <div className="text-[#AEB8BC] flex items-center gap-1.5">
              <span className="text-[#C8AA73]">•</span> Poinçon de Genève Hallmark
            </div>
            <div className="text-[#AEB8BC] flex items-center gap-1.5">
              <span className="text-[#C8AA73]">•</span> BIPM UTC Atomic Reference
            </div>
            <div className="text-[#AEB8BC] flex items-center gap-1.5">
              <span className="text-[#C8AA73]">•</span> Royal Observatory Meridian (0° 00' 00")
            </div>
          </div>
        </div>

        {/* Colophon & Coordinates */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#AEB8BC] gap-4">
          <div>
            CHRONOS Spatial Exhibition • Geneva Atelier (46.2044° N, 6.1432° E)
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#C8AA73]">Oscillator: 4.0 Hz (28,800 vph)</span>
            <span>•</span>
            <span>Escapement: Flying 60s Tourbillon</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

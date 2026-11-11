import React, { useEffect } from 'react';
import { X, Award, CheckCircle2, Shield, Cpu, Activity, Compass } from 'lucide-react';

interface SpecificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecificationsModal: React.FC<SpecificationsModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-modal-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0D1117] border border-[rgba(200,170,115,0.4)] rounded-lg shadow-2xl p-6 sm:p-8 space-y-6 blueprint-frame"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(200,170,115,0.2)] pb-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-[#C8AA73]" />
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#C8AA73] uppercase block">
                Haute Horlogerie Technical Dossier
              </span>
              <h3 id="dossier-modal-title" className="font-cinzel text-lg sm:text-xl font-bold text-[#F0E9DD] tracking-wide">
                Calibre CH-01 Flying Tourbillon
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#AEB8BC] hover:text-[#C8AA73] rounded-full hover:bg-[rgba(28,39,48,0.5)] transition-colors"
            aria-label="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase tracking-wider block font-bold">
              Escapement & Regulation
            </span>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Mechanism</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Flying 60s Tourbillon</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Oscillation Frequency</span>
              <span className="text-[#F0E9DD] font-semibold text-right">4.0 Hz (28,800 vph)</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Balance Spring</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Breguet Overcoil</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1">
              <span className="text-[#AEB8BC] shrink-0">Jewel Bearings</span>
              <span className="text-[#F0E9DD] font-semibold text-right">34 Synthetic Rubies</span>
            </div>
          </div>

          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase tracking-wider block font-bold">
              Energy & Power Reserve
            </span>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Winding System</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Automatic 22K Gold Rotor</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Power Reserve</span>
              <span className="text-[#F0E9DD] font-semibold text-right">72 Hours (3 Days)</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Mainspring Barrel</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Twin High-Torque Barrels</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1">
              <span className="text-[#AEB8BC] shrink-0">Harmonic Equation</span>
              <span className="text-[#C8AA73] font-semibold text-right">θ(t) = A · sin(ωt)</span>
            </div>
          </div>

          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase tracking-wider block font-bold">
              Exterior Metallurgy
            </span>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Case Proportions</span>
              <span className="text-[#F0E9DD] font-semibold text-right">41.5 mm × 10.8 mm</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Primary Alloys</span>
              <span className="text-[#F0E9DD] font-semibold text-right">18K 4N Gold / DLC Obsidian</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Crystals</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Double Domed Sapphire</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1">
              <span className="text-[#AEB8BC] shrink-0">Atmospheric Pressure</span>
              <span className="text-[#F0E9DD] font-semibold text-right">100 Meters / 10 ATM</span>
            </div>
          </div>

          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase tracking-wider block font-bold">
              Artisanal Finishing & Seals
            </span>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Mainplate Finish</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Circular Côtes de Genève</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Bridges Chamfering</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Hand-Polished Anglage</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC] shrink-0">Fasteners</span>
              <span className="text-[#F0E9DD] font-semibold text-right">Flame-Blued Tempered Steel</span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1">
              <span className="text-[#AEB8BC] shrink-0">Hallmark</span>
              <span className="text-[#C8AA73] font-semibold text-right">Poinçon de Genève Certified</span>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[rgba(200,170,115,0.2)]">
          <div className="flex items-center gap-2 text-xs text-[#AEB8BC] font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#C8AA73]" />
            <span>ISO 3159 Independent Chronometer Certified (-1/+2 sec/day)</span>
          </div>
          <button
            onClick={onClose}
            className="btn-gold !py-2 !px-4 text-xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

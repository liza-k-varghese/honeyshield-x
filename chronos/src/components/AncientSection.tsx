import React, { useState } from 'react';
import { Sun, Droplets, Compass, Orbit, Sparkles, BookOpen } from 'lucide-react';
import { EpochsTimelineScene } from './EpochsTimelineScene';

export const AncientSection: React.FC = () => {
  const [activeEpochIdx, setActiveEpochIdx] = useState(0);

  return (
    <div className="space-y-12 animate-fadeIn">
      {/* Chapter Header */}
      <div className="text-center space-y-4 pt-2 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(200,170,115,0.12)] border border-[rgba(200,170,115,0.28)] rounded-full text-xs font-mono text-[#C8AA73]">
          <Sun className="w-3.5 h-3.5 text-[#C8AA73]" />
          <span>CHAPTER 01 • SHADOWS, FLUIDS & CELESTIAL COMPUTATION</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F0E9DD]">
          ANCIENT CHRONOMETRY & <br />
          <span className="text-gold-gradient">THE SOLAR DIVISIONS</span>
        </h2>

        <p className="text-sm md:text-base text-[#AEB8BC] leading-relaxed font-sans">
          Before escapements and gears, time was read in the cast of terrestrial shadows and the steady draining
          of water. Ancient civilizations calibrated human life against the diurnal arch of the sun and the lunar synodic month.
        </p>
      </div>

      {/* 3D Spacetime Helix Stage */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-cinzel font-bold text-[#F0E9DD]">
              3D Spacetime Helix • 35 Centuries of Temporal Navigation
            </h3>
            <p className="text-xs text-[#AEB8BC] font-mono">
              Drag to orbit • Scroll to zoom • Click any epoch node along the mathematical helix to translate the spatial camera
            </p>
          </div>
        </div>

        <EpochsTimelineScene activeIdx={activeEpochIdx} onSelectIdx={setActiveEpochIdx} />
      </section>

      {/* 4 Pillars of Ancient Measurement */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
        <button
          onClick={() => setActiveEpochIdx(0)}
          className="bg-[#1C2730] p-5 rounded border text-left transition-all blueprint-frame space-y-3 hover:border-[#C8AA73] hover:bg-[#24323D] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73]"
          style={{
            borderColor: activeEpochIdx === 0 ? '#C8AA73' : 'rgba(200,170,115,0.22)',
          }}
        >
          <div className="w-9 h-9 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)] group-hover:border-[#C8AA73]">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase block">c. 1500 BCE • Egypt</span>
            <h4 className="font-cinzel text-sm font-bold text-[#F0E9DD] mt-0.5 group-hover:text-[#C8AA73] transition-colors">The Shadow Gnomon</h4>
          </div>
          <p className="text-xs text-[#AEB8BC] leading-relaxed font-sans">
            L-shaped wooden rulers aligned toward the rising sun divided the day into 12 dynamic hours whose duration
            expanded and contracted with seasonal axial tilt.
          </p>
        </button>

        <button
          onClick={() => setActiveEpochIdx(0)}
          className="bg-[#1C2730] p-5 rounded border text-left transition-all blueprint-frame space-y-3 hover:border-[#C8AA73] hover:bg-[#24323D] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73]"
          style={{
            borderColor: activeEpochIdx === 0 ? '#C8AA73' : 'rgba(200,170,115,0.22)',
          }}
        >
          <div className="w-9 h-9 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)] group-hover:border-[#C8AA73]">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase block">c. 1400 BCE • Karnak</span>
            <h4 className="font-cinzel text-sm font-bold text-[#F0E9DD] mt-0.5 group-hover:text-[#C8AA73] transition-colors">The Clepsydra (Water Clock)</h4>
          </div>
          <p className="text-xs text-[#AEB8BC] leading-relaxed font-sans">
            By regulating water discharge through micro-orifices in calibrated alabaster vessels, priests measured the passage
            of nocturnal hours independent of overcast skies.
          </p>
        </button>

        <button
          onClick={() => setActiveEpochIdx(0)}
          className="bg-[#1C2730] p-5 rounded border text-left transition-all blueprint-frame space-y-3 hover:border-[#C8AA73] hover:bg-[#24323D] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73]"
          style={{
            borderColor: activeEpochIdx === 0 ? '#C8AA73' : 'rgba(200,170,115,0.22)',
          }}
        >
          <div className="w-9 h-9 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)] group-hover:border-[#C8AA73]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase block">c. 150 BCE • Hellenic</span>
            <h4 className="font-cinzel text-sm font-bold text-[#F0E9DD] mt-0.5 group-hover:text-[#C8AA73] transition-colors">Antikythera Mechanism</h4>
          </div>
          <p className="text-xs text-[#AEB8BC] leading-relaxed font-sans">
            An extraordinary bronze assembly of 37 interlocking differential gears calculating Metonic lunar cycles,
            solar eclipses, and Olympian calendar dates.
          </p>
        </button>

        <button
          onClick={() => setActiveEpochIdx(0)}
          className="bg-[#1C2730] p-5 rounded border text-left transition-all blueprint-frame space-y-3 hover:border-[#C8AA73] hover:bg-[#24323D] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73]"
          style={{
            borderColor: activeEpochIdx === 0 ? '#C8AA73' : 'rgba(200,170,115,0.22)',
          }}
        >
          <div className="w-9 h-9 rounded bg-[rgba(200,170,115,0.12)] flex items-center justify-center text-[#C8AA73] border border-[rgba(200,170,115,0.25)] group-hover:border-[#C8AA73]">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase block">c. 2000 BCE • Mesopotamia</span>
            <h4 className="font-cinzel text-sm font-bold text-[#F0E9DD] mt-0.5 group-hover:text-[#C8AA73] transition-colors">Base-60 Sexagesimal Time</h4>
          </div>
          <p className="text-xs text-[#AEB8BC] leading-relaxed font-sans">
            Sumerian and Babylonian astronomers divided the celestial circle into 360 degrees and hours into 60 minutes,
            chosen for its 12 divisors permitting integer fractions.
          </p>
        </button>
      </section>
    </div>
  );
};

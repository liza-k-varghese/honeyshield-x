import React from 'react';
import { Orbit, Compass, Hourglass, Zap, Shield, Sparkles, Clock, BookOpen } from 'lucide-react';

export const PhilosophyChapter: React.FC = () => {
  return (
    <div className="space-y-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Chapter Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(200,170,115,0.12)] border border-[rgba(200,170,115,0.28)] rounded-full text-xs font-mono text-[#C8AA73]">
          <Hourglass className="w-3.5 h-3.5 text-[#C8AA73]" />
          <span>CHAPTER 04 • THE HUMAN SIGNIFICANCE OF TIME</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F0E9DD]">
          ENTROPY, RELATIVITY & <br />
          <span className="text-gold-gradient">THE HUMAN MEASURE</span>
        </h2>

        <p className="text-sm md:text-base text-[#AEB8BC] leading-relaxed max-w-2xl mx-auto font-sans">
          Time is not an external backdrop against which events occur. It is the fundamental asymmetry of the cosmos—the
          unfolding of entropy, the curvature of gravity, and the boundary within which human meaning is forged.
        </p>
      </div>

      {/* Narrative Section 1: The Thermodynamic Arrow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
        <div className="space-y-4">
          <span className="text-[10px] font-mono tracking-widest text-[#C8AA73] uppercase block">
            01 • The Thermodynamic Asymmetry
          </span>
          <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-[#F0E9DD]">
            The Arrow of Entropy
          </h3>
          <p className="text-xs sm:text-sm text-[#AEB8BC] leading-relaxed">
            In classical mechanics, the laws of physics are symmetric under time reversal. A planet orbiting a star
            moves according to the same equations whether run forward or backward. Only thermodynamics introduces an
            irreversible direction:
          </p>
          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.25)] font-mono text-xs space-y-1 blueprint-frame">
            <span className="text-[#C8AA73] block text-[10px] uppercase">Second Law of Thermodynamics</span>
            <div className="text-lg text-[#F0E9DD] font-bold">ΔS_universe ≥ 0</div>
            <p className="text-[11px] text-[#AEB8BC] mt-1">
              Entropy never decreases in an isolated system. The arrow of time is the inevitable dispersal of energy.
            </p>
          </div>
          <p className="text-xs sm:text-sm text-[#AEB8BC] leading-relaxed">
            A mechanical clock is a remarkable local defiance of disorder: using energy stored in a coiled mainspring,
            it channels chaotic potential into pristine, harmonic periodicity.
          </p>
        </div>

        {/* Blueprint Card 1 */}
        <div className="glass-panel p-6 sm:p-8 rounded-lg space-y-4 blueprint-frame">
          <div className="flex items-center gap-3 text-[#C8AA73]">
            <Hourglass className="w-6 h-6" />
            <span className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#F0E9DD]">
              Sir Arthur Eddington, 1927
            </span>
          </div>
          <blockquote className="text-xs sm:text-sm text-[#AEB8BC] italic border-l-2 border-[#C8AA73] pl-4 leading-relaxed font-sans">
            "The arrow of time is a property of entropy alone. If as we follow our mental journey we find more and more
            of the random element into things, the arrow is pointing toward the future; if the random element decreases,
            the arrow points toward the past."
          </blockquote>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[rgba(200,170,115,0.15)] text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#AEB8BC] uppercase block">Microscopic State</span>
              <span className="text-[#F0E9DD]">Reversible Trajectories</span>
            </div>
            <div>
              <span className="text-[10px] text-[#AEB8BC] uppercase block">Macroscopic State</span>
              <span className="text-[#C8AA73]">Unidirectional Flow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Section 2: Einsteinian Relativity & Gravitational Dilation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-8 border-t border-[rgba(200,170,115,0.15)]">
        {/* Blueprint Card 2 */}
        <div className="glass-panel p-6 sm:p-8 rounded-lg space-y-4 blueprint-frame order-2 md:order-1">
          <div className="flex items-center gap-3 text-[#C8AA73]">
            <Orbit className="w-6 h-6" />
            <span className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#F0E9DD]">
              Gravitational Time Dilation
            </span>
          </div>
          <div className="bg-[#0D1117] p-4 rounded border border-[rgba(200,170,115,0.25)] font-mono text-xs space-y-2">
            <span className="text-[#C8AA73] text-[10px] uppercase block">General Relativity Formulation</span>
            <div className="text-sm sm:text-base text-[#F0E9DD] font-bold">
              Δt' = Δt · √(1 - 2GM / rc²)
            </div>
            <p className="text-[11px] text-[#AEB8BC] leading-relaxed">
              Where G is Newton's gravitational constant, M is planetary mass, r is radial distance, and c is the speed of light.
            </p>
          </div>
          <p className="text-xs sm:text-sm text-[#AEB8BC] leading-relaxed">
            Clocks in deeper gravitational potentials run measurably slower. A tourbillon watch on Earth's surface
            experiences a fractionally slower second than a satellite in high orbit (~38 microseconds difference per day).
          </p>
        </div>

        <div className="space-y-4 order-1 md:order-2">
          <span className="text-[10px] font-mono tracking-widest text-[#C8AA73] uppercase block">
            02 • The Curvature of Duration
          </span>
          <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-[#F0E9DD]">
            Time as a Fluid Fabric
          </h3>
          <p className="text-xs sm:text-sm text-[#AEB8BC] leading-relaxed">
            Prior to Albert Einstein, Isaac Newton conceived time as an absolute, uniform river flowing independently
            through the universe. In 1915, general relativity overturned this premise: time is woven into spatial
            dimensions as four-dimensional spacetime.
          </p>
          <p className="text-xs sm:text-sm text-[#AEB8BC] leading-relaxed">
            Mass tells spacetime how to curve, and curved spacetime tells mass how to move. Every clock in the universe
            measures its own <span className="text-[#F0E9DD] font-semibold">proper time (τ)</span> along its worldline.
            There is no universal "now."
          </p>
        </div>
      </div>

      {/* Narrative Section 3: Subjective Perception vs. Mechanical Precision */}
      <div className="glass-panel p-6 sm:p-10 rounded-lg space-y-6 blueprint-frame border border-[rgba(200,170,115,0.3)]">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-[10px] font-mono tracking-widest text-[#C8AA73] uppercase">
            03 • The Phenomenological Tension
          </span>
          <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-[#F0E9DD]">
            Objective Seconds vs. Lived Duration
          </h3>
          <p className="text-xs sm:text-sm text-[#AEB8BC] leading-relaxed">
            French philosopher Henri Bergson distinguished between <span className="text-[#F0E9DD] font-semibold">le temps spatialisé</span> (time
            carved into spatial intervals by clock needles) and <span className="text-[#C8AA73] font-semibold">la durée réelle</span> (the indivisible,
            qualitative flow of human consciousness).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-xs font-mono">
          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase block">Seneca, 49 CE</span>
            <div className="text-[#F0E9DD] font-bold font-cinzel text-sm">De Brevitate Vitae</div>
            <p className="text-[11px] text-[#AEB8BC] leading-relaxed font-sans">
              "It is not that we have a short time to live, but that we waste a lot of it. Life is long enough, and a
              sufficiently generous estimate has been given to us for the highest achievements."
            </p>
          </div>

          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase block">Bergson, 1889</span>
            <div className="text-[#F0E9DD] font-bold font-cinzel text-sm">La Durée Réelle</div>
            <p className="text-[11px] text-[#AEB8BC] leading-relaxed font-sans">
              "Pure duration is the form which our conscious states assume when our ego lets itself live, when it refrains
              from separating its present state from its former states."
            </p>
          </div>

          <div className="bg-[#1C2730] p-4 rounded border border-[rgba(200,170,115,0.2)] space-y-2">
            <span className="text-[10px] text-[#C8AA73] uppercase block">Haute Horlogerie</span>
            <div className="text-[#F0E9DD] font-bold font-cinzel text-sm">The Kinetic Monument</div>
            <p className="text-[11px] text-[#AEB8BC] leading-relaxed font-sans">
              A mechanical tourbillon is an intimate human monument: a self-contained universe of balance springs, ruby bearings,
              and ticking escapement teeth that translates the infinite flow of time into tangible beauty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

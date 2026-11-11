import React, { useState } from 'react';
import { Cpu, Zap, Radio, Globe, Shield, Orbit, Activity, Sliders } from 'lucide-react';

export const ModernPrecisionSection: React.FC = () => {
  const [altitudeMeters, setAltitudeMeters] = useState(1000);
  const [velocityKmh, setVelocityKmh] = useState(900);

  // Relativistic calculation:
  // Gravitational time gain: gh / c^2 (approx 1.09e-16 per meter per second)
  // Velocity time loss: -0.5 * (v/c)^2
  const c = 299792458; // m/s
  const g = 9.80665; // m/s^2
  const vMps = velocityKmh / 3.6;

  const gravGainSecPerDay = (g * altitudeMeters / (c * c)) * 86400;
  const velLossSecPerDay = (0.5 * (vMps * vMps) / (c * c)) * 86400;
  const netDriftMicrosecondsPerDay = (gravGainSecPerDay - velLossSecPerDay) * 1e6;

  return (
    <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Chapter Header */}
      <div className="text-center space-y-4 pt-2 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(200,170,115,0.12)] border border-[rgba(200,170,115,0.28)] rounded-full text-xs font-mono text-[#C8AA73]">
          <Cpu className="w-3.5 h-3.5 text-[#C8AA73]" />
          <span>CHAPTER 03 • PIEZOELECTRICS, ATOMS & RELATIVISTIC SPACE</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-tight text-[#F0E9DD]">
          MODERN PRECISION & <br />
          <span className="text-gold-gradient">ATOMIC SYNCHRONIZATION</span>
        </h2>

        <p className="text-sm md:text-base text-[#AEB8BC] leading-relaxed font-sans">
          In the 20th and 21st centuries, the definition of time severed its link with celestial bodies.
          Today, the second is measured by the natural resonance of atoms, yielding precision so extreme
          that the warping of time by Earth's gravity must be accounted for continuously.
        </p>
      </div>

      {/* 3 Major Scientific Epochs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 sm:p-7 rounded-lg space-y-3.5 blueprint-frame">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase">1969 CE • Solid State</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-[rgba(200,170,115,0.15)] text-[#C8AA73] rounded">
              32,768 Hz
            </span>
          </div>
          <h3 className="font-cinzel text-lg font-bold text-[#F0E9DD]">
            Quartz Piezoelectricity
          </h3>
          <p className="text-xs text-[#AEB8BC] leading-relaxed">
            A miniature tuning fork carved from synthetic quartz crystal vibrates 32,768 times per second when energized.
            Integrated binary flip-flops divide this frequency fifteen times down to exactly 1.0 Hz.
          </p>
          <div className="pt-2 border-t border-[rgba(200,170,115,0.15)] text-[11px] font-mono text-[#AEB8BC]">
            Accuracy: <span className="text-[#F0E9DD]">±15 seconds / month</span>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-7 rounded-lg space-y-3.5 blueprint-frame">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase">1967 CE • The SI Second</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-[rgba(200,170,115,0.15)] text-[#C8AA73] rounded">
              9.192 GHz
            </span>
          </div>
          <h3 className="font-cinzel text-lg font-bold text-[#F0E9DD]">
            Cesium-133 Hyperfine Transition
          </h3>
          <p className="text-xs text-[#AEB8BC] leading-relaxed">
            The official SI definition of the second: exactly 9,192,631,770 periods of radiation corresponding to the
            transition between two hyperfine ground levels of the unperturbed cesium-133 atom.
          </p>
          <div className="pt-2 border-t border-[rgba(200,170,115,0.15)] text-[11px] font-mono text-[#AEB8BC]">
            Accuracy: <span className="text-[#F0E9DD]">1 second in 30 million years</span>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-7 rounded-lg space-y-3.5 blueprint-frame">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase">2024+ CE • Quantum Frontier</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-[rgba(200,170,115,0.15)] text-[#C8AA73] rounded">
              429 THz
            </span>
          </div>
          <h3 className="font-cinzel text-lg font-bold text-[#F0E9DD]">
            Strontium Optical Lattice
          </h3>
          <p className="text-xs text-[#AEB8BC] leading-relaxed">
            Ten thousand neutral strontium atoms suspended in laser standing waves. Operating at optical frequencies
            100,000 times higher than microwaves, detecting gravitational time shifts across single millimeters.
          </p>
          <div className="pt-2 border-t border-[rgba(200,170,115,0.15)] text-[11px] font-mono text-[#AEB8BC]">
            Accuracy: <span className="text-[#C8AA73]">1 second in 30 billion years</span>
          </div>
        </div>
      </div>

      {/* Relativistic Time Dilation Interactive Exploration Panel */}
      <div className="bg-[#1C2730] p-6 sm:p-8 rounded-lg border border-[rgba(200,170,115,0.3)] blueprint-frame space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(200,170,115,0.2)] pb-4">
          <div>
            <span className="text-[10px] font-mono text-[#C8AA73] uppercase block">
              Einstein's General & Special Relativity Metrology
            </span>
            <h3 className="font-cinzel text-xl font-bold text-[#F0E9DD]">
              Relativistic Time Dilation Simulator
            </h3>
            <p className="text-xs text-[#AEB8BC] font-mono mt-0.5">
              Calculate how speed and Earth's gravity alter the rate at which your clock ticks
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-[#0D1117] px-3.5 py-2 rounded border border-[rgba(200,170,115,0.25)]">
            <Orbit className="w-4 h-4 text-[#C8AA73]" />
            <span className="text-[#AEB8BC]">GPS Satellite Net Drift:</span>
            <span className="text-[#C8AA73] font-bold">+38.6 μs / day</span>
          </div>
        </div>

        {/* Sliders and Equation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            {/* Quick Scenario Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-[#AEB8BC] uppercase block w-full sm:w-auto">
                Scenario Presets:
              </span>
              {[
                { label: 'Sea Level At Rest', alt: 0, vel: 0 },
                { label: 'High-Speed Rail', alt: 80, vel: 320 },
                { label: 'Commercial Jet', alt: 11000, vel: 900 },
                { label: 'Mt. Everest Summit', alt: 8848, vel: 0 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setAltitudeMeters(p.alt);
                    setVelocityKmh(p.vel);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                    altitudeMeters === p.alt && velocityKmh === p.vel
                      ? 'bg-[#C8AA73] text-[#0D1117] font-bold'
                      : 'bg-[#0D1117] text-[#AEB8BC] hover:text-[#F0E9DD] border border-[rgba(200,170,115,0.2)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Altitude Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#AEB8BC]">Altitude Above Sea Level:</span>
                <span className="text-[#C8AA73] font-bold">{altitudeMeters.toLocaleString()} m</span>
              </div>
              <input
                type="range"
                min="0"
                max="12000"
                step="100"
                value={altitudeMeters}
                onChange={(e) => {
                  const raw = parseFloat(e.target.value);
                  setAltitudeMeters(Number.isFinite(raw) ? Math.max(0, Math.min(12000, raw)) : 10000);
                }}
                aria-label="Adjust Altitude Above Sea Level"
                className="w-full accent-[#C8AA73] cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[#AEB8BC] block">
                Higher gravity altitude causes clocks to run fractionally faster (+gh/c²)
              </span>
            </div>

            {/* Velocity Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#AEB8BC]">Cruising Velocity:</span>
                <span className="text-[#C8AA73] font-bold">{velocityKmh.toLocaleString()} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="2500"
                step="25"
                value={velocityKmh}
                onChange={(e) => {
                  const raw = parseFloat(e.target.value);
                  setVelocityKmh(Number.isFinite(raw) ? Math.max(0, Math.min(2500, raw)) : 900);
                }}
                aria-label="Adjust Cruising Velocity"
                className="w-full accent-[#C8AA73] cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[#AEB8BC] block">
                Higher relative velocity causes clocks to run fractionally slower (-½v²/c²)
              </span>
            </div>
          </div>

          {/* Computed Readout Display */}
          <div className="bg-[#0D1117] p-5 rounded border border-[rgba(200,170,115,0.25)] font-mono text-xs space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC]">Gravitational Time Gain</span>
              <span className="text-emerald-400 font-semibold">
                +{(gravGainSecPerDay * 1e6).toFixed(4)} μs / day
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[rgba(174,184,188,0.1)]">
              <span className="text-[#AEB8BC]">Velocity Time Dilation</span>
              <span className="text-rose-400 font-semibold">
                -{(velLossSecPerDay * 1e6).toFixed(4)} μs / day
              </span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 border-t border-[rgba(200,170,115,0.2)]">
              <span className="text-[#F0E9DD] font-bold uppercase tracking-wider">Net Relativistic Drift</span>
              <span className="text-sm font-bold text-[#C8AA73]">
                {netDriftMicrosecondsPerDay >= 0 ? '+' : ''}
                {netDriftMicrosecondsPerDay.toFixed(4)} μs / day
              </span>
            </div>
            <p className="text-[10px] text-[#AEB8BC] leading-relaxed pt-1">
              Without compensating for relativistic time dilation, modern satellite GPS would accumulate over 10 kilometers
              of navigational positional error every 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

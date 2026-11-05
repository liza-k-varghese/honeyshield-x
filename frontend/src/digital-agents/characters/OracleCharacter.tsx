import React from 'react';
import { AgentAnimationState, PacketColor } from '../types';

interface OracleCharacterProps {
  state?: AgentAnimationState;
  carryingPacket?: boolean;
  packetColor?: PacketColor;
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  onClick?: () => void;
}

export const OracleCharacter: React.FC<OracleCharacterProps> = ({
  state = 'idle',
  carryingPacket = false,
  packetColor = 'purple',
  size = 140,
  className = '',
  reducedMotion = false,
  onClick,
}) => {
  const isAnalyzing = state === 'analyzing' || state === 'observing' || state === 'processing';
  const isTravelling = state === 'travelling' || state === 'pickup' || state === 'delivering';
  const isWarning = state === 'warning';
  const isFailed = state === 'failed';
  const isDisconnected = state === 'disconnected' || state === 'reconnecting';

  // Packet hex color mapper
  const packetHex =
    packetColor === 'blue'
      ? '#3B82F6'
      : packetColor === 'cyan'
      ? '#00E5FF'
      : packetColor === 'red'
      ? '#EF4444'
      : packetColor === 'amber'
      ? '#F59E0B'
      : packetColor === 'green'
      ? '#10B981'
      : '#A855F7';

  const opticColor = isFailed ? '#EF4444' : isWarning ? '#F59E0B' : isDisconnected ? '#64748B' : '#A855F7';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size * 1.25 }}
      title={`ORACLE: ${state.toUpperCase()}`}
    >
      <svg
        viewBox="0 0 160 200"
        width={size}
        height={size * 1.25}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full filter drop-shadow-[0_4px_16px_rgba(168,85,247,0.35)] ${
          !reducedMotion && isTravelling ? 'animate-bounce' : ''
        }`}
      >
        <defs>
          <linearGradient id="oracleWhiteArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#EDE9FE" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
          <linearGradient id="oracleDarkArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4C1D95" />
            <stop offset="60%" stopColor="#2E1065" />
            <stop offset="100%" stopColor="#0F051D" />
          </linearGradient>
          <linearGradient id="oraclePurpleGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#7E22CE" />
          </linearGradient>
          <filter id="oracleGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grounding Shadow */}
        <ellipse cx="80" cy="192" rx="38" ry="6" fill="#020617" fillOpacity="0.6" />

        {/* Floating Holographic Ring / Halo Analysis Module */}
        <g id="oracle-holo-halo" filter="url(#oracleGlow)">
          <ellipse
            cx="80"
            cy="24"
            rx="32"
            ry="9"
            fill="none"
            stroke={opticColor}
            strokeWidth="2"
            strokeDasharray="6 3"
            className={!reducedMotion && isAnalyzing ? 'animate-spin origin-center' : ''}
            opacity="0.8"
          />
          {/* Floating Data Glyph in Halo */}
          <polygon
            points="80,18 85,24 80,30 75,24"
            fill="#FFFFFF"
            className={!reducedMotion && isAnalyzing ? 'animate-pulse' : ''}
          />
        </g>

        {/* Angular Geometric Shoulders */}
        <polygon points="32,84 54,78 50,110 26,104" fill="url(#oracleDarkArmor)" stroke="#6B21A8" strokeWidth="1.5" />
        <polygon points="128,84 106,78 110,110 134,104" fill="url(#oracleDarkArmor)" stroke="#6B21A8" strokeWidth="1.5" />

        {/* Slender Taller Torso */}
        <path
          d="M 50 82 L 110 82 L 98 142 L 62 142 Z"
          fill="url(#oracleWhiteArmor)"
          stroke="#A78BFA"
          strokeWidth="2"
        />

        {/* Dark Armor Central Inset Plate */}
        <polygon
          points="80,88 100,98 94,136 66,136 60,98"
          fill="url(#oracleDarkArmor)"
          stroke="#4C1D95"
          strokeWidth="1.5"
        />

        {/* Distinctive Intelligence Neural Emblem */}
        <g id="oracle-chest-emblem" filter="url(#oracleGlow)">
          <polygon points="80,98 92,112 80,126 68,112" fill="#1E1B4B" stroke={opticColor} strokeWidth="1.5" />
          <circle cx="80" cy="112" r="3.5" fill="#FFFFFF" />
          <line x1="80" y1="104" x2="80" y2="120" stroke={opticColor} strokeWidth="1" />
          <line x1="72" y1="112" x2="88" y2="112" stroke={opticColor} strokeWidth="1" />
        </g>

        {/* Taller Sleek Head Unit */}
        <path
          d="M 52 38 Q 80 28 108 38 L 104 78 Q 80 84 56 78 Z"
          fill="url(#oracleWhiteArmor)"
          stroke="#C4B5FD"
          strokeWidth="2"
        />

        {/* Glossy Obsidian Visor */}
        <path
          d="M 58 44 Q 80 38 102 44 L 98 72 Q 80 76 62 72 Z"
          fill="url(#oracleDarkArmor)"
          stroke="#0F051D"
          strokeWidth="1.5"
        />

        {/* Analytical Violet Eye Aperture */}
        <g id="oracle-eyes" filter="url(#oracleGlow)">
          {/* Central Hexagonal Intelligence Core */}
          <polygon
            points="80,48 88,54 88,62 80,68 72,62 72,54"
            fill="#1E1B4B"
            stroke={opticColor}
            strokeWidth="2"
          />
          <circle
            cx="80"
            cy="58"
            r={isAnalyzing ? 4.5 : 3.5}
            fill={opticColor}
            className={!reducedMotion && isAnalyzing ? 'animate-ping' : ''}
          />
          <circle cx="80" cy="58" r="1.5" fill="#FFFFFF" />

          {/* Lateral Auxiliary Sensor Slits */}
          <line x1="64" y1="58" x2="68" y2="58" stroke={opticColor} strokeWidth="2" strokeLinecap="round" />
          <line x1="92" y1="58" x2="96" y2="58" stroke={opticColor} strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Slender Articulated Legs */}
        <g id="oracle-left-leg">
          <rect x="64" y="142" width="10" height="32" rx="5" fill="url(#oracleDarkArmor)" stroke="#4C1D95" strokeWidth="1" />
          <polygon points="62,174 76,174 72,184 58,184" fill="url(#oracleWhiteArmor)" stroke="#A78BFA" strokeWidth="1" />
        </g>
        <g id="oracle-right-leg">
          <rect x="86" y="142" width="10" height="32" rx="5" fill="url(#oracleDarkArmor)" stroke="#4C1D95" strokeWidth="1" />
          <polygon points="84,174 98,174 102,184 88,184" fill="url(#oracleWhiteArmor)" stroke="#A78BFA" strokeWidth="1" />
        </g>

        {/* Arms */}
        {carryingPacket ? (
          /* Arms Suspended Carrying Hologram Packet */
          <g id="oracle-carrying-arms">
            <path d="M 44 94 Q 60 118 70 124" stroke="#6B21A8" strokeWidth="5" strokeLinecap="round" />
            <path d="M 116 94 Q 100 118 90 124" stroke="#6B21A8" strokeWidth="5" strokeLinecap="round" />
            {/* The Carried Packet */}
            <g id="oracle-held-packet" filter="url(#oracleGlow)">
              <polygon points="80,108 94,118 80,132 66,118" fill={packetHex} stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="80" cy="120" r="4" fill="#FFFFFF" />
            </g>
          </g>
        ) : (
          /* Graceful Analytical Stance */
          <g id="oracle-free-arms">
            <path
              d={isAnalyzing ? 'M 44 94 Q 34 116 52 126' : 'M 44 94 Q 38 118 42 138'}
              stroke="#6B21A8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={isAnalyzing ? 'M 116 94 Q 126 116 108 126' : 'M 116 94 Q 122 118 118 138'}
              stroke="#6B21A8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx={isAnalyzing ? 52 : 42} cy={isAnalyzing ? 126 : 138} r="4" fill="url(#oracleWhiteArmor)" />
            <circle cx={isAnalyzing ? 108 : 118} cy={isAnalyzing ? 126 : 138} r="4" fill="url(#oracleWhiteArmor)" />
          </g>
        )}

        {/* Holographic Projection Wave when Analyzing */}
        {!reducedMotion && isAnalyzing && (
          <path
            d="M 60 30 Q 80 10 100 30"
            stroke={opticColor}
            strokeWidth="1.5"
            strokeDasharray="4 2"
            fill="none"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};


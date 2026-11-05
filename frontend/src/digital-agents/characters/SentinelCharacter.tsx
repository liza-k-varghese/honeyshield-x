import React from 'react';
import { AgentAnimationState, PacketColor } from '../types';

interface SentinelCharacterProps {
  state?: AgentAnimationState;
  carryingPacket?: boolean;
  packetColor?: PacketColor;
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  onClick?: () => void;
}

export const SentinelCharacter: React.FC<SentinelCharacterProps> = ({
  state = 'idle',
  carryingPacket = false,
  packetColor = 'red',
  size = 140,
  className = '',
  reducedMotion = false,
  onClick,
}) => {
  const isAlerting = state === 'alerting' || state === 'warning' || state === 'failed';
  const isTravelling = state === 'travelling' || state === 'pickup' || state === 'delivering';
  const isFailed = state === 'failed';
  const isDisconnected = state === 'disconnected' || state === 'reconnecting';

  // Packet hex color mapper
  const packetHex =
    packetColor === 'blue'
      ? '#3B82F6'
      : packetColor === 'cyan'
      ? '#00E5FF'
      : packetColor === 'purple'
      ? '#A855F7'
      : packetColor === 'amber'
      ? '#F59E0B'
      : packetColor === 'green'
      ? '#10B981'
      : '#EF4444';

  const visorColor = isFailed ? '#7F1D1D' : isDisconnected ? '#64748B' : '#EF4444';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size * 1.15 }}
      title={`SENTINEL: ${state.toUpperCase()}`}
    >
      <svg
        viewBox="0 0 160 184"
        width={size}
        height={size * 1.15}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full filter drop-shadow-[0_4px_16px_rgba(239,68,68,0.35)] ${
          !reducedMotion && isTravelling ? 'animate-bounce' : ''
        }`}
      >
        <defs>
          <linearGradient id="sentinelWhiteArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
          <linearGradient id="sentinelGraphiteArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="60%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="sentinelRedTrim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <filter id="sentinelGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grounding Shadow */}
        <ellipse cx="80" cy="176" rx="48" ry="8" fill="#020617" fillOpacity="0.7" />

        {/* Heavy Graphite Shoulder Armor Plates */}
        <g id="sentinel-left-shoulder">
          <polygon
            points="24,76 50,72 46,110 20,104"
            fill="url(#sentinelGraphiteArmor)"
            stroke="#DC2626"
            strokeWidth="1.5"
          />
          <line x1="24" y1="88" x2="48" y2="84" stroke="#EF4444" strokeWidth="2" />
        </g>
        <g id="sentinel-right-shoulder">
          <polygon
            points="136,76 110,72 114,110 140,104"
            fill="url(#sentinelGraphiteArmor)"
            stroke="#DC2626"
            strokeWidth="1.5"
          />
          <line x1="136" y1="88" x2="112" y2="84" stroke="#EF4444" strokeWidth="2" />
        </g>

        {/* Reinforced Broad Armored Torso */}
        <polygon
          points="46,80 114,80 106,140 54,140"
          fill="url(#sentinelWhiteArmor)"
          stroke="#94A3B8"
          strokeWidth="2"
        />

        {/* Heavy Chest Inset Armor */}
        <polygon
          points="56,86 104,86 96,132 64,132"
          fill="url(#sentinelGraphiteArmor)"
          stroke="#1E293B"
          strokeWidth="1.5"
        />

        {/* Warning Symbol on Chest (Defensive Shield & Hazard Emblem) */}
        <g id="sentinel-chest-emblem" filter="url(#sentinelGlow)">
          <polygon points="80,94 94,102 94,120 80,128 66,120 66,102" fill="#0F172A" stroke={visorColor} strokeWidth="1.5" />
          {/* Internal Hazard Triangle */}
          <polygon
            points="80,99 89,117 71,117"
            fill={visorColor}
            className={!reducedMotion && isAlerting ? 'animate-pulse' : ''}
          />
          <circle cx="80" cy="113" r="1.5" fill="#FFFFFF" />
          <line x1="80" y1="104" x2="80" y2="109" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Fortified Head Unit */}
        <polygon
          points="46,36 114,36 108,78 52,78"
          fill="url(#sentinelWhiteArmor)"
          stroke="#94A3B8"
          strokeWidth="2.5"
        />

        {/* Heavy Visor Aperture Frame */}
        <polygon
          points="54,42 106,42 102,68 58,68"
          fill="#0F172A"
          stroke="#1E293B"
          strokeWidth="1.5"
        />

        {/* Red Optical Battle Visor Display */}
        <g id="sentinel-optic" filter="url(#sentinelGlow)">
          <rect
            x="58"
            y="48"
            width="44"
            height="14"
            rx="4"
            fill={visorColor}
            opacity={isDisconnected ? 0.3 : 0.95}
          />
          {/* Intense Optical Core Beam */}
          <line
            x1="62"
            y1="55"
            x2="98"
            y2="55"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            className={!reducedMotion && isAlerting ? 'animate-ping' : ''}
          />
        </g>

        {/* Heavy Sturdy Legs */}
        <g id="sentinel-left-leg">
          <rect x="58" y="140" width="14" height="24" rx="4" fill="url(#sentinelGraphiteArmor)" stroke="#475569" strokeWidth="1" />
          <polygon points="54,164 74,164 72,174 52,174" fill="url(#sentinelWhiteArmor)" stroke="#DC2626" strokeWidth="1.5" />
        </g>
        <g id="sentinel-right-leg">
          <rect x="88" y="140" width="14" height="24" rx="4" fill="url(#sentinelGraphiteArmor)" stroke="#475569" strokeWidth="1" />
          <polygon points="86,164 106,164 108,174 88,174" fill="url(#sentinelWhiteArmor)" stroke="#DC2626" strokeWidth="1.5" />
        </g>

        {/* Fortified Arms */}
        {carryingPacket ? (
          /* Arms Guarding High-Priority Alert Packet */
          <g id="sentinel-carrying-arms">
            <path d="M 42 98 Q 58 118 70 120" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
            <path d="M 118 98 Q 102 118 90 120" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
            {/* The Carried Packet */}
            <g id="sentinel-held-packet" filter="url(#sentinelGlow)">
              <rect x="66" y="106" width="28" height="26" rx="6" fill={packetHex} stroke="#FFFFFF" strokeWidth="2" />
              <polygon points="80,110 88,124 72,124" fill="#FFFFFF" fillOpacity="0.9" />
            </g>
          </g>
        ) : (
          /* Sturdy Guard Stance */
          <g id="sentinel-free-arms">
            <path
              d={isAlerting ? 'M 42 96 Q 28 114 44 128' : 'M 42 96 Q 34 116 38 134'}
              stroke="#475569"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d={isAlerting ? 'M 118 96 Q 132 114 116 128' : 'M 118 96 Q 126 116 122 134'}
              stroke="#475569"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx={isAlerting ? 44 : 38} cy={isAlerting ? 128 : 134} r="5.5" fill="url(#sentinelWhiteArmor)" stroke="#DC2626" />
            <circle cx={isAlerting ? 116 : 122} cy={isAlerting ? 128 : 134} r="5.5" fill="url(#sentinelWhiteArmor)" stroke="#DC2626" />
          </g>
        )}

        {/* Warning Pulse Rings when Alerting */}
        {!reducedMotion && isAlerting && (
          <ellipse
            cx="80"
            cy="100"
            rx="56"
            ry="40"
            fill="none"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-ping pointer-events-none opacity-40"
          />
        )}
      </svg>
    </div>
  );
};


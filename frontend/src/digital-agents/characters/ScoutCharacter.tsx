import React from 'react';
import { AgentAnimationState, PacketColor } from '../types';

interface ScoutCharacterProps {
  state?: AgentAnimationState;
  carryingPacket?: boolean;
  packetColor?: PacketColor;
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  onClick?: () => void;
}

export const ScoutCharacter: React.FC<ScoutCharacterProps> = ({
  state = 'idle',
  carryingPacket = false,
  packetColor = 'blue',
  size = 140,
  className = '',
  reducedMotion = false,
  onClick,
}) => {
  const isScanning = state === 'scanning' || state === 'observing';
  const isTravelling = state === 'travelling' || state === 'pickup' || state === 'delivering';
  const isWarning = state === 'warning';
  const isFailed = state === 'failed';
  const isDisconnected = state === 'disconnected' || state === 'reconnecting';

  // Packet hex color mapper
  const packetHex =
    packetColor === 'cyan'
      ? '#00E5FF'
      : packetColor === 'purple'
      ? '#A855F7'
      : packetColor === 'red'
      ? '#EF4444'
      : packetColor === 'amber'
      ? '#F59E0B'
      : packetColor === 'green'
      ? '#10B981'
      : '#3B82F6';

  const visorColor = isFailed ? '#EF4444' : isWarning ? '#F59E0B' : isDisconnected ? '#64748B' : '#3B82F6';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size * 1.15 }}
      title={`SCOUT: ${state.toUpperCase()}`}
    >
      <svg
        viewBox="0 0 160 184"
        width={size}
        height={size * 1.15}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full filter drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)] ${
          !reducedMotion && isTravelling ? 'animate-bounce' : ''
        }`}
      >
        <defs>
          <linearGradient id="scoutWhiteArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
          <linearGradient id="scoutBlueArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="60%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="scoutMetallicDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <filter id="scoutGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Shadow Grounding */}
        <ellipse cx="80" cy="176" rx="42" ry="7" fill="#030712" fillOpacity="0.6" />

        {/* Head-Mounted Sensor Antenna */}
        <g className={!reducedMotion && isScanning ? 'animate-pulse' : ''}>
          <line x1="80" y1="36" x2="80" y2="14" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="18" x2="94" y2="10" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <circle cx="95" cy="9" r="4.5" fill="#3B82F6" filter="url(#scoutGlow)" />
          <circle cx="95" cy="9" r="2" fill="#FFFFFF" />
        </g>

        {/* Circular Scanning Shoulder Modules */}
        <g id="scout-left-shoulder">
          <circle cx="42" cy="96" r="13" fill="url(#scoutBlueArmor)" stroke="#1D4ED8" strokeWidth="2" />
          <circle cx="42" cy="96" r="8" fill="#0F172A" />
          <circle
            cx="42"
            cy="96"
            r="4"
            fill={visorColor}
            className={!reducedMotion && isScanning ? 'animate-ping' : ''}
          />
        </g>
        <g id="scout-right-shoulder">
          <circle cx="118" cy="96" r="13" fill="url(#scoutBlueArmor)" stroke="#1D4ED8" strokeWidth="2" />
          <circle cx="118" cy="96" r="8" fill="#0F172A" />
          <circle
            cx="118"
            cy="96"
            r="4"
            fill={visorColor}
            className={!reducedMotion && isScanning ? 'animate-ping' : ''}
          />
        </g>

        {/* Compact Torso Body */}
        <path
          d="M 54 84 L 106 84 L 100 134 L 60 134 Z"
          fill="url(#scoutWhiteArmor)"
          stroke="#94A3B8"
          strokeWidth="2"
        />
        <path
          d="M 64 88 L 96 88 L 92 124 L 68 124 Z"
          fill="url(#scoutBlueArmor)"
          stroke="#1E40AF"
          strokeWidth="1.5"
        />

        {/* Sensor Chest Emblem */}
        <g id="scout-chest-emblem" filter="url(#scoutGlow)">
          <polygon points="80,95 89,106 80,117 71,106" fill="#0F172A" stroke={visorColor} strokeWidth="1.5" />
          <circle cx="80" cy="106" r="3" fill="#FFFFFF" />
        </g>

        {/* Scout Head */}
        <rect
          x="50"
          y="34"
          width="60"
          height="46"
          rx="18"
          fill="url(#scoutWhiteArmor)"
          stroke="#94A3B8"
          strokeWidth="2"
        />
        {/* Glossy Black Visor Housing */}
        <rect
          x="55"
          y="42"
          width="50"
          height="28"
          rx="12"
          fill="url(#scoutMetallicDark)"
          stroke="#1E293B"
          strokeWidth="1.5"
        />

        {/* High-Tech Optical Visor */}
        <rect
          x="59"
          y="48"
          width="42"
          height="16"
          rx="7"
          fill={visorColor}
          filter="url(#scoutGlow)"
          opacity={isDisconnected ? 0.4 : 0.95}
        />
        {/* Optical Sensor Grid / Glint */}
        <line x1="64" y1="56" x2="96" y2="56" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 2" />
        <ellipse cx="68" cy="53" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.8" />

        {/* Agile Legs */}
        <g id="scout-left-leg">
          <rect x="62" y="134" width="10" height="24" rx="4" fill="url(#scoutMetallicDark)" stroke="#64748B" strokeWidth="1" />
          <ellipse cx="67" cy="164" rx="8" ry="4" fill="url(#scoutBlueArmor)" stroke="#1D4ED8" strokeWidth="1.5" />
        </g>
        <g id="scout-right-leg">
          <rect x="88" y="134" width="10" height="24" rx="4" fill="url(#scoutMetallicDark)" stroke="#64748B" strokeWidth="1" />
          <ellipse cx="93" cy="164" rx="8" ry="4" fill="url(#scoutBlueArmor)" stroke="#1D4ED8" strokeWidth="1.5" />
        </g>

        {/* Articulated Arms */}
        {carryingPacket ? (
          /* Hands Forward Holding Packet */
          <g id="scout-carrying-arms">
            <path d="M 46 102 Q 60 120 72 122" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
            <path d="M 114 102 Q 100 120 88 122" stroke="#64748B" strokeWidth="5" strokeLinecap="round" />
            {/* The Carried Packet */}
            <g id="scout-held-packet" filter="url(#scoutGlow)">
              <rect x="68" y="110" width="24" height="22" rx="5" fill={packetHex} stroke="#FFFFFF" strokeWidth="1.5" />
              <polygon points="80,114 87,121 80,128 73,121" fill="#FFFFFF" fillOpacity="0.8" />
            </g>
          </g>
        ) : (
          /* Free Moving Arms */
          <g id="scout-free-arms">
            <path
              d={isScanning ? 'M 46 102 Q 32 120 48 132' : 'M 46 102 Q 38 122 42 136'}
              stroke="#64748B"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={isScanning ? 'M 114 102 Q 128 120 112 132' : 'M 114 102 Q 122 122 118 136'}
              stroke="#64748B"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx={isScanning ? 48 : 42} cy={isScanning ? 132 : 136} r="4.5" fill="url(#scoutBlueArmor)" />
            <circle cx={isScanning ? 112 : 118} cy={isScanning ? 132 : 136} r="4.5" fill="url(#scoutBlueArmor)" />
          </g>
        )}

        {/* Scanning Light Cone Effect */}
        {!reducedMotion && isScanning && (
          <polygon
            points="58,64 12,168 148,168 102,64"
            fill="url(#scoutBlueArmor)"
            opacity="0.15"
            className="animate-pulse pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
};

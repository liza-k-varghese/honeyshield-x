import React from 'react';
import { AgentAnimationState, PacketColor } from '../types';

interface NexusCharacterProps {
  state?: AgentAnimationState;
  carryingPacket?: boolean;
  packetColor?: PacketColor;
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  onClick?: () => void;
}

export const NexusCharacter: React.FC<NexusCharacterProps> = ({
  state = 'idle',
  carryingPacket = false,
  packetColor = 'cyan',
  size = 140,
  className = '',
  reducedMotion = false,
  onClick,
}) => {
  const isProcessing = state === 'processing' || state === 'waiting';
  const isTravelling = state === 'travelling' || state === 'pickup' || state === 'delivering';
  const isSuccess = state === 'success';
  const isWarning = state === 'warning';
  const isFailed = state === 'failed';
  const isDisconnected = state === 'disconnected' || state === 'reconnecting';

  // Packet hex color mapper
  const packetHex =
    packetColor === 'blue'
      ? '#3B82F6'
      : packetColor === 'purple'
      ? '#A855F7'
      : packetColor === 'red'
      ? '#EF4444'
      : packetColor === 'amber'
      ? '#F59E0B'
      : packetColor === 'green'
      ? '#10B981'
      : '#00E5FF';

  const eyeColor = isFailed ? '#EF4444' : isWarning ? '#F59E0B' : isSuccess ? '#10B981' : isDisconnected ? '#64748B' : '#00E5FF';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size * 1.15 }}
      title={`NEXUS: ${state.toUpperCase()}`}
    >
      <svg
        viewBox="0 0 160 184"
        width={size}
        height={size * 1.15}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full filter drop-shadow-[0_4px_14px_rgba(0,229,255,0.35)] ${
          !reducedMotion && isTravelling ? 'animate-bounce' : ''
        }`}
      >
        <defs>
          <linearGradient id="nexusWhiteArmor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
          <linearGradient id="nexusSilverTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
          <linearGradient id="nexusGlossyFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="40%" stopColor="#0B132B" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <filter id="nexusGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grounding Shadow */}
        <ellipse cx="80" cy="176" rx="46" ry="8" fill="#020617" fillOpacity="0.65" />

        {/* Circular Illuminated Side Modules (Ears) */}
        <g id="nexus-left-ear" filter="url(#nexusGlow)">
          <circle cx="36" cy="56" r="11" fill="url(#nexusSilverTrim)" stroke="#475569" strokeWidth="1.5" />
          <circle cx="36" cy="56" r="7" fill="#020617" />
          <circle
            cx="36"
            cy="56"
            r="4"
            fill={eyeColor}
            className={!reducedMotion && isProcessing ? 'animate-pulse' : ''}
          />
        </g>
        <g id="nexus-right-ear" filter="url(#nexusGlow)">
          <circle cx="124" cy="56" r="11" fill="url(#nexusSilverTrim)" stroke="#475569" strokeWidth="1.5" />
          <circle cx="124" cy="56" r="7" fill="#020617" />
          <circle
            cx="124"
            cy="56"
            r="4"
            fill={eyeColor}
            className={!reducedMotion && isProcessing ? 'animate-pulse' : ''}
          />
        </g>

        {/* Rounded Compact Body / Torso */}
        <rect
          x="52"
          y="82"
          width="56"
          height="54"
          rx="18"
          fill="url(#nexusWhiteArmor)"
          stroke="#CBD5E1"
          strokeWidth="2"
        />

        {/* Chest Panel Accent Inset */}
        <rect
          x="60"
          y="90"
          width="40"
          height="38"
          rx="12"
          fill="#0F172A"
          stroke="#1E293B"
          strokeWidth="1.5"
        />

        {/* Cyan Chest Data Symbol (Interconnected Nexus Network) */}
        <g id="nexus-chest-symbol" filter="url(#nexusGlow)">
          <circle cx="80" cy="102" r="3.5" fill={eyeColor} />
          <circle cx="71" cy="116" r="2.5" fill={eyeColor} />
          <circle cx="89" cy="116" r="2.5" fill={eyeColor} />
          <line x1="80" y1="102" x2="71" y2="116" stroke={eyeColor} strokeWidth="1.5" />
          <line x1="80" y1="102" x2="89" y2="116" stroke={eyeColor} strokeWidth="1.5" />
          <line x1="71" y1="116" x2="89" y2="116" stroke={eyeColor} strokeWidth="1" strokeDasharray="2 1" />
        </g>

        {/* Head Unit: Friendly Rounded Silhouette */}
        <rect
          x="44"
          y="28"
          width="72"
          height="56"
          rx="24"
          fill="url(#nexusWhiteArmor)"
          stroke="#CBD5E1"
          strokeWidth="2.5"
        />

        {/* Glossy Curved Black Face Display */}
        <rect
          x="50"
          y="34"
          width="60"
          height="44"
          rx="18"
          fill="url(#nexusGlossyFace)"
          stroke="#0F172A"
          strokeWidth="1.5"
        />

        {/* Glass Face Reflection Glint */}
        <path
          d="M 56 42 Q 80 37 104 42 Q 78 40 56 42 Z"
          fill="#FFFFFF"
          opacity="0.35"
        />

        {/* Two Bright Expressive Cyan Eyes */}
        <g id="nexus-eyes" filter="url(#nexusGlow)">
          {isSuccess ? (
            /* Happy Arc Eyes */
            <>
              <path d="M 64 56 Q 71 48 78 56" stroke={eyeColor} strokeWidth="4" strokeLinecap="round" />
              <path d="M 82 56 Q 89 48 96 56" stroke={eyeColor} strokeWidth="4" strokeLinecap="round" />
            </>
          ) : isFailed ? (
            /* Warning / Error X Eyes */
            <>
              <line x1="66" y1="50" x2="76" y2="60" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
              <line x1="76" y1="50" x2="66" y2="60" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
              <line x1="84" y1="50" x2="94" y2="60" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
              <line x1="94" y1="50" x2="84" y2="60" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            /* Normal Glowing Cyan Circular Eyes */
            <>
              <ellipse
                cx="71"
                cy="56"
                rx={isProcessing ? 6 : 5.5}
                ry={isProcessing ? 7 : 5.5}
                fill={eyeColor}
                className={!reducedMotion && isProcessing ? 'animate-pulse' : ''}
              />
              <circle cx="73" cy="54" r="2" fill="#FFFFFF" />

              <ellipse
                cx="89"
                cy="56"
                rx={isProcessing ? 6 : 5.5}
                ry={isProcessing ? 7 : 5.5}
                fill={eyeColor}
                className={!reducedMotion && isProcessing ? 'animate-pulse' : ''}
              />
              <circle cx="91" cy="54" r="2" fill="#FFFFFF" />
            </>
          )}
        </g>

        {/* Short Articulated Legs */}
        <g id="nexus-left-leg">
          <rect x="62" y="136" width="12" height="24" rx="6" fill="url(#nexusSilverTrim)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="68" cy="164" rx="9" ry="5" fill="url(#nexusWhiteArmor)" stroke="#94A3B8" strokeWidth="1.5" />
        </g>
        <g id="nexus-right-leg">
          <rect x="86" y="136" width="12" height="24" rx="6" fill="url(#nexusSilverTrim)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="92" cy="164" rx="9" ry="5" fill="url(#nexusWhiteArmor)" stroke="#94A3B8" strokeWidth="1.5" />
        </g>

        {/* Short Articulated Arms */}
        {carryingPacket ? (
          /* Hands Holding Courier Data Packet */
          <g id="nexus-carrying-arms">
            <path d="M 48 98 Q 62 116 72 120" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
            <path d="M 112 98 Q 98 116 88 120" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
            {/* The Carried Packet */}
            <g id="nexus-held-packet" filter="url(#nexusGlow)">
              <rect x="66" y="108" width="28" height="26" rx="6" fill={packetHex} stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="80" cy="121" r="5" fill="#FFFFFF" fillOpacity="0.9" />
              <line x1="72" y1="121" x2="88" y2="121" stroke="#00E5FF" strokeWidth="1.5" />
            </g>
          </g>
        ) : (
          /* Free Friendly Arms */
          <g id="nexus-free-arms">
            <path
              d={isProcessing ? 'M 50 96 Q 38 112 46 126' : 'M 50 96 Q 42 114 46 130'}
              stroke="#94A3B8"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={isProcessing ? 'M 110 96 Q 122 112 114 126' : 'M 110 96 Q 118 114 114 130'}
              stroke="#94A3B8"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx={isProcessing ? 46 : 46} cy={isProcessing ? 126 : 130} r="5" fill="url(#nexusWhiteArmor)" stroke="#94A3B8" />
            <circle cx={isProcessing ? 114 : 114} cy={isProcessing ? 126 : 130} r="5" fill="url(#nexusWhiteArmor)" stroke="#94A3B8" />
          </g>
        )}

        {/* Processing Ring / Halo when Processing */}
        {!reducedMotion && isProcessing && (
          <ellipse
            cx="80"
            cy="24"
            rx="28"
            ry="6"
            fill="none"
            stroke={eyeColor}
            strokeWidth="2"
            strokeDasharray="8 4"
            className="animate-spin origin-center pointer-events-none"
            filter="url(#nexusGlow)"
          />
        )}
      </svg>
    </div>
  );
};

import React from 'react';

interface CircularGaugeProps {
  value: number; // 0 to 100
  label: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: 'cyan' | 'purple' | 'green' | 'amber' | 'crimson';
  unit?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  label,
  subLabel,
  size = 110,
  strokeWidth = 8,
  color = 'cyan',
  unit = '%',
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  const colorMap = {
    cyan: {
      stroke: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.4)',
      bgStroke: 'rgba(0, 240, 255, 0.1)',
      text: 'text-cyan-400',
    },
    purple: {
      stroke: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.4)',
      bgStroke: 'rgba(168, 85, 247, 0.1)',
      text: 'text-purple-400',
    },
    green: {
      stroke: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      bgStroke: 'rgba(16, 185, 129, 0.1)',
      text: 'text-emerald-400',
    },
    amber: {
      stroke: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      bgStroke: 'rgba(245, 158, 11, 0.1)',
      text: 'text-amber-400',
    },
    crimson: {
      stroke: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.4)',
      bgStroke: 'rgba(244, 63, 94, 0.1)',
      text: 'text-rose-400',
    },
  };

  const scheme = colorMap[color];

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={scheme.bgStroke}
            strokeWidth={strokeWidth}
          />
          {/* Glowing gauge progress stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={scheme.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 4px ${scheme.glow})`,
              transition: 'stroke-dashoffset 0.8s ease-out',
            }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline space-x-0.5">
            <span className={`text-base font-bold font-mono tracking-tight ${scheme.text}`}>
              {Math.round(clampedValue)}
            </span>
            {unit && <span className="text-[10px] font-mono text-slate-400">{unit}</span>}
          </div>
          {subLabel && (
            <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 mt-0.5">
              {subLabel}
            </span>
          )}
        </div>
      </div>

      <span className="text-xs font-semibold text-slate-300 mt-2 tracking-wide text-center">
        {label}
      </span>
    </div>
  );
};


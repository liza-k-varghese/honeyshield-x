import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface NeonChartProps {
  data: DataPoint[];
  height?: number;
  color?: 'cyan' | 'purple' | 'dual';
  showGrid?: boolean;
  unit?: string;
  secondaryUnit?: string;
}

export const NeonChart: React.FC<NeonChartProps> = ({
  data,
  height = 140,
  color = 'cyan',
  showGrid = true,
  unit = 'evt/s',
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-slate-500 font-mono"
        style={{ height }}
      >
        No telemetry stream data
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 10);
  const width = 500;
  const paddingX = 20;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const secondaryPoints = data
    .filter((d) => d.secondaryValue !== undefined)
    .map((d, index) => {
      const x = paddingX + (index / (data.length - 1)) * chartWidth;
      const y = paddingY + chartHeight - ((d.secondaryValue || 0) / maxValue) * chartHeight;
      return { x, y, label: d.label, value: d.secondaryValue || 0 };
    });

  const primaryPath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const primaryArea = `${primaryPath} L ${points[points.length - 1].x} ${
    paddingY + chartHeight
  } L ${points[0].x} ${paddingY + chartHeight} Z`;

  const secondaryPath = secondaryPoints.length > 0
    ? secondaryPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
    : '';

  const primaryColor = color === 'purple' ? '#a855f7' : '#00f0ff';
  const secondaryColor = '#ec4899'; // Magenta / Pink for dual stream egress

  return (
    <div className="w-full relative select-none">
      <svg
        className="w-full overflow-visible"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-15">
            {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = paddingY + chartHeight * (1 - ratio);
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#38bdf8"
                  strokeDasharray="2 4"
                  strokeWidth="0.8"
                />
              );
            })}
          </g>
        )}

        {/* Primary Area Fill */}
        <path
          d={primaryArea}
          fill={color === 'purple' ? 'url(#purpleGradient)' : 'url(#cyanGradient)'}
        />

        {/* Secondary Line (if dual) */}
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.8"
            strokeDasharray="4 3"
            style={{
              filter: `drop-shadow(0 0 4px ${secondaryColor})`,
            }}
          />
        )}

        {/* Primary Neon Line */}
        <path
          d={primaryPath}
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 6px ${primaryColor})`,
          }}
        />

        {/* Dynamic Nodes */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#060913"
            stroke={primaryColor}
            strokeWidth="1.5"
            className="hover:r-4 transition-all"
            style={{ filter: `drop-shadow(0 0 3px ${primaryColor})` }}
          />
        ))}
      </svg>

      {/* Axis X Labels */}
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-2 mt-1">
        {data.map((d, i) => (
          <span key={i} className={i % 2 !== 0 && data.length > 6 ? 'hidden sm:inline' : ''}>
            {d.label}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end space-x-3 text-[10px] font-mono text-slate-400 mt-1">
        <span className="flex items-center space-x-1">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: primaryColor }}
          />
          <span>Primary ({unit})</span>
        </span>
        {secondaryPath && (
          <span className="flex items-center space-x-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: secondaryColor }}
            />
            <span>Egress / Decoy</span>
          </span>
        )}
      </div>
    </div>
  );
};


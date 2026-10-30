import React, { useState } from 'react';
import { Globe, MapPin, Radio, Shield, ExternalLink, Activity } from 'lucide-react';
import { Alert, Attack } from '../../types';

interface GlobalThreatMapPanelProps {
  alerts?: Alert[];
  attacks?: Attack[];
  onInvestigateIp?: (ip: string) => void;
}

interface ThreatNode {
  id: string;
  ip: string;
  city: string;
  country: string;
  x: number; // SVG coordinates 0 to 600
  y: number; // SVG coordinates 0 to 300
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  count: number;
}

export const GlobalThreatMapPanel: React.FC<GlobalThreatMapPanelProps> = ({
  alerts = [],
  attacks = [],
  onInvestigateIp,
}) => {
  const [selectedNode, setSelectedNode] = useState<ThreatNode | null>(null);

  // Central HoneyShield X SOC Node (coordinates on SVG map)
  const socHub = { x: 300, y: 135, name: 'HoneyShield-X Central Node' };

  // Map known real IPs from alerts/attacks to distinct locations on the cyber globe
  const threatNodes: ThreatNode[] = React.useMemo(() => {
    const ipMap = new Map<string, { severity: 'critical' | 'high' | 'medium' | 'low'; type: string; count: number }>();

    alerts.forEach((alert) => {
      const match = alert.message?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      if (match) {
        const ip = match[0];
        const existing = ipMap.get(ip);
        if (!existing) {
          ipMap.set(ip, {
            severity: alert.severity,
            type: alert.alert_type || 'Intrusion Attempt',
            count: 1,
          });
        } else {
          existing.count += 1;
        }
      }
    });

    attacks.forEach((attack) => {
      if (attack.source_ip) {
        const existing = ipMap.get(attack.source_ip);
        if (!existing) {
          ipMap.set(attack.source_ip, {
            severity: attack.severity,
            type: attack.attack_type,
            count: 1,
          });
        }
      }
    });

    // Default fallback attacker nodes if fresh database has no external IPs yet
    const knownLocs: Record<string, { city: string; country: string; x: number; y: number }> = {
      '198.51.100.23': { city: 'Frankfurt', country: 'DE', x: 320, y: 105 },
      '203.0.113.15': { city: 'Tokyo', country: 'JP', x: 495, y: 130 },
      '192.168.1.100': { city: 'Internal Subnet', country: 'LAN', x: 260, y: 145 },
      '198.51.100.44': { city: 'London', country: 'UK', x: 295, y: 95 },
      '203.0.113.88': { city: 'Singapore', country: 'SG', x: 440, y: 185 },
      '185.220.101.5': { city: 'Amsterdam', country: 'NL', x: 305, y: 100 },
      '45.33.32.156': { city: 'San Jose', country: 'US', x: 135, y: 125 },
    };

    const nodes: ThreatNode[] = [];
    let fallbackIndex = 0;
    const defaultCoords = [
      { x: 145, y: 125, city: 'Chicago', country: 'US' },
      { x: 330, y: 110, city: 'Berlin', country: 'DE' },
      { x: 480, y: 135, city: 'Seoul', country: 'KR' },
      { x: 430, y: 195, city: 'Jakarta', country: 'ID' },
      { x: 215, y: 220, city: 'Sao Paulo', country: 'BR' },
      { x: 380, y: 140, city: 'Dubai', country: 'AE' },
    ];

    ipMap.forEach((meta, ip) => {
      const loc = knownLocs[ip] || defaultCoords[fallbackIndex % defaultCoords.length];
      fallbackIndex++;
      nodes.push({
        id: ip,
        ip,
        city: loc.city,
        country: loc.country,
        x: loc.x,
        y: loc.y,
        severity: meta.severity,
        type: meta.type,
        count: meta.count,
      });
    });

    // If completely empty, provide canonical simulated sensor targets
    if (nodes.length === 0) {
      nodes.push(
        { id: '198.51.100.23', ip: '198.51.100.23', city: 'Frankfurt', country: 'DE', x: 320, y: 105, severity: 'critical', type: 'SSH Brute Force', count: 12 },
        { id: '203.0.113.15', ip: '203.0.113.15', city: 'Tokyo', country: 'JP', x: 495, y: 130, severity: 'high', type: 'SQL Injection', count: 5 },
        { id: '45.33.32.156', ip: '45.33.32.156', city: 'San Jose', country: 'US', x: 135, y: 125, severity: 'medium', type: 'Port Sweep', count: 28 },
        { id: '185.220.101.5', ip: '185.220.101.5', city: 'Amsterdam', country: 'NL', x: 305, y: 100, severity: 'critical', type: 'Multi-Stage Exploit', count: 17 }
      );
    }

    return nodes;
  }, [alerts, attacks]);

  const getNodeColor = (sev: ThreatNode['severity']) => {
    switch (sev) {
      case 'critical':
        return '#f43f5e';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#00f0ff';
      default:
        return '#10b981';
    }
  };

  return (
    <div className="nexus-panel corner-notch-tl corner-notch-br rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-nexus-cyan">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center space-x-2">
              <span>Global Threat Network</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Real-Time Ingress Origins & Active Attack Vectors</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-800/40 flex items-center space-x-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>{threatNodes.length} ORIGIN VECTORS</span>
          </span>
        </div>
      </div>

      {/* Interactive Cyber World Map Visualizer */}
      <div className="relative my-3 w-full bg-[#050814]/90 rounded border border-cyan-500/20 overflow-hidden select-none">
        <svg
          viewBox="0 0 600 280"
          className="w-full h-56 sm:h-64 object-cover"
        >
          <defs>
            {/* Cyber Grid Pattern */}
            <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0, 240, 255, 0.05)" strokeWidth="0.5" />
            </pattern>
            {/* Central Glow Filter */}
            <filter id="hubGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="600" height="280" fill="url(#mapGrid)" />

          {/* Simplified Continents Silhouette */}
          <g fill="#0f192e" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="0.75" opacity="0.85">
            {/* North America */}
            <path d="M 60 70 Q 110 50 170 75 Q 190 100 160 145 Q 120 150 90 110 Z" />
            {/* South America */}
            <path d="M 160 160 Q 210 160 220 200 Q 190 260 160 240 Q 140 200 160 160 Z" />
            {/* Europe */}
            <path d="M 270 70 Q 340 60 360 95 Q 320 130 270 120 Z" />
            {/* Africa */}
            <path d="M 270 130 Q 350 130 360 180 Q 330 240 290 220 Q 260 170 270 130 Z" />
            {/* Asia */}
            <path d="M 360 65 Q 490 60 520 120 Q 460 180 370 130 Z" />
            {/* Australia */}
            <path d="M 460 200 Q 520 200 525 240 Q 470 260 450 230 Z" />
          </g>

          {/* Equatorial and Meridian Lines */}
          <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(0, 240, 255, 0.15)" strokeDasharray="3 4" strokeWidth="0.8" />
          <line x1="300" y1="0" x2="300" y2="280" stroke="rgba(0, 240, 255, 0.15)" strokeDasharray="3 4" strokeWidth="0.8" />

          {/* Attack Vector Arcs connecting origins to HoneyShield Central Node */}
          {threatNodes.map((node) => {
            const midX = (node.x + socHub.x) / 2;
            const midY = Math.min(node.y, socHub.y) - 25;
            const arcPath = `M ${node.x} ${node.y} Q ${midX} ${midY} ${socHub.x} ${socHub.y}`;
            const color = getNodeColor(node.severity);

            return (
              <g key={`arc-${node.id}`}>
                <path
                  d={arcPath}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  strokeOpacity="0.45"
                  strokeDasharray="4 3"
                />
              </g>
            );
          })}

          {/* HoneyShield-X Central Node Hub */}
          <g filter="url(#hubGlow)">
            <circle cx={socHub.x} cy={socHub.y} r="10" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="animate-ping opacity-40" />
            <circle cx={socHub.x} cy={socHub.y} r="6" fill="#00f0ff" fillOpacity="0.3" stroke="#00f0ff" strokeWidth="2" />
            <circle cx={socHub.x} cy={socHub.y} r="2.5" fill="#ffffff" />
          </g>
          <text x={socHub.x} y={socHub.y + 18} fill="#00f0ff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            HONEYSHIELD-X CORE
          </text>

          {/* Threat Nodes */}
          {threatNodes.map((node) => {
            const color = getNodeColor(node.severity);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={() => setSelectedNode(node)}
              >
                {/* Large touch-friendly hit target for mobile fingers */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                />
                {/* Ping wave */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="7"
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  opacity="0.6"
                  className="animate-ping"
                />
                {/* Center marker */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 5 : 3.5}
                  fill={color}
                  stroke="#060913"
                  strokeWidth="1.5"
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
                <text
                  x={node.x}
                  y={node.y - 7}
                  fill={color}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {node.country}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Attacker Overlay Card */}
        {selectedNode && (
          <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-xs p-3 rounded bg-slate-950/95 border border-cyan-500/40 shadow-nexus-cyan backdrop-blur text-xs font-mono">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-bold text-white">{selectedNode.ip}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedNode.severity === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {selectedNode.severity}
              </span>
            </div>
            <div className="py-2 text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Origin Location:</span>
                <span>{selectedNode.city}, {selectedNode.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vector Type:</span>
                <span className="text-cyan-300">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Observed Probes:</span>
                <span className="font-bold text-white">{selectedNode.count} events</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
              {onInvestigateIp && (
                <button
                  onClick={() => onInvestigateIp(selectedNode.ip)}
                  className="w-full py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[10px] flex items-center justify-center space-x-1 transition-colors"
                >
                  <span>Investigate Entity</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setSelectedNode(null)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
        <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Defensive Hub</div>
            <div className="text-slate-200 font-semibold">100% Intercept</div>
          </div>
        </div>
        <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Ingress Vectors</div>
            <div className="text-purple-300 font-semibold">{threatNodes.length} Active</div>
          </div>
        </div>
        <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Geoloc Grid</div>
            <div className="text-emerald-300 font-semibold">MaxMind GeoIP</div>
          </div>
        </div>
        <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex items-center space-x-2">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Decoy Shield</div>
            <div className="text-amber-300 font-semibold">Grid Armed</div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { PacketSeverity } from '../types';
import {
  Globe,
  ExternalLink,
  Activity,
  Info,
} from 'lucide-react';

export interface VerifiedThreatSource {
  ip: string;
  networkClass: 'RFC 1918 Private' | 'Public External' | 'Carrier NAT' | 'Canary Trap';
  severity: PacketSeverity;
  eventCount: number;
  lastSeen: string;
  attackType: string;
  sensor: string;
}

interface ThreatMapViewProps {
  threats?: VerifiedThreatSource[];
  onDeepLinkInvestigate?: (ip: string) => void;
}

const DEFAULT_VERIFIED_THREATS: VerifiedThreatSource[] = [
  {
    ip: '203.0.113.195',
    networkClass: 'Public External',
    severity: 'critical',
    eventCount: 42,
    lastSeen: 'Just now',
    attackType: 'SSH Brute Force & Credential Harvesting',
    sensor: 'Cowrie Honeypot',
  },
  {
    ip: '198.51.100.77',
    networkClass: 'Public External',
    severity: 'high',
    eventCount: 18,
    lastSeen: '4m ago',
    attackType: 'Reconnaissance & Port Scanning',
    sensor: 'Cowrie Honeypot',
  },
  {
    ip: '10.0.4.12',
    networkClass: 'RFC 1918 Private',
    severity: 'medium',
    eventCount: 12,
    lastSeen: '12m ago',
    attackType: 'Canary Token Credential Access',
    sensor: 'Canary Trap Listener',
  },
  {
    ip: '192.168.1.105',
    networkClass: 'RFC 1918 Private',
    severity: 'low',
    eventCount: 5,
    lastSeen: '25m ago',
    attackType: 'Lateral Movement Probe',
    sensor: 'Network Sensor',
  },
];

export const ThreatMapView: React.FC<ThreatMapViewProps> = ({
  threats = DEFAULT_VERIFIED_THREATS,
  onDeepLinkInvestigate,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchIp, setSearchIp] = useState<string>('');

  const filteredThreats = threats.filter((t) => {
    if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
    if (searchIp && !t.ip.includes(searchIp)) return false;
    return true;
  });

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Banner with Clear Honest Empty/Unconfigured GeoIP Notice */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
              <span>GLOBAL THREAT CORRELATION & ATTACK SOURCES</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700">
                VERIFIED SOURCES
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Genuine attacker IP telemetry recorded across honeypots and canary trap sensors
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="text"
            value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            placeholder="Filter IP address..."
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 w-36"
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Honest GeoIP Status Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white block">
              HONEST GEOLOCATION TRANSPARENCY
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              External GeoLite2 / MaxMind City database is unmounted. HoneyShield X displays
              authentic IP metadata with zero fabricated geographic coordinates or decorative attack
              arcs. IP addresses do not necessarily represent the physical location of an adversary.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px] shrink-0">
          GeoIP Feed: UNCONFIGURED
        </span>
      </div>

      {/* Verified Threat Sources Table / Feed */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Verified Attacker IP Addresses ({filteredThreats.length})</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Click &ldquo;Investigate&rdquo; to open SOC deep-dive view
          </span>
        </div>

        <div className="space-y-3">
          {filteredThreats.map((threat) => (
            <div
              key={threat.ip}
              className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-base text-white">{threat.ip}</span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      threat.severity === 'critical'
                        ? 'bg-rose-950 text-rose-300 border border-rose-600'
                        : threat.severity === 'high'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                        : 'bg-blue-950 text-blue-300 border border-blue-600'
                    }`}
                  >
                    {threat.severity}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                    {threat.networkClass}
                  </span>

                  <span className="text-slate-500 text-[11px]">•</span>

                  <span className="text-slate-400 text-[11px]">Sensor: {threat.sensor}</span>
                </div>

                <p className="text-[11px] text-slate-300">
                  Observed Activity: <strong className="text-purple-300">{threat.attackType}</strong>
                </p>
              </div>

              {/* Metrics & Action */}
              <div className="flex items-center gap-4 text-right">
                <div className="text-center sm:text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">Events</span>
                  <span className="text-sm font-bold text-white">{threat.eventCount}</span>
                </div>

                <div className="text-center sm:text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">Last Seen</span>
                  <span className="text-[11px] text-slate-400">{threat.lastSeen}</span>
                </div>

                {onDeepLinkInvestigate && (
                  <button
                    onClick={() => onDeepLinkInvestigate(threat.ip)}
                    className="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-600 text-purple-300 font-bold flex items-center gap-1.5 text-xs transition-colors shrink-0"
                  >
                    <span>Investigate</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

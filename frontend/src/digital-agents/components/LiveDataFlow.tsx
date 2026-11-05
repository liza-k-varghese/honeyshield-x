import React, { useState, useRef, useCallback } from 'react';
import {
  DataPacketPayload,
  FlowNodeDefinition,
  FlowConnectionDefinition,
  AgentId,
  TerritoryId,
} from '../types';
import { AgentCharacterMap } from '../characters';
import { DataPacket } from './DataPacket';
import { NodeInspectorModal } from './NodeInspectorModal';
import {
  Shield,
  Radio,
  Database,
  Cpu,
  BrainCircuit,
  Bell,
  Server,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
} from 'lucide-react';

interface LiveDataFlowProps {
  nodes: FlowNodeDefinition[];
  connections?: FlowConnectionDefinition[];
  activePackets: DataPacketPayload[];
  onSelectPacket: (packet: DataPacketPayload) => void;
  selectedPacketId?: string;
  reducedMotion?: boolean;
  onSelectNode?: (node: FlowNodeDefinition) => void;
  onSelectAgent?: (agentId: AgentId) => void;
}

// Canonical Detailed Nodes across all 4 Operational Territories
export const CANONICAL_TERRITORY_NODES: FlowNodeDefinition[] = [
  // Territory 1: Sensor Grid (SCOUT)
  {
    id: 'sensor-cowrie',
    label: 'Cowrie SSH/Telnet Honeypot',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 8,
    y: 15,
    status: 'active',
    eventCount: 42,
    sensorType: 'Medium-Interaction SSH/Telnet Emulation',
    heartbeat: 'Active (< 15s)',
    pipelineDestination: 'Ingestion API Gateway',
  },
  {
    id: 'sensor-trap',
    label: 'HoneyShield Canary Trap',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 8,
    y: 32,
    status: 'active',
    eventCount: 12,
    sensorType: 'Deception Canary Token Trap',
    heartbeat: 'Active (< 10s)',
    pipelineDestination: 'Ingestion API Gateway',
  },
  {
    id: 'sensor-dionaea',
    label: 'Dionaea Malware Honeypot',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 8,
    y: 48,
    status: 'unconfigured',
    eventCount: 0,
    sensorType: 'Low-Interaction SMB/HTTP/FTP Daemon',
    heartbeat: 'Unconfigured',
    pipelineDestination: 'Ingestion API Gateway',
  },
  {
    id: 'sensor-opencanary',
    label: 'OpenCanary Daemon',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 8,
    y: 64,
    status: 'unconfigured',
    eventCount: 0,
    sensorType: 'Multi-Service Canary Daemon',
    heartbeat: 'Unconfigured',
    pipelineDestination: 'Ingestion API Gateway',
  },
  {
    id: 'sensor-suricata',
    label: 'Suricata NIDS Listener',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 8,
    y: 80,
    status: 'offline',
    eventCount: 0,
    sensorType: 'Network IDS/IPS Sensor',
    heartbeat: 'Disconnected',
    pipelineDestination: 'Ingestion API Gateway',
  },
  {
    id: 'sensor-zeek',
    label: 'Zeek Network Monitor',
    system: 'SYS 2',
    agentOwner: 'scout',
    x: 8,
    y: 95,
    status: 'unconfigured',
    eventCount: 0,
    sensorType: 'Bro/Zeek Behavioral Traffic Analyzer',
    heartbeat: 'Unconfigured',
    pipelineDestination: 'Ingestion API Gateway',
  },

  // Territory 2: Central Processing Core (NEXUS)
  {
    id: 'ingestion',
    label: 'Ingestion API Gateway',
    system: 'SYS 1',
    agentOwner: 'nexus',
    x: 35,
    y: 20,
    status: 'active',
    eventCount: 42,
    sensorType: 'FastAPI REST Telemetry Ingest',
    heartbeat: 'Active (< 5s)',
    pipelineDestination: 'Redis Processing Queue',
  },
  {
    id: 'queue',
    label: 'Redis Processing Queue',
    system: 'SYS 1',
    agentOwner: 'nexus',
    x: 35,
    y: 45,
    status: 'active',
    eventCount: 39,
    sensorType: 'In-Memory Stream Buffer (Redis)',
    heartbeat: 'Active (< 5s)',
    pipelineDestination: 'PostgreSQL Event Outbox',
  },
  {
    id: 'persistence',
    label: 'PostgreSQL Event Outbox',
    system: 'SYS 1',
    agentOwner: 'nexus',
    x: 35,
    y: 75,
    status: 'active',
    eventCount: 39,
    sensorType: 'Transactional ACID Outbox Ledger',
    heartbeat: 'Active (Committed)',
    pipelineDestination: 'Attack Detection Core',
  },

  // Territory 3: Intelligence Lab (ORACLE)
  {
    id: 'detection',
    label: 'Attack Detection Core',
    system: 'SYS 1',
    agentOwner: 'oracle',
    x: 65,
    y: 25,
    status: 'active',
    eventCount: 28,
    sensorType: 'Correlation & Pattern Engine',
    heartbeat: 'Active (< 10s)',
    pipelineDestination: 'Threat Intelligence Store',
  },
  {
    id: 'intel',
    label: 'Threat Intelligence Store',
    system: 'SYS 3',
    agentOwner: 'oracle',
    x: 65,
    y: 65,
    status: 'active',
    eventCount: 28,
    sensorType: 'IOC Database & Risk Scorer',
    heartbeat: 'Active (< 10s)',
    pipelineDestination: 'Confirmed Alert Evaluator',
  },

  // Territory 4: Security Operations (SENTINEL)
  {
    id: 'alerts',
    label: 'Confirmed Alert Evaluator',
    system: 'SYS 1',
    agentOwner: 'sentinel',
    x: 90,
    y: 30,
    status: 'active',
    eventCount: 16,
    sensorType: 'Severity Triage & Threshold Engine',
    heartbeat: 'Active (< 5s)',
    pipelineDestination: 'SOC Push & Governor Console',
  },
  {
    id: 'notifications',
    label: 'SOC Push & Governor Console',
    system: 'SYS 1',
    agentOwner: 'sentinel',
    x: 90,
    y: 70,
    status: 'active',
    eventCount: 16,
    sensorType: 'WebSocket/Push Gateway & Governor',
    heartbeat: 'Active (< 5s)',
    pipelineDestination: 'Paired Android Mobile Devices',
  },
];

export const LiveDataFlow: React.FC<LiveDataFlowProps> = ({
  nodes: _providedNodes,
  connections: _connections,
  activePackets,
  onSelectPacket,
  selectedPacketId,
  reducedMotion = false,
  onSelectNode,
  onSelectAgent,
}) => {
  // Pan and Zoom Canvas State
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeTerritoryFocus, setActiveTerritoryFocus] = useState<TerritoryId | 'all'>('all');
  const [inspectedNode, setInspectedNode] = useState<FlowNodeDefinition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Use the rich canonical nodes list to ensure full representation
  const allNodes = CANONICAL_TERRITORY_NODES;

  const handleZoomIn = () => setZoom((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  const handleResetView = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setActiveTerritoryFocus('all');
  };

  const handleFocusTerritory = (t: TerritoryId) => {
    setActiveTerritoryFocus(t);
    setZoom(1.2);
    if (t === 'territory_sensors') {
      setPanX(150);
      setPanY(50);
    } else if (t === 'territory_core') {
      setPanX(0);
      setPanY(50);
    } else if (t === 'territory_intel') {
      setPanX(-150);
      setPanY(0);
    } else if (t === 'territory_soc') {
      setPanX(-300);
      setPanY(0);
    }
  };

  // Drag-to-Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setZoom((prev) => Math.min(2.0, Math.max(0.6, Number((prev + delta).toFixed(2)))));
    }
  }, []);

  const getNodeIcon = (nodeId: string) => {
    if (nodeId.startsWith('sensor')) return Radio;
    switch (nodeId) {
      case 'sensors':
        return Radio;
      case 'ingestion':
        return Server;
      case 'queue':
        return Layers;
      case 'persistence':
        return Database;
      case 'detection':
        return Shield;
      case 'intel':
        return BrainCircuit;
      case 'alerts':
        return Bell;
      case 'notifications':
        return Sparkles;
      default:
        return Cpu;
    }
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Top Territory Legend & Focus Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Territory 1: SCOUT */}
        <div
          onClick={() => handleFocusTerritory('territory_sensors')}
          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
            activeTerritoryFocus === 'territory_sensors'
              ? 'bg-blue-950/80 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.35)] ring-1 ring-blue-400'
              : 'bg-blue-950/40 border-blue-500/40 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <span className="font-bold text-white block">SCOUT Territory</span>
              <span className="text-[10px] text-blue-300">Sensor Grid & Traps</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200">
            SYS 2
          </span>
        </div>

        {/* Territory 2: NEXUS */}
        <div
          onClick={() => handleFocusTerritory('territory_core')}
          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
            activeTerritoryFocus === 'territory_core'
              ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.35)] ring-1 ring-cyan-400'
              : 'bg-cyan-950/40 border-cyan-500/40 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <span className="font-bold text-white block">NEXUS Core</span>
              <span className="text-[10px] text-cyan-300">Ingest, Queue & Outbox</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200">
            SYS 1
          </span>
        </div>

        {/* Territory 3: ORACLE */}
        <div
          onClick={() => handleFocusTerritory('territory_intel')}
          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
            activeTerritoryFocus === 'territory_intel'
              ? 'bg-purple-950/80 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)] ring-1 ring-purple-400'
              : 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <div>
              <span className="font-bold text-white block">ORACLE Territory</span>
              <span className="text-[10px] text-purple-300">Threat Intelligence</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200">
            SYS 3
          </span>
        </div>

        {/* Territory 4: SENTINEL */}
        <div
          onClick={() => handleFocusTerritory('territory_soc')}
          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
            activeTerritoryFocus === 'territory_soc'
              ? 'bg-red-950/80 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.35)] ring-1 ring-red-400'
              : 'bg-red-950/40 border-red-500/40 hover:border-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div>
              <span className="font-bold text-white block">SENTINEL Territory</span>
              <span className="text-[10px] text-red-300">Alerts & Governor</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-200">
            SYS 1
          </span>
        </div>
      </div>

      {/* Main Interactive Cyber Intelligence Universe Canvas */}
      <div className="relative rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl overflow-hidden min-h-[620px]">
        {/* Floating Pan & Zoom Toolbar */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[11px] text-cyan-300 font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1" />
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            title="Reset Universe View (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Pan Helper Badge */}
        <div className="absolute top-4 left-4 z-20 hidden sm:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-none">
          <Move className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click & Drag to Pan Canvas • Click Any Node to Inspect</span>
        </div>

        {/* Draggable & Zoomable Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          className="p-8 w-full min-h-[620px] select-none"
        >
          {/* Territory Columns Layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Territory 1: Sensor Grid (SCOUT) */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/20 text-xs">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  TERRITORY 1 // SENSOR GRID
                </span>
                <span className="text-[10px] text-blue-400">SCOUT</span>
              </div>

              {/* Sensor Nodes Stack */}
              <div className="space-y-2">
                {allNodes
                  .filter((n) => n.id.startsWith('sensor'))
                  .map((node) => {
                    const Icon = getNodeIcon(node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setInspectedNode(node);
                          onSelectNode?.(node);
                        }}
                        className={`interactive-card p-2.5 rounded-lg border transition-all cursor-pointer text-xs space-y-1 ${
                          node.status === 'active'
                            ? 'bg-slate-900/90 border-blue-500/40 hover:border-blue-400 shadow-sm'
                            : node.status === 'unconfigured'
                            ? 'bg-slate-950/60 border-amber-500/30 hover:border-amber-400 opacity-70'
                            : 'bg-slate-950/40 border-red-500/30 hover:border-red-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-bold text-white text-[11px] truncate">{node.label}</span>
                          </div>
                          {node.status === 'active' ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          ) : node.status === 'unconfigured' ? (
                            <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-700">
                              UNCONFIGURED
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 rounded bg-red-950 text-red-300 border border-red-700">
                              OFFLINE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>{node.sensorType?.split(' ')[0]}</span>
                          <span className="text-blue-300 font-bold">{node.eventCount} evts</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* SCOUT Avatar Anchor */}
              <div
                onClick={() => onSelectAgent?.('scout')}
                className="interactive-card mt-3 pt-2 border-t border-blue-500/20 flex flex-col items-center cursor-pointer group"
              >
                <div className="w-16 h-16 group-hover:scale-105 transition-transform">
                  {React.createElement(AgentCharacterMap.scout, {
                    state: 'scanning',
                    size: 64,
                    carryingPacket: true,
                    reducedMotion: reducedMotion,
                  })}
                </div>
                <span className="text-[10px] font-bold text-blue-300 mt-1">
                  SCOUT (Sensor Collector)
                </span>
              </div>
            </div>

            {/* Territory 2: Central Processing Core (NEXUS) */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  TERRITORY 2 // CENTRAL CORE
                </span>
                <span className="text-[10px] text-cyan-400">NEXUS</span>
              </div>

              <div className="space-y-2.5">
                {allNodes
                  .filter((n) => ['ingestion', 'queue', 'persistence'].includes(n.id))
                  .map((node) => {
                    const Icon = getNodeIcon(node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setInspectedNode(node);
                          onSelectNode?.(node);
                        }}
                        className="interactive-card p-3 rounded-lg bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-300 transition-all cursor-pointer text-xs space-y-1.5 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-cyan-400" />
                            <span className="font-bold text-white text-[11px]">{node.label}</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>{node.system}</span>
                          <span className="text-cyan-300 font-bold">{node.eventCount} evts</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* NEXUS Avatar Anchor */}
              <div
                onClick={() => onSelectAgent?.('nexus')}
                className="interactive-card mt-3 pt-2 border-t border-cyan-500/20 flex flex-col items-center cursor-pointer group"
              >
                <div className="w-16 h-16 group-hover:scale-105 transition-transform">
                  {React.createElement(AgentCharacterMap.nexus, {
                    state: 'processing',
                    size: 64,
                    carryingPacket: true,
                    reducedMotion: reducedMotion,
                  })}
                </div>
                <span className="text-[10px] font-bold text-cyan-300 mt-1">
                  NEXUS (Core Processor)
                </span>
              </div>
            </div>

            {/* Territory 3: Intelligence Lab (ORACLE) */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  TERRITORY 3 // INTEL LAB
                </span>
                <span className="text-[10px] text-purple-400">ORACLE</span>
              </div>

              <div className="space-y-2.5">
                {allNodes
                  .filter((n) => ['detection', 'intel'].includes(n.id))
                  .map((node) => {
                    const Icon = getNodeIcon(node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setInspectedNode(node);
                          onSelectNode?.(node);
                        }}
                        className="interactive-card p-3 rounded-lg bg-slate-900/90 border border-purple-500/40 hover:border-purple-300 transition-all cursor-pointer text-xs space-y-1.5 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-purple-400" />
                            <span className="font-bold text-white text-[11px]">{node.label}</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>{node.system}</span>
                          <span className="text-purple-300 font-bold">{node.eventCount} evts</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* ORACLE Avatar Anchor */}
              <div
                onClick={() => onSelectAgent?.('oracle')}
                className="interactive-card mt-3 pt-2 border-t border-purple-500/20 flex flex-col items-center cursor-pointer group"
              >
                <div className="w-16 h-16 group-hover:scale-105 transition-transform">
                  {React.createElement(AgentCharacterMap.oracle, {
                    state: 'analyzing',
                    size: 64,
                    carryingPacket: true,
                    reducedMotion: reducedMotion,
                  })}
                </div>
                <span className="text-[10px] font-bold text-purple-300 mt-1">
                  ORACLE (Threat Intel)
                </span>
              </div>
            </div>

            {/* Territory 4: Security Operations (SENTINEL) */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-red-500/20 text-xs">
                <span className="font-bold text-red-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  TERRITORY 4 // SECURITY OPS
                </span>
                <span className="text-[10px] text-red-400">SENTINEL</span>
              </div>

              <div className="space-y-2.5">
                {allNodes
                  .filter((n) => ['alerts', 'notifications'].includes(n.id))
                  .map((node) => {
                    const Icon = getNodeIcon(node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setInspectedNode(node);
                          onSelectNode?.(node);
                        }}
                        className="interactive-card p-3 rounded-lg bg-slate-900/90 border border-red-500/40 hover:border-red-300 transition-all cursor-pointer text-xs space-y-1.5 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-red-400" />
                            <span className="font-bold text-white text-[11px]">{node.label}</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>{node.system}</span>
                          <span className="text-red-300 font-bold">{node.eventCount} evts</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* SENTINEL Avatar Anchor */}
              <div
                onClick={() => onSelectAgent?.('sentinel')}
                className="interactive-card mt-3 pt-2 border-t border-red-500/20 flex flex-col items-center cursor-pointer group"
              >
                <div className="w-16 h-16 group-hover:scale-105 transition-transform">
                  {React.createElement(AgentCharacterMap.sentinel, {
                    state: 'alerting',
                    size: 64,
                    carryingPacket: true,
                    reducedMotion: reducedMotion,
                  })}
                </div>
                <span className="text-[10px] font-bold text-red-300 mt-1">
                  SENTINEL (Alert Response)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Carried Packets Ribbon */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Active Carried Data Packets ({activePackets.length})</span>
          </span>
          <span className="text-[10px] text-slate-500">
            Click any packet to open Transfer Inspector
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {activePackets.length > 0 ? (
            activePackets.map((pkt) => (
              <DataPacket
                key={pkt.transferId}
                packet={pkt}
                onClick={onSelectPacket}
                selected={selectedPacketId === pkt.eventId}
              />
            ))
          ) : (
            <div className="text-slate-500 text-xs py-2 w-full text-center">
              All pipeline stages quiescent. No active in-flight transfers.
            </div>
          )}
        </div>
      </div>

      {/* Node Inspector Modal */}
      <NodeInspectorModal
        node={inspectedNode}
        onClose={() => setInspectedNode(null)}
      />
    </div>
  );
};

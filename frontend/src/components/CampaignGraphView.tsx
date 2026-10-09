import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Info,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Globe,
  Radio,
  ShieldAlert,
  Briefcase,
  Key,
} from 'lucide-react';
import { CampaignGraphResponse, CampaignGraphNode, CampaignGraphEdge } from '../types';

interface CampaignGraphViewProps {
  graph: CampaignGraphResponse;
  onSelectNode?: (node: CampaignGraphNode) => void;
}

export const CampaignGraphView: React.FC<CampaignGraphViewProps> = ({
  graph,
  onSelectNode,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Categorize and position nodes deterministically in columns based on type
  const { layoutNodes, layoutEdges } = useMemo(() => {
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    // Columns:
    // Col 0: Attacker IPs (ip)
    // Col 1: IOCs (ioc) & User Agents (user_agent)
    // Col 2: Alerts (alert) & Attacks (attack)
    // Col 3: Canary Honeytokens (canary)
    // Col 4: Incident Cases (case)
    const typeColMap: Record<string, number> = {
      ip: 0,
      user_agent: 1,
      ioc: 1,
      attack: 2,
      alert: 2,
      canary: 3,
      case: 4,
    };

    const columns: Record<number, CampaignGraphNode[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    nodes.forEach((n) => {
      const col = typeColMap[n.node_type] ?? 2;
      columns[col].push(n);
    });

    const colXPositions: Record<number, number> = {
      0: 80,
      1: 280,
      2: 480,
      3: 680,
      4: 880,
    };

    const nodePositions: Record<string, { x: number; y: number }> = {};
    const renderedLayoutNodes: Array<CampaignGraphNode & { x: number; y: number }> = [];

    Object.entries(columns).forEach(([colKey, colNodes]) => {
      const colIdx = parseInt(colKey, 10);
      const x = colXPositions[colIdx] || 400;
      const totalInCol = colNodes.length;
      const verticalSpacing = 70;
      const startY = Math.max(50, 250 - (totalInCol * verticalSpacing) / 2);

      colNodes.forEach((node, idx) => {
        const y = startY + idx * verticalSpacing;
        nodePositions[node.id] = { x, y };
        renderedLayoutNodes.push({ ...node, x, y });
      });
    });

    const renderedLayoutEdges = edges
      .map((edge) => {
        const srcPos = nodePositions[edge.source];
        const tgtPos = nodePositions[edge.target];
        if (!srcPos || !tgtPos) return null;
        return {
          ...edge,
          x1: srcPos.x,
          y1: srcPos.y,
          x2: tgtPos.x,
          y2: tgtPos.y,
        };
      })
      .filter(Boolean) as Array<CampaignGraphEdge & { x1: number; y1: number; x2: number; y2: number }>;

    return { layoutNodes: renderedLayoutNodes, layoutEdges: renderedLayoutEdges };
  }, [graph]);

  const selectedNode = useMemo(() => {
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graph, selectedNodeId]);

  const handleNodeClick = (node: CampaignGraphNode) => {
    setSelectedNodeId(node.id);
    onSelectNode?.(node);
  };

  const getNodeColor = (node: CampaignGraphNode) => {
    switch (node.node_type) {
      case 'ip':
        return { bg: '#e11d48', stroke: '#fb7185', text: '#ffffff' }; // rose-600
      case 'ioc':
        return { bg: '#d97706', stroke: '#fbbf24', text: '#ffffff' }; // amber-600
      case 'user_agent':
        return { bg: '#475569', stroke: '#94a3b8', text: '#ffffff' }; // slate-600
      case 'attack':
        return { bg: '#ea580c', stroke: '#fb923c', text: '#ffffff' }; // orange-600
      case 'alert':
        return { bg: '#c026d3', stroke: '#e879f9', text: '#ffffff' }; // fuchsia-600
      case 'canary':
        return { bg: '#059669', stroke: '#34d399', text: '#ffffff' }; // emerald-600
      case 'case':
        return { bg: '#4f46e5', stroke: '#818cf8', text: '#ffffff' }; // indigo-600
      default:
        return { bg: '#334155', stroke: '#64748b', text: '#ffffff' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border border-slate-800 rounded-lg overflow-hidden">
      {/* Truncation Warning Banner */}
      {graph.truncation?.is_truncated && (
        <div className="bg-amber-950/80 border-b border-amber-600/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Graph Display Truncated:</strong> Super-cluster exceeded display bounds. Displaying{' '}
              {graph.truncation.rendered_nodes} of {graph.truncation.total_nodes_discovered} total nodes (
              {graph.truncation.pruned_nodes_count} lower-priority nodes pruned to prevent browser saturation).
            </span>
          </div>
          {graph.truncation.pruned_by_type && (
            <div className="flex items-center space-x-2 font-mono text-[11px] text-amber-300">
              {Object.entries(graph.truncation.pruned_by_type).map(([t, count]) => (
                <span key={t} className="bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-800/60">
                  -{count} {t}s
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Graph Toolbar & Legend */}
      <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">
              {graph.summary?.total_nodes ?? graph.nodes.length} Nodes &bull;{' '}
              {graph.summary?.total_edges ?? graph.edges.length} Edges
            </span>
          </div>
          {graph.summary?.highest_severity && (
            <span className="bg-rose-950/60 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded text-[11px] font-mono uppercase">
              Max Sev: {graph.summary.highest_severity}
            </span>
          )}
        </div>

        {/* Node Type Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <span>Attacker IP</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            <span>Threat IOC</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
            <span>Attack / Alert</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Canary Token</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            <span>Incident Case</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
            className="p-1 hover:text-white text-slate-400 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono px-1 text-slate-300">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
            className="p-1 hover:text-white text-slate-400 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1 hover:text-white text-slate-400 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 min-h-[420px] max-h-[600px] overflow-auto bg-[#07090e]">
        <svg
          className="w-full h-full min-w-[960px] min-h-[500px]"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="14"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#475569" />
            </marker>
          </defs>

          {/* Column Category Background Guides */}
          <g opacity="0.3">
            <line x1="80" y1="20" x2="80" y2="480" stroke="#334155" strokeDasharray="4 4" />
            <text x="80" y="25" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
              ENTITIES (IP)
            </text>

            <line x1="280" y1="20" x2="280" y2="480" stroke="#334155" strokeDasharray="4 4" />
            <text x="280" y="25" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
              IOCS / AGENTS
            </text>

            <line x1="480" y1="20" x2="480" y2="480" stroke="#334155" strokeDasharray="4 4" />
            <text x="480" y="25" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
              DETECTIONS / ALERTS
            </text>

            <line x1="680" y1="20" x2="680" y2="480" stroke="#334155" strokeDasharray="4 4" />
            <text x="680" y="25" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
              DECEPTION / CANARY
            </text>

            <line x1="880" y1="20" x2="880" y2="480" stroke="#334155" strokeDasharray="4 4" />
            <text x="880" y="25" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
              INCIDENT CASES
            </text>
          </g>

          {/* Edges */}
          {layoutEdges.map((edge) => {
            const isHighlighted =
              selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
            return (
              <g key={edge.id}>
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={isHighlighted ? '#38bdf8' : '#334155'}
                  strokeWidth={isHighlighted ? 2.5 : 1.2}
                  markerEnd="url(#arrowhead)"
                  opacity={isHighlighted ? 0.95 : 0.6}
                />
                <text
                  x={(edge.x1 + edge.x2) / 2}
                  y={(edge.y1 + edge.y2) / 2 - 4}
                  fill={isHighlighted ? '#7dd3fc' : '#64748b'}
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const colors = getNodeColor(node);
            const truncatedLabel =
              node.label.length > 18 ? `${node.label.substring(0, 16)}...` : node.label;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                <circle
                  r={isSelected ? 18 : 14}
                  fill={colors.bg}
                  stroke={isSelected ? '#38bdf8' : colors.stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
                <text
                  y="26"
                  fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                  fontSize="10"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {truncatedLabel}
                </text>
                <text
                  y="-18"
                  fill="#94a3b8"
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {node.node_type.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Inspector Flyout */}
        {selectedNode && (
          <div className="absolute bottom-3 right-3 w-80 bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur text-xs space-y-2 z-10">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-100">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Node Inspector</span>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                &times;
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Node ID:</span>
                <span className="font-mono text-slate-200 truncate max-w-[180px]">{selectedNode.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="font-mono text-sky-400 uppercase">{selectedNode.node_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Label:</span>
                <span className="font-mono text-slate-200">{selectedNode.label}</span>
              </div>
              {selectedNode.severity && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Severity:</span>
                  <span className="font-mono text-rose-400 uppercase">{selectedNode.severity}</span>
                </div>
              )}
              {selectedNode.stage && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Attack Stage:</span>
                  <span className="font-mono text-amber-400">{selectedNode.stage}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

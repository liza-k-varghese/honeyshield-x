import React, { useState, useMemo } from 'react';
import { AttackGraphResponse, GraphNode, SeverityLevel } from '../types';
import { SeverityBadge } from './Badge';
import {
  Layers,
  Flame,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface AttackChainGraphProps {
  graph: AttackGraphResponse;
  onSelectAttack?: (attackId: number) => void;
}

export const AttackChainGraph: React.FC<AttackChainGraphProps> = ({ graph, onSelectAttack: _onSelectAttack }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Layout calculation for SVG DAG
  const layout = useMemo(() => {
    const nodes = graph.nodes;
    if (!nodes.length) {
      return { positionedNodes: [], edges: [], width: 800, height: 400 };
    }

    // Separate into columns:
    // Column 0: Entity node
    // Column 1..N: Tactic stages ordered chronologically / by stage order
    // Column Last: Alert node(s)
    const entityNodes = nodes.filter((n) => n.type === 'entity');
    const stageNodes = nodes.filter((n) => n.type === 'tactic_stage');
    const alertNodes = nodes.filter((n) => n.type === 'alert');

    // Group stage nodes by unique stage or tactic_id
    const stageColumns: GraphNode[][] = [];
    const seenStages = new Set<string>();

    stageNodes.forEach((node) => {
      const stageKey = node.tactic_id || node.stage;
      if (!seenStages.has(stageKey)) {
        seenStages.add(stageKey);
        stageColumns.push(stageNodes.filter((n) => (n.tactic_id || n.stage) === stageKey));
      }
    });

    // Determine column X positions
    const colWidth = 240;
    const startX = 140;
    const columns: GraphNode[][] = [];

    if (entityNodes.length > 0) {
      columns.push(entityNodes);
    }
    stageColumns.forEach((col) => columns.push(col));
    if (alertNodes.length > 0) {
      columns.push(alertNodes);
    }

    const totalCols = Math.max(columns.length, 1);
    const width = Math.max(860, startX + totalCols * colWidth + 80);

    // Calculate (x, y) coordinates for each node
    const nodeCoords = new Map<string, { x: number; y: number; node: GraphNode }>();
    let maxColHeight = 360;

    columns.forEach((col, colIdx) => {
      const x = startX + colIdx * colWidth;
      const count = col.length;
      const colHeight = Math.max(count * 130 + 100, 360);
      if (colHeight > maxColHeight) maxColHeight = colHeight;

      col.forEach((node, rowIdx) => {
        const y = 90 + rowIdx * 130 + (count === 1 ? 40 : 0);
        nodeCoords.set(node.id, { x, y, node });
      });
    });

    const height = Math.max(maxColHeight, 420);

    const positionedNodes = Array.from(nodeCoords.values());

    // Connect edges with coordinates
    const edgesWithCoords = graph.edges
      .map((edge) => {
        const sourceCoord = nodeCoords.get(edge.source);
        const targetCoord = nodeCoords.get(edge.target);
        if (!sourceCoord || !targetCoord) return null;
        return {
          ...edge,
          x1: sourceCoord.x,
          y1: sourceCoord.y,
          x2: targetCoord.x,
          y2: targetCoord.y,
        };
      })
      .filter(Boolean) as Array<
      (typeof graph.edges)[0] & { x1: number; y1: number; x2: number; y2: number }
    >;

    return {
      positionedNodes,
      edges: edgesWithCoords,
      width,
      height,
    };
  }, [graph]);

  const selectedNode = useMemo(() => {
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graph, selectedNodeId]);

  return (
    <div className="space-y-4">
      {/* Graph Summary Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg">
        <div className="flex flex-col">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Stages Observed</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-lg font-bold font-mono text-white">
              {graph.summary.stages_observed}
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Total Evidence</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-bold font-mono text-white">
              {graph.summary.total_events} events
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Execution Reached</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            {graph.summary.has_execution ? (
              <>
                <Flame className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-xs font-semibold text-red-400">TA0002 Active</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">No Execution</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Max Severity</span>
          <div className="mt-1">
            <SeverityBadge severity={graph.summary.highest_severity as SeverityLevel} />
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Risk Level</span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-white">
              {graph.summary.risk_score.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>
      </div>

      {/* SVG DAG Visualizer Canvas */}
      <div className="relative border border-slate-800 rounded-lg bg-slate-950/90 overflow-x-auto shadow-inner">
        <svg
          width={layout.width}
          height={layout.height}
          className="select-none min-w-full block"
        >
          <defs>
            {/* Arrow Marker */}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="18"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#475569" />
            </marker>
            <marker
              id="arrowhead-highlight"
              markerWidth="8"
              markerHeight="8"
              refX="18"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#38bdf8" />
            </marker>

            {/* Gradients */}
            <linearGradient id="entityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="stageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="alertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#450a0a" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Background Grid Pattern */}
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#334155" opacity="0.3" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Directed Edges */}
          {layout.edges.map((edge) => {
            const isConnectedToSelected =
              selectedNodeId &&
              (edge.source === selectedNodeId || edge.target === selectedNodeId);

            // Compute bezier curve
            const dx = edge.x2 - edge.x1;
            const cx1 = edge.x1 + dx * 0.45;
            const cx2 = edge.x2 - dx * 0.45;
            const pathData = `M ${edge.x1} ${edge.y1} C ${cx1} ${edge.y1}, ${cx2} ${edge.y2}, ${edge.x2} ${edge.y2}`;

            const midX = (edge.x1 + edge.x2) / 2;
            const midY = (edge.y1 + edge.y2) / 2 - 10;

            return (
              <g key={edge.id} className="transition-opacity duration-200">
                <path
                  d={pathData}
                  fill="none"
                  stroke={isConnectedToSelected ? '#38bdf8' : '#334155'}
                  strokeWidth={isConnectedToSelected ? '2.5' : '1.75'}
                  strokeDasharray={edge.transition_type === 'impact' ? '4 3' : undefined}
                  markerEnd={isConnectedToSelected ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
                />
                {edge.label && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-45"
                      y="-9"
                      width="90"
                      height="18"
                      rx="4"
                      fill="#020617"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      y="3.5"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {edge.label.length > 14 ? edge.label.substring(0, 14) + '..' : edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Graph Nodes */}
          {layout.positionedNodes.map(({ x, y, node }) => {
            const isSelected = selectedNodeId === node.id;
            const isEntity = node.type === 'entity';
            const isAlert = node.type === 'alert';

            let borderColor = '#38bdf8';
            if (node.severity === 'critical') borderColor = '#ef4444';
            else if (node.severity === 'high') borderColor = '#f97316';
            else if (node.severity === 'medium') borderColor = '#f59e0b';
            else if (isEntity) borderColor = '#0ea5e9';

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                className="cursor-pointer group"
              >
                {/* Node Box */}
                <rect
                  x="-85"
                  y="-35"
                  width="170"
                  height="70"
                  rx="10"
                  fill={isEntity ? 'url(#entityGrad)' : isAlert ? 'url(#alertGrad)' : 'url(#stageGrad)'}
                  stroke={isSelected ? '#38bdf8' : borderColor}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  className="transition-all duration-150 group-hover:brightness-125"
                />

                {/* Node Type Indicator */}
                <circle
                  cx="-65"
                  cy="-15"
                  r="6"
                  fill={borderColor}
                  className="group-hover:scale-110 transition-transform"
                />

                {/* Node Stage / Tactic Tag */}
                <text
                  x="-50"
                  y="-11"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.tactic_id || (isEntity ? 'ENTITY' : isAlert ? 'ALERT' : node.stage)}
                </text>

                {/* Node Main Label */}
                <text
                  x="-80"
                  y="8"
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="system-ui"
                >
                  {node.label.length > 20 ? node.label.substring(0, 19) + '…' : node.label}
                </text>

                {/* Technique / Evidence Subtitle */}
                <text
                  x="-80"
                  y="24"
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {node.technique_id
                    ? `${node.technique_id} (${node.event_count} ev)`
                    : node.event_count > 0
                    ? `${node.event_count} events`
                    : node.severity.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Empty State */}
        {layout.positionedNodes.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">
            No attack-chain graph data available for this entity.
          </div>
        )}
      </div>

      {/* Selected Node Inspection Drawer */}
      {selectedNode && (
        <div className="p-4 rounded-lg bg-slate-900 border border-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded">
                Node: {selectedNode.type}
              </span>
              <h4 className="text-sm font-semibold text-white">{selectedNode.label}</h4>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 font-mono">Stage:</span>
              <div className="text-slate-200 font-medium mt-0.5">{selectedNode.stage}</div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 font-mono">MITRE Technique:</span>
              <div className="text-slate-200 font-medium mt-0.5">
                {selectedNode.technique_id
                  ? `${selectedNode.technique_id} - ${selectedNode.technique_name}`
                  : 'N/A'}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 font-mono">Evidence Count:</span>
              <div className="text-slate-200 font-medium mt-0.5">
                {selectedNode.event_count} events
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 font-mono">Severity:</span>
              <div className="mt-0.5">
                <SeverityBadge severity={selectedNode.severity as SeverityLevel} />
              </div>
            </div>
          </div>

          {selectedNode.evidence_ids && selectedNode.evidence_ids.length > 0 && (
            <div className="text-xs font-mono text-slate-400">
              <span className="text-slate-500">Evidence Event IDs: </span>
              {selectedNode.evidence_ids.join(', ')}
            </div>
          )}

          {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
            <div className="text-xs font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block mb-1">Metadata:</span>
              <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedNode.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

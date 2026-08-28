import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { InvestigationGraph, GraphNode, WalletCategory } from '@rt-cfas/types';

// Register dagre layout extension
cytoscape.use(dagre);

interface GraphVisualizerProps {
  graph: InvestigationGraph;
  rootWalletAddress?: string;
  selectedBranchId?: string;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ graph, rootWalletAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; type: string; label?: string; isFanOut?: boolean; isFanIn?: boolean; walletCategory?: WalletCategory; hopVelocitySec?: number } | null>(null);
  const [layoutMode, setLayoutMode] = useState<'breadthfirst' | 'dagre'>('breadthfirst');

  // P1-A: Human-readable wallet category badge config
  const CATEGORY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    burner:       { label: '🔥 Burner Wallet',    bg: '#431407', color: '#fb923c' },
    intermediary: { label: '⚡ Intermediary',      bg: '#1c1917', color: '#fbbf24' },
    aggregator:   { label: '🔀 Aggregator',        bg: '#1e1b4b', color: '#818cf8' },
    exchange:     { label: '🏦 Exchange',           bg: '#064e3b', color: '#10b981' },
    root:         { label: '🎯 Suspect Wallet',     bg: '#451a1a', color: '#ef4444' },
    unknown:      { label: '❓ Unknown',             bg: '#0f172a', color: '#94a3b8' },
  };

  useEffect(() => {
    if (!containerRef.current || !graph) return;

    // Convert nodes & edges to Cytoscape format
    const cyElements: cytoscape.ElementDefinition[] = [];

    // Nodes
    graph.nodes.forEach((node) => {
      const isRoot = rootWalletAddress && node.id.toLowerCase() === rootWalletAddress.toLowerCase();
      const isExchange = node.type === 'exchange';
      const isFanOut = Boolean(node.isFanOut);
      const isFanIn = Boolean(node.isFanIn);

      let labelText = node.label || `${node.id.substring(0, 6)}...${node.id.substring(38)}`;
      if (isRoot) labelText = `[ROOT]\n${labelText}`;

      let nodeType = isExchange ? 'exchange' : isRoot ? 'root' : isFanOut ? 'fanout' : isFanIn ? 'fanin' : 'wallet';

      // P1-A: Append category hint to node label
      const cat = isRoot ? 'root' : (node.walletCategory || (isExchange ? 'exchange' : 'unknown'));
      const catLabel = cat === 'burner' ? '🔥 Burner' : cat === 'intermediary' ? '⚡ Intermed.' : cat === 'aggregator' ? '🔀 Aggregator' : cat === 'exchange' ? '🏦 Exchange' : cat === 'root' ? '🎯 Suspect' : '';
      if (catLabel && !isRoot && !isExchange) {
        labelText += `\n${catLabel}`;
      }

      cyElements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: labelText,
          nodeType,
          exchangeName: node.label,
          fullAddress: node.id,
          isFanOut,
          isFanIn,
          taintedAmountUsd: node.taintedAmountUsd,
          walletCategory: cat,
          hopVelocitySec: node.hopVelocitySec,
        },
      });
    });

    // Edges
    graph.edges.forEach((edge, index) => {
      let edgeLabel = `${edge.amountEth} ETH`;
      if (edge.tokenSymbol && edge.tokenSymbol !== 'ETH') {
        edgeLabel = edge.usdValue ? `$${edge.usdValue.toLocaleString()} ${edge.tokenSymbol}` : `${edge.tokenSymbol}`;
      }
      if (edge.taintPercentage !== undefined) {
        edgeLabel += ` (${edge.taintPercentage}%)`;
      }

      cyElements.push({
        group: 'edges',
        data: {
          id: `edge_${index}`,
          source: edge.from,
          target: edge.to,
          label: edgeLabel,
          txHash: edge.txHash,
          timestamp: edge.timestamp,
        },
      });
    });

    // Initialize Cytoscape Instance
    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1e293b',
            color: '#f8fafc',
            label: 'data(label)',
            'font-size': '11px',
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 36,
            height: 36,
            'border-width': 2,
            'border-color': '#06b6d4',
          },
        },
        {
          selector: 'node[nodeType = "root"]',
          style: {
            'background-color': '#451a1a',
            'border-color': '#ef4444',
            'border-width': 3,
            width: 44,
            height: 44,
          },
        },
        {
          selector: 'node[nodeType = "exchange"]',
          style: {
            'background-color': '#064e3b',
            'border-color': '#10b981',
            'border-width': 3,
            width: 44,
            height: 44,
          },
        },
        {
          selector: 'node[nodeType = "fanout"]',
          style: {
            'background-color': '#3b0764',
            'border-color': '#c084fc',
            'border-width': 3,
            width: 40,
            height: 40,
          },
        },
        {
          selector: 'node[nodeType = "fanin"]',
          style: {
            'background-color': '#1e1b4b',
            'border-color': '#818cf8',
            'border-width': 3,
            width: 40,
            height: 40,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            color: '#38bdf8',
            'font-size': '10px',
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.8,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
          },
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#f59e0b',
            'border-width': 4,
          },
        },
      ],
      layout: (layoutMode === 'breadthfirst'
        ? {
            name: 'breadthfirst',
            directed: true,
            padding: 30,
            spacingFactor: 1.25,
            avoidOverlap: true,
          }
        : {
            name: 'dagre',
            rankDir: 'LR',
            nodeSep: 60,
            rankSep: 100,
          }) as any,
    });

    // Handle node selection
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode({
        id: node.data('fullAddress'),
        type: node.data('nodeType'),
        label: node.data('exchangeName'),
        isFanOut: node.data('isFanOut'),
        isFanIn: node.data('isFanIn'),
        walletCategory: node.data('walletCategory'),
        hopVelocitySec: node.data('hopVelocitySec'),
      });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graph, rootWalletAddress, layoutMode]);

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Visual Canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '420px',
          background: '#090d16',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      />

      {/* Control Buttons */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setLayoutMode(layoutMode === 'breadthfirst' ? 'dagre' : 'breadthfirst')}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {layoutMode === 'breadthfirst' ? '🌳 Tree Layout (BF)' : '➡️ Horizontal DAG'}
        </button>
        <button
          onClick={handleFit}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          🔍 Recenter Graph
        </button>
      </div>

      {/* Node Legend */}
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10, display: 'flex', gap: '0.6rem', fontSize: '0.75rem', background: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #334155' }}>
        <span>🔴 Root Wallet</span>
        <span>🟢 Exchange</span>
        <span>🟣 Fan-Out Splitting</span>
        <span>🔵 Fan-In Convergence</span>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div
          style={{
            marginTop: '0.8rem',
            padding: '0.8rem 1rem',
            background: '#1e293b',
            borderRadius: '6px',
            border: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
          }}
        >
        <div>
            <strong>Selected Node:</strong>{' '}
            <span className="code-badge" style={{ color: 'var(--accent-cyan)' }}>
              {selectedNode.id}
            </span>{' '}
            {/* P1-A: Wallet category badge */}
            {(() => {
              const cat = selectedNode.walletCategory || (selectedNode.type === 'exchange' ? 'exchange' : selectedNode.type === 'root' ? 'root' : 'unknown');
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['unknown'];
              return (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: cfg.bg,
                    color: cfg.color,
                    letterSpacing: '0.02em',
                  }}
                >
                  {cfg.label}
                </span>
              );
            })()}
            {/* P1-A: Hop velocity badge */}
            {selectedNode.hopVelocitySec !== undefined && selectedNode.type !== 'root' && selectedNode.type !== 'exchange' && (
              <span
                style={{
                  marginLeft: '0.4rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: selectedNode.hopVelocitySec < 60 ? '#7f1d1d' : selectedNode.hopVelocitySec < 300 ? '#78350f' : '#0f172a',
                  color: selectedNode.hopVelocitySec < 60 ? '#fca5a5' : selectedNode.hopVelocitySec < 300 ? '#fcd34d' : '#94a3b8',
                }}
              >
                ⏱ Forwarded in {selectedNode.hopVelocitySec < 60 ? `${selectedNode.hopVelocitySec}s` : `${Math.round(selectedNode.hopVelocitySec / 60)}min`}
              </span>
            )}
          </div>

          <a
            href={`https://etherscan.io/address/${selectedNode.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
          >
            View on Etherscan ↗
          </a>
        </div>
      )}
    </div>
  );
};

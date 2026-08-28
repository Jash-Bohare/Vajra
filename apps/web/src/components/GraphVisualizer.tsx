import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { InvestigationGraph, WalletCategory } from '@rt-cfas/types';

cytoscape.use(dagre);

interface GraphVisualizerProps {
  graph: InvestigationGraph;
  rootWalletAddress?: string;
  selectedBranchId?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  burner:       { label: 'Burner Wallet',   bg: '#431407', color: '#fb923c' },
  intermediary: { label: 'Intermediary',    bg: '#1c1917', color: '#fbbf24' },
  aggregator:   { label: 'Aggregator',      bg: '#1e1b4b', color: '#818cf8' },
  exchange:     { label: 'Exchange',        bg: '#064e3b', color: '#10b981' },
  root:         { label: 'Suspect Wallet',  bg: '#451a1a', color: '#ef4444' },
  unknown:      { label: 'Unknown',         bg: '#0f172a', color: '#94a3b8' },
};

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ graph, rootWalletAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    type: string;
    label?: string;
    isFanOut?: boolean;
    isFanIn?: boolean;
    walletCategory?: WalletCategory;
    hopVelocitySec?: number;
    taintedAmountUsd?: number;
  } | null>(null);
  const [layoutMode, setLayoutMode] = useState<'breadthfirst' | 'dagre'>('breadthfirst');

  useEffect(() => {
    if (!containerRef.current || !graph) return;

    const cyElements: cytoscape.ElementDefinition[] = [];

    graph.nodes.forEach((node) => {
      const isRoot = !!(rootWalletAddress && node.id.toLowerCase() === rootWalletAddress.toLowerCase());
      const isExchange = node.type === 'exchange';
      const isFanOut = Boolean(node.isFanOut);
      const isFanIn = Boolean(node.isFanIn);

      const shortAddr = node.id.substring(0, 6) + '...' + node.id.substring(38);
      let labelText = isExchange ? (node.label || shortAddr) : shortAddr;
      if (isRoot) labelText = '[ROOT]\n' + shortAddr;

      const nodeType = isExchange ? 'exchange' : isRoot ? 'root' : isFanOut ? 'fanout' : isFanIn ? 'fanin' : 'wallet';
      const cat: WalletCategory = isRoot ? 'root' : (node.walletCategory || (isExchange ? 'exchange' : 'unknown'));

      if (!isRoot && !isExchange && cat !== 'unknown') {
        const catShort = cat === 'burner' ? 'Burner' : cat === 'intermediary' ? 'Intermed.' : cat === 'aggregator' ? 'Aggregat.' : '';
        if (catShort) labelText = labelText + '\n' + catShort;
      }

      cyElements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: labelText,
          nodeType,
          displayLabel: node.label,
          fullAddress: node.id,
          isFanOut,
          isFanIn,
          taintedAmountUsd: node.taintedAmountUsd,
          walletCategory: cat,
          hopVelocitySec: node.hopVelocitySec,
        },
      });
    });

    graph.edges.forEach((edge, index) => {
      let edgeLabel = edge.amountEth > 0 ? (edge.amountEth.toFixed(4) + ' ETH') : '';
      if (edge.tokenSymbol && edge.tokenSymbol !== 'ETH') {
        edgeLabel = edge.usdValue ? ('$' + edge.usdValue.toLocaleString() + ' ' + edge.tokenSymbol) : edge.tokenSymbol;
      }
      if (edge.taintPercentage !== undefined) {
        edgeLabel = edgeLabel + ' (' + edge.taintPercentage + '%)';
      }
      cyElements.push({
        group: 'edges',
        data: { id: 'edge_' + index, source: edge.from, target: edge.to, label: edgeLabel, txHash: edge.txHash },
      });
    });

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
            'font-size': '10px',
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            width: 38,
            height: 38,
            'border-width': 2,
            'border-color': '#06b6d4',
          } as any,
        },
        { selector: 'node[nodeType = "root"]',     style: { 'background-color': '#451a1a', 'border-color': '#ef4444', 'border-width': 3, width: 46, height: 46 } as any },
        { selector: 'node[nodeType = "exchange"]', style: { 'background-color': '#064e3b', 'border-color': '#10b981', 'border-width': 3, width: 46, height: 46 } as any },
        { selector: 'node[nodeType = "fanout"]',   style: { 'background-color': '#3b0764', 'border-color': '#c084fc', 'border-width': 3, width: 42, height: 42 } as any },
        { selector: 'node[nodeType = "fanin"]',    style: { 'background-color': '#1e1b4b', 'border-color': '#818cf8', 'border-width': 3, width: 42, height: 42 } as any },
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
            'font-size': '9px',
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          } as any,
        },
        { selector: ':selected', style: { 'border-color': '#f59e0b', 'border-width': 4 } as any },
      ],
      layout: (layoutMode === 'breadthfirst'
        ? { name: 'breadthfirst', directed: true, padding: 40, spacingFactor: 1.3, avoidOverlap: true }
        : { name: 'dagre', rankDir: 'LR', nodeSep: 70, rankSep: 120 }) as any,
    });

    cy.on('tap', 'node', (evt) => {
      const n = evt.target;
      setSelectedNode({
        id: n.data('fullAddress'),
        type: n.data('nodeType'),
        label: n.data('displayLabel'),
        isFanOut: n.data('isFanOut'),
        isFanIn: n.data('isFanIn'),
        walletCategory: n.data('walletCategory'),
        hopVelocitySec: n.data('hopVelocitySec'),
        taintedAmountUsd: n.data('taintedAmountUsd'),
      });
    });
    cy.on('tap', (evt) => { if (evt.target === cy) setSelectedNode(null); });

    cyRef.current = cy;
    return () => { cy.destroy(); };
  }, [graph, rootWalletAddress, layoutMode]);

  const handleFit = () => { if (cyRef.current) { cyRef.current.fit(); cyRef.current.center(); } };

  const selCat = selectedNode
    ? (selectedNode.walletCategory || (selectedNode.type === 'exchange' ? 'exchange' : selectedNode.type === 'root' ? 'root' : 'unknown'))
    : null;
  const selCfg = selCat ? (CATEGORY_CONFIG[selCat] || CATEGORY_CONFIG['unknown']) : null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <div
          ref={containerRef}
          style={{ width: '100%', height: '480px', background: '#090d16', borderRadius: '8px', border: '1px solid var(--border-color)' }}
        />

        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setLayoutMode(layoutMode === 'breadthfirst' ? 'dagre' : 'breadthfirst')}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {layoutMode === 'breadthfirst' ? 'Switch to DAG' : 'Switch to Tree'}
          </button>
          <button
            onClick={handleFit}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Fit Graph
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.72rem', background: 'rgba(15,23,42,0.92)', padding: '0.4rem 0.7rem', borderRadius: '6px', border: '1px solid #334155', maxWidth: '400px' }}>
          <span style={{ color: '#ef4444' }}>Root Suspect</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ color: '#10b981' }}>Exchange</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ color: '#c084fc' }}>Fan-Out</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ color: '#818cf8' }}>Fan-In</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ color: '#fb923c' }}>Burner</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ color: '#fbbf24' }}>Intermediary</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ color: '#818cf8' }}>Aggregator</span>
        </div>
      </div>

      {selectedNode && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '1rem',
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid ' + (selCfg ? selCfg.color : '#334155'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Selected Node:
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                color: 'var(--accent-cyan)',
                background: '#0d1b2a',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #1e3a52',
                wordBreak: 'break-all',
              }}
            >
              {selectedNode.id}
            </span>

            {selCfg && (
              <span
                style={{
                  padding: '0.2rem 0.7rem',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: selCfg.bg,
                  color: selCfg.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {selCfg.label}
              </span>
            )}

            {selectedNode.type === 'exchange' && selectedNode.label && (
              <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                {selectedNode.label}
              </span>
            )}

            {selectedNode.hopVelocitySec !== undefined && selectedNode.type !== 'root' && selectedNode.type !== 'exchange' && (
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.77rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: selectedNode.hopVelocitySec < 60 ? '#7f1d1d' : selectedNode.hopVelocitySec < 300 ? '#78350f' : '#1e293b',
                  color: selectedNode.hopVelocitySec < 60 ? '#fca5a5' : selectedNode.hopVelocitySec < 300 ? '#fcd34d' : '#94a3b8',
                }}
              >
                {selectedNode.hopVelocitySec < 60
                  ? 'Forwarded in ' + selectedNode.hopVelocitySec + 's'
                  : selectedNode.hopVelocitySec < 3600
                  ? 'Forwarded in ' + Math.round(selectedNode.hopVelocitySec / 60) + 'min'
                  : 'Forwarded in ' + (selectedNode.hopVelocitySec / 3600).toFixed(1) + 'hr'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {selectedNode.taintedAmountUsd !== undefined && selectedNode.taintedAmountUsd > 0 && (
                <span>
                  Tainted Funds:{' '}
                  <strong style={{ color: '#10b981' }}>
                    ${selectedNode.taintedAmountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                  </strong>
                </span>
              )}
              <span>
                Pattern:{' '}
                <strong style={{ color: selCfg ? selCfg.color : '#94a3b8' }}>
                  {selectedNode.isFanOut
                    ? 'Fan-Out (Splitting)'
                    : selectedNode.isFanIn
                    ? 'Fan-In (Convergence)'
                    : selectedNode.type === 'exchange'
                    ? 'VASP Deposit Address'
                    : selectedNode.type === 'root'
                    ? 'Suspect Wallet (Root)'
                    : 'Single-Path Transfer'}
                </strong>
              </span>
            </div>
            <a
              href={'https://etherscan.io/address/' + selectedNode.id}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              View on Etherscan
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

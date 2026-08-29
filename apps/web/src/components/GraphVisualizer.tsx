import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { InvestigationGraph, WalletCategory } from '@rt-cfas/types';

cytoscape.use(dagre);

interface GraphVisualizerProps {
  graph: InvestigationGraph;
  rootWalletAddress?: string;
  selectedBranchId?: string;
  selectedBranch?: any;
  onClearBranchSelection?: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  burner:       { label: '🔥 Burner Wallet',   bg: '#431407', color: '#f97316' },
  intermediary: { label: '⚡ Intermediary',     bg: '#0f172a', color: '#38bdf8' },
  aggregator:   { label: '🔀 Aggregator',       bg: '#1e1b4b', color: '#a855f7' },
  exchange:     { label: '🏦 Exchange',          bg: '#064e3b', color: '#10b981' },
  root:         { label: '🎯 Suspect Wallet',    bg: '#451a1a', color: '#ef4444' },
  unknown:      { label: '❓ Unknown',            bg: '#0f172a', color: '#94a3b8' },
};

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  graph,
  rootWalletAddress,
  selectedBranchId,
  selectedBranch,
  onClearBranchSelection,
}) => {
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

  // Initialize Cytoscape
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

      let cat: WalletCategory = 'intermediary';
      if (isRoot) {
        cat = 'root';
      } else if (isExchange) {
        cat = 'exchange';
      } else if (node.walletCategory) {
        cat = node.walletCategory;
      } else if (isFanIn) {
        cat = 'aggregator';
      } else if (node.hopVelocitySec !== undefined && node.hopVelocitySec < 300) {
        cat = 'intermediary';
      } else {
        cat = 'burner';
      }

      if (!isRoot && !isExchange) {
        const catShort = cat === 'burner' ? '🔥 Burner' : cat === 'aggregator' ? '🔀 Aggregator' : '⚡ Intermed.';
        labelText = labelText + '\n' + catShort;
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
        data: {
          id: 'edge_' + index,
          source: edge.from,
          target: edge.to,
          label: edgeLabel,
          txHash: edge.txHash,
          fromAddr: edge.from.toLowerCase(),
          toAddr: edge.to.toLowerCase(),
        },
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#0f172a',
            'border-color': '#38bdf8',
            color: '#f8fafc',
            label: 'data(label)',
            'font-size': '10px',
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            width: 40,
            height: 40,
            'border-width': 3,
            transition: 'opacity 0.3s ease, border-width 0.3s ease',
          } as any,
        },
        { selector: 'node[walletCategory = "root"]',         style: { 'background-color': '#451a1a', 'border-color': '#ef4444', 'border-width': 3, width: 46, height: 46 } as any },
        { selector: 'node[walletCategory = "exchange"]',     style: { 'background-color': '#064e3b', 'border-color': '#10b981', 'border-width': 3, width: 46, height: 46 } as any },
        { selector: 'node[walletCategory = "intermediary"]', style: { 'background-color': '#0f172a', 'border-color': '#38bdf8', 'border-width': 3, width: 40, height: 40 } as any },
        { selector: 'node[walletCategory = "burner"]',       style: { 'background-color': '#431407', 'border-color': '#f97316', 'border-width': 3, width: 40, height: 40 } as any },
        { selector: 'node[walletCategory = "aggregator"]',   style: { 'background-color': '#1e1b4b', 'border-color': '#a855f7', 'border-width': 3, width: 42, height: 42 } as any },
        { selector: 'node[nodeType = "root"]',              style: { 'background-color': '#451a1a', 'border-color': '#ef4444', 'border-width': 3, width: 46, height: 46 } as any },
        { selector: 'node[nodeType = "exchange"]',          style: { 'background-color': '#064e3b', 'border-color': '#10b981', 'border-width': 3, width: 46, height: 46 } as any },
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
            transition: 'opacity 0.3s ease, width 0.3s ease',
          } as any,
        },
        { selector: ':selected', style: { 'border-color': '#facc15', 'border-width': 5, 'border-opacity': 1 } as any },
        // Focused branch highlights
        {
          selector: 'node.branch-highlighted',
          style: {
            opacity: 1.0,
            'border-width': 4,
            'z-index': 100,
          } as any,
        },
        {
          selector: 'edge.branch-highlighted',
          style: {
            opacity: 1.0,
            width: 4,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'z-index': 100,
            color: '#7dd3fc',
            'font-weight': 'bold',
          } as any,
        },
        // Dimmed / blurred non-focused branches
        {
          selector: '.dimmed',
          style: {
            opacity: 0.15,
            'text-opacity': 0.15,
          } as any,
        },
        {
          selector: 'edge.dimmed',
          style: {
            opacity: 0.1,
            'line-opacity': 0.1,
            'text-opacity': 0.1,
          } as any,
        },
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

  // Handle Branch Focus & Background Blur
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!selectedBranch || !selectedBranch.hops || selectedBranch.hops.length === 0) {
      // Clear all focus / dimming classes
      cy.batch(() => {
        cy.elements().removeClass('dimmed branch-highlighted');
      });
      return;
    }

    const branchHops = selectedBranch.hops || [];
    const activeAddrs = new Set<string>();
    const activeTxHashes = new Set<string>();

    if (rootWalletAddress) {
      activeAddrs.add(rootWalletAddress.toLowerCase());
    }

    branchHops.forEach((h: any) => {
      const from = (h.fromAddress || '').toLowerCase();
      const to = (h.toAddress || '').toLowerCase();
      if (from) activeAddrs.add(from);
      if (to) activeAddrs.add(to);
      if (h.txHash) activeTxHashes.add(h.txHash.toLowerCase());
    });

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const fullAddr = (node.data('fullAddress') || node.id() || '').toLowerCase();
        if (activeAddrs.has(fullAddr)) {
          node.removeClass('dimmed').addClass('branch-highlighted');
        } else {
          node.removeClass('branch-highlighted').addClass('dimmed');
        }
      });

      cy.edges().forEach((edge) => {
        const edgeTx = (edge.data('txHash') || '').toLowerCase();
        if (activeTxHashes.has(edgeTx)) {
          edge.removeClass('dimmed').addClass('branch-highlighted');
        } else {
          edge.removeClass('branch-highlighted').addClass('dimmed');
        }
      });
    });
  }, [selectedBranch, selectedBranchId, rootWalletAddress]);

  const handleFit = () => { if (cyRef.current) { cyRef.current.fit(); cyRef.current.center(); } };

  const selCat = selectedNode
    ? (selectedNode.walletCategory || (selectedNode.type === 'exchange' ? 'exchange' : selectedNode.type === 'root' ? 'root' : 'intermediary'))
    : null;
  const selCfg = selCat ? (CATEGORY_CONFIG[selCat] || CATEGORY_CONFIG['intermediary']) : null;

  return (
    <div style={{ width: '100%' }}>
      {/* Branch Active Filter Banner above Graph */}
      {selectedBranch && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(90deg, #1e293b, #0f172a)',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            marginBottom: '0.6rem',
            border: '1px solid #38bdf8',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
              🌿 Highlighting {selectedBranch.branchId}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              ({selectedBranch.hopCount} hops  •  {selectedBranch.taintPercentage}% taint share  •  Other branches dimmed)
            </span>
          </div>
          {onClearBranchSelection && (
            <button
              onClick={onClearBranchSelection}
              style={{
                background: '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ✕ Show All Graph Paths
            </button>
          )}
        </div>
      )}

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

        {/* Bottom-left Legend: High Contrast Palette */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(15,23,42,0.95)', padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>🔴 Root Suspect</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 Exchange Deposit</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>⚡ Intermediary Wallet</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>🔥 Burner Wallet</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>🔀 Aggregator Wallet</span>
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

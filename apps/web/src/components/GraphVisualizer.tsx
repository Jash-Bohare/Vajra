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
  burner:       { label: 'Burner Wallet',      bg: '#431407', color: '#f97316' },
  intermediary: { label: 'Intermediary',        bg: '#0f172a', color: '#38bdf8' },
  aggregator:   { label: 'Aggregator',          bg: '#1e1b4b', color: '#a855f7' },
  exchange:     { label: 'Exchange Deposit',    bg: '#064e3b', color: '#10b981' },
  root:         { label: 'Suspect Wallet',      bg: '#451a1a', color: '#ef4444' },
  unknown:      { label: 'Unknown',             bg: '#0f172a', color: '#94a3b8' },
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
    outDegree?: number;
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
        const catShort = cat === 'burner' ? 'Burner' : cat === 'aggregator' ? 'Aggregator' : 'Intermediary';
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
            'border-width': 2,
            width: 38,
            height: 38,
          } as any,
        },
        {
          selector: 'node[nodeType = "root"]',
          style: {
            'background-color': '#451a1a',
            'border-color': '#ef4444',
            'border-width': 3,
            width: 44,
            height: 44,
          } as any,
        },
        {
          selector: 'node[nodeType = "exchange"]',
          style: {
            'background-color': '#064e3b',
            'border-color': '#10b981',
            'border-width': 3,
            width: 44,
            height: 44,
          } as any,
        },
        {
          selector: 'node[walletCategory = "burner"]',
          style: {
            'background-color': '#431407',
            'border-color': '#f97316',
          } as any,
        },
        {
          selector: 'node[walletCategory = "aggregator"]',
          style: {
            'background-color': '#1e1b4b',
            'border-color': '#a855f7',
          } as any,
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#0284c7',
            'target-arrow-color': '#0284c7',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '9px',
            'font-family': 'JetBrains Mono, monospace',
            'text-background-color': '#090d16',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            color: '#7dd3fc',
            'text-rotation': 'autorotate',
          } as any,
        },
        { selector: ':selected', style: { 'border-color': '#facc15', 'border-width': 5, 'border-opacity': 1 } as any },
        // Branch Highlight Styles
        {
          selector: 'node.branch-highlighted',
          style: {
            'border-width': 4,
            'border-color': '#38bdf8',
            'shadow-blur': 15,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.8,
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
      const outDegree = n.outgoers('edge').length;
      setSelectedNode({
        id: n.data('fullAddress'),
        type: n.data('nodeType'),
        label: n.data('displayLabel'),
        isFanOut: n.data('isFanOut'),
        isFanIn: n.data('isFanIn'),
        walletCategory: n.data('walletCategory'),
        hopVelocitySec: n.data('hopVelocitySec'),
        taintedAmountUsd: n.data('taintedAmountUsd'),
        outDegree,
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
      if (h.fromAddress) activeAddrs.add(h.fromAddress.toLowerCase());
      if (h.toAddress) activeAddrs.add(h.toAddress.toLowerCase());
      if (h.txHash) activeTxHashes.add(h.txHash.toLowerCase());
    });

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const addr = (node.data('fullAddress') || node.id()).toLowerCase();
        if (activeAddrs.has(addr)) {
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
            background: '#0c2340',
            border: '1px solid #0284c7',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            marginBottom: '0.8rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
              Highlighting {selectedBranch.branchId}
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
              Show All Paths
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

        {/* Bottom-left Legend: Professional Palette */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(15,23,42,0.95)', padding: '0.45rem 0.8rem', borderRadius: '6px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>● Suspect Wallet</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>● Exchange Deposit</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>● Intermediary</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>● Burner Wallet</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>● Aggregator</span>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div
          style={{
            marginTop: '0.8rem',
            padding: '0.8rem 1.2rem',
            background: '#090d16',
            borderRadius: '8px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Selected Node:</span>
            <span
              className="code-badge"
              style={{
                fontSize: '0.82rem',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                padding: '0.2rem 0.5rem',
                background: '#0f172a',
                borderRadius: '4px',
              }}
            >
              {selectedNode.id}
            </span>

            {/* Wallet Category Badge */}
            {selCfg && (
              <span
                style={{
                  background: selCfg.bg,
                  color: selCfg.color,
                  border: `1px solid ${selCfg.color}40`,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {selCfg.label}
              </span>
            )}

            {/* VASP Label Pill */}
            {selectedNode.type === 'exchange' && selectedNode.label && (
              <span
                style={{
                  background: '#064e3b',
                  color: '#10b981',
                  border: '1px solid #047857',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                }}
              >
                {selectedNode.label}
              </span>
            )}

            {/* Comprehensive Forwarding Velocity & Terminal Status Badge */}
            {selectedNode.type === 'root' ? (
              selectedNode.hopVelocitySec !== undefined ? (
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
                    ? 'Dispersed in ' + selectedNode.hopVelocitySec + 's'
                    : selectedNode.hopVelocitySec < 3600
                    ? 'Dispersed in ' + Math.round(selectedNode.hopVelocitySec / 60) + 'min'
                    : 'Dispersed in ' + (selectedNode.hopVelocitySec / 3600).toFixed(1) + 'hr'}
                </span>
              ) : (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.77rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: '#451a1a',
                    color: '#fca5a5',
                  }}
                >
                  Origin Suspect Wallet
                </span>
              )
            ) : selectedNode.outDegree && selectedNode.outDegree > 0 ? (
              selectedNode.hopVelocitySec !== undefined ? (
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
              ) : (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.77rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: '#1e293b',
                    color: '#94a3b8',
                  }}
                >
                  Forwarding Intermediary
                </span>
              )
            ) : selectedNode.type === 'exchange' ? (
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.77rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: '#064e3b',
                  color: '#86efac',
                }}
              >
                Terminal VASP Deposit Point
              </span>
            ) : (
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.77rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: '#1e293b',
                  color: '#94a3b8',
                }}
              >
                Funds Currently Held Here
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

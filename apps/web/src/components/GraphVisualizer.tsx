import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { InvestigationGraph, GraphNode } from '@rt-cfas/types';

// Register dagre layout extension
cytoscape.use(dagre);

interface GraphVisualizerProps {
  graph: InvestigationGraph;
  rootWalletAddress?: string;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ graph, rootWalletAddress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; type: string; label?: string } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !graph) return;

    // Convert nodes & edges to Cytoscape format
    const cyElements: cytoscape.ElementDefinition[] = [];

    // Nodes
    graph.nodes.forEach((node) => {
      const isRoot = rootWalletAddress && node.id.toLowerCase() === rootWalletAddress.toLowerCase();
      const isExchange = node.type === 'exchange';

      let labelText = node.label || `${node.id.substring(0, 6)}...${node.id.substring(38)}`;
      if (isRoot) labelText = `[ROOT] ${labelText}`;

      cyElements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: labelText,
          nodeType: isExchange ? 'exchange' : isRoot ? 'root' : 'wallet',
          exchangeName: node.label,
          fullAddress: node.id,
        },
      });
    });

    // Edges
    graph.edges.forEach((edge, index) => {
      cyElements.push({
        group: 'edges',
        data: {
          id: `edge_${index}`,
          source: edge.from,
          target: edge.to,
          label: `${edge.amountEth} ETH`,
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
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 60,
        rankSep: 100,
      } as any,
    });

    // Handle node selection
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode({
        id: node.data('fullAddress'),
        type: node.data('nodeType'),
        label: node.data('exchangeName'),
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
  }, [graph, rootWalletAddress]);

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
          height: '380px',
          background: '#090d16',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      />

      {/* Control Buttons */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
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
            <span
              style={{
                marginLeft: '0.5rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background:
                  selectedNode.type === 'exchange'
                    ? '#064e3b'
                    : selectedNode.type === 'root'
                    ? '#451a1a'
                    : '#0f172a',
                color:
                  selectedNode.type === 'exchange'
                    ? '#10b981'
                    : selectedNode.type === 'root'
                    ? '#ef4444'
                    : '#38bdf8',
              }}
            >
              {selectedNode.label || selectedNode.type.toUpperCase()}
            </span>
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

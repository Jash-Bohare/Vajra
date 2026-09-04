import React, { useState, useRef, useMemo } from 'react';

export interface ForensicNode {
  id: string;
  address: string;
  label: string;
  nodeType: 'root' | 'intermediary' | 'burner' | 'exchange' | 'terminal';
  exchangeName?: string;
  hopDepth: number;
  taintPercentage: number;
  amount: string;
  usdValue?: number;
  txHash?: string;
  blockNumber?: number;
  timestamp?: string;
  categoryLabel: string;
}

export interface ForensicEdge {
  id: string;
  from: string;
  to: string;
  amount: string;
  usdValue?: number;
  taintText?: string;
  txHash?: string;
}

interface ForensicTreeGraphProps {
  hops: any[];
  rootAddress: string;
  terminalExchange?: string;
  terminalType?: string;
  ethPriceUsd?: number;
  targetAsset?: string;
  onSelectAddress?: (addr: string) => void;
}

export const ForensicTreeGraph: React.FC<ForensicTreeGraphProps> = ({
  hops,
  rootAddress,
  terminalExchange,
  terminalType,
  ethPriceUsd = 2442,
  targetAsset = 'ETH',
  onSelectAddress,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<ForensicNode | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build tree nodes and edges from dynamic hops
  const { nodes, edges } = useMemo(() => {
    const nodeList: ForensicNode[] = [];
    const edgeList: ForensicEdge[] = [];
    const visited = new Set<string>();

    const safeRoot = rootAddress || '0x0000000000000000000000000000000000000000';
    const rootKey = safeRoot.toLowerCase();

    // 1. Root Node
    const rootNode: ForensicNode = {
      id: rootKey,
      address: safeRoot,
      label: 'Victim Origin',
      nodeType: 'root',
      hopDepth: 0,
      taintPercentage: 100,
      amount: hops[0]?.amountEth ? `${hops[0].amountEth} ETH` : (hops[0]?.tokenAmount ? `${hops[0].tokenAmount} ${hops[0].tokenSymbol || targetAsset}` : 'Inception'),
      usdValue: hops[0]?.usdValue,
      txHash: hops[0]?.txHash,
      blockNumber: hops[0]?.blockNumber,
      timestamp: hops[0]?.txTimestamp,
      categoryLabel: 'Breach Cold Wallet',
    };
    nodeList.push(rootNode);
    visited.add(rootKey);

    // 2. Traversal hops to build tree levels
    let prevId = rootKey;
    hops.forEach((hop, idx) => {
      const hopDepth = idx + 1;
      const toAddr = hop.toAddress || `0xnode_${idx}`;
      const toKey = toAddr.toLowerCase();
      const isTerminal = idx === hops.length - 1;

      const symbol = hop.tokenSymbol || targetAsset;
      const formattedVol = hop.tokenAmount !== undefined
        ? `${hop.tokenAmount.toLocaleString()} ${symbol}`
        : hop.amountEth !== undefined
        ? `${hop.amountEth.toFixed(4)} ETH`
        : `$${hop.usdValue?.toLocaleString() || 0}`;

      const taint = hop.taintPercentage !== undefined
        ? hop.taintPercentage
        : Math.max(10, 100 - idx * 12);

      let nodeType: ForensicNode['nodeType'] = 'intermediary';
      let catLabel = `Peel Split Node #${hopDepth}`;
      if (isTerminal) {
        if (terminalExchange || terminalType === 'exchange') {
          nodeType = 'exchange';
          catLabel = `${terminalExchange || 'Verified VASP'} Deposit`;
        } else {
          nodeType = 'terminal';
          catLabel = 'Terminal Exit Node';
        }
      } else if (hop.contractAddress) {
        nodeType = 'burner';
        catLabel = 'Contract Relay Router';
      }

      if (!visited.has(toKey)) {
        visited.add(toKey);
        nodeList.push({
          id: toKey,
          address: toAddr,
          label: isTerminal && terminalExchange ? terminalExchange : `Hop ${hopDepth}`,
          nodeType,
          exchangeName: isTerminal ? terminalExchange : undefined,
          hopDepth,
          taintPercentage: taint,
          amount: formattedVol,
          usdValue: hop.usdValue,
          txHash: hop.txHash,
          blockNumber: hop.blockNumber,
          timestamp: hop.txTimestamp,
          categoryLabel: catLabel,
        });
      }

      edgeList.push({
        id: `edge_${prevId}_${toKey}_${idx}`,
        from: prevId,
        to: toKey,
        amount: formattedVol,
        usdValue: hop.usdValue,
        taintText: `${taint.toFixed(1)}% Taint`,
        txHash: hop.txHash,
      });

      prevId = toKey;
    });

    return { nodes: nodeList, edges: edgeList };
  }, [hops, rootAddress, terminalExchange, terminalType, targetAsset]);

  // Compute Layout Coordinates: Left-to-right tree arrangement
  const layout = useMemo(() => {
    // Group nodes by hopDepth
    const levels: Map<number, ForensicNode[]> = new Map();
    nodes.forEach((n) => {
      const arr = levels.get(n.hopDepth) || [];
      arr.push(n);
      levels.set(n.hopDepth, arr);
    });

    const coords: Map<string, { x: number; y: number; node: ForensicNode }> = new Map();
    const xSpacing = 240;
    const ySpacing = 130;
    const startX = 80;
    const centerY = 240;

    levels.forEach((levelNodes, depth) => {
      const x = startX + depth * xSpacing;
      const totalH = (levelNodes.length - 1) * ySpacing;
      const startY = centerY - totalH / 2;

      levelNodes.forEach((node, i) => {
        const y = startY + i * ySpacing;
        coords.set(node.id, { x, y, node });
      });
    });

    return coords;
  }, [nodes]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement && e.target.tagName !== 'circle' && e.target.tagName !== 'text') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        backgroundColor: '#f8f9ff',
        borderRadius: '4px',
        border: '1px solid #c6c6cd',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        userSelect: 'none',
      }}
    >
      {/* Top Overlay Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            padding: '4px 10px',
            borderRadius: '4px',
            border: '1px solid #c6c6cd',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#006780' }}>
            account_tree
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 700, color: '#0b1c30' }}>
            CIRCULAR NODE ON-CHAIN FORENSIC TREE
          </span>
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: '#eff4ff',
              borderRadius: '2px',
              fontFamily: 'JetBrains Mono',
              fontSize: '10px',
              color: '#45464d',
            }}
          >
            {nodes.length} Circular Nodes • {edges.length} Branches
          </span>
        </div>

        {/* Zoom & Reset Controls */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            padding: '4px',
            borderRadius: '4px',
            border: '1px solid #c6c6cd',
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0b1c30',
            }}
            title="Zoom In"
          >
            +
          </button>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#76777d', padding: '0 4px' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0b1c30',
            }}
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 30 });
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#eff4ff',
              border: '1px solid #c6c6cd',
              borderRadius: '2px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono',
              fontSize: '10px',
              fontWeight: 600,
              color: '#006780',
            }}
            title="Reset View"
          >
            FIT
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Subtle Dot Grid */}
          <defs>
            <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#c6c6cd" fillOpacity="0.6" />
            </pattern>
            {/* Markers for Arrows */}
            <marker
              id="arrow-default"
              markerWidth="8"
              markerHeight="8"
              refX="18"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 8 4, 0 7" fill="#006780" />
            </marker>
            <marker
              id="arrow-terminal"
              markerWidth="8"
              markerHeight="8"
              refX="18"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 8 4, 0 7" fill="#00876c" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#dotGrid)" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((edge) => {
              const src = layout.get(edge.from);
              const tgt = layout.get(edge.to);
              if (!src || !tgt) return null;

              // Compute smooth curved cubic bezier
              const dx = tgt.x - src.x;
              const cp1X = src.x + dx * 0.5;
              const cp1Y = src.y;
              const cp2X = src.x + dx * 0.5;
              const cp2Y = tgt.y;
              const d = `M ${src.x} ${src.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tgt.x} ${tgt.y}`;

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2 - 12;

              const isTargetTerminal = tgt.node.nodeType === 'exchange' || tgt.node.nodeType === 'terminal';

              return (
                <g key={edge.id}>
                  {/* Glowing background path */}
                  <path
                    d={d}
                    fill="none"
                    stroke={isTargetTerminal ? 'rgba(0, 135, 108, 0.2)' : 'rgba(0, 103, 128, 0.15)'}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Main Flow Branch Line */}
                  <path
                    d={d}
                    fill="none"
                    stroke={isTargetTerminal ? '#00876c' : '#006780'}
                    strokeWidth="2.5"
                    strokeDasharray={isTargetTerminal ? 'none' : '6 3'}
                    markerEnd={isTargetTerminal ? 'url(#arrow-terminal)' : 'url(#arrow-default)'}
                  />
                  {/* Branch Pill Badge */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-55"
                      y="-11"
                      width="110"
                      height="22"
                      rx="3"
                      fill="#ffffff"
                      stroke="#c6c6cd"
                      strokeWidth="1"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono"
                      fontSize="9px"
                      fontWeight="700"
                      fill="#0b1c30"
                    >
                      {edge.amount}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Circular Nodes */}
            {Array.from(layout.values()).map(({ x, y, node }) => {
              const isRoot = node.nodeType === 'root';
              const isExchange = node.nodeType === 'exchange';
              const isBurner = node.nodeType === 'burner';
              const isSelected = selectedNode?.id === node.id;

              // Node radius & color tokens
              const radius = isRoot ? 28 : isExchange ? 28 : 24;

              let circleFill = '#ffffff';
              let circleStroke = '#006780';
              let badgeBg = '#eff4ff';
              let badgeText = '#0b1c30';

              if (isRoot) {
                circleFill = '#fff0f0';
                circleStroke = '#ba1a1a';
                badgeBg = '#ffdad6';
                badgeText = '#93000a';
              } else if (isExchange) {
                circleFill = '#e6f7f2';
                circleStroke = '#00876c';
                badgeBg = '#cceee5';
                badgeText = '#005140';
              } else if (isBurner) {
                circleFill = '#fff9f0';
                circleStroke = '#b26a00';
                badgeBg = '#ffe8c2';
                badgeText = '#593200';
              }

              const shortAddr = `${node.address.substring(0, 6)}...${node.address.substring(node.address.length - 4)}`;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedNode(node);
                    if (onSelectAddress) onSelectAddress(node.address);
                  }}
                >
                  {/* Outer halo when selected or root */}
                  <circle
                    r={radius + (isSelected ? 8 : 4)}
                    fill="none"
                    stroke={isSelected ? '#006780' : circleStroke}
                    strokeWidth={isSelected ? 3 : 1}
                    strokeOpacity={isSelected ? 0.8 : 0.25}
                  />

                  {/* Primary Circular Node */}
                  <circle
                    r={radius}
                    fill={circleFill}
                    stroke={circleStroke}
                    strokeWidth={isRoot || isExchange || isSelected ? 3 : 2}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                  />

                  {/* Center Node Graphic / Monogram */}
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontFamily="Space Grotesk"
                    fontSize={isRoot || isExchange ? '13px' : '11px'}
                    fontWeight="700"
                    fill={circleStroke}
                  >
                    {isRoot ? 'ROOT' : isExchange ? 'VASP' : `H${node.hopDepth}`}
                  </text>

                  {/* Top Label Tag */}
                  <g transform={`translate(0, -${radius + 12})`}>
                    <rect
                      x="-45"
                      y="-9"
                      width="90"
                      height="18"
                      rx="2"
                      fill={badgeBg}
                      stroke="#c6c6cd"
                      strokeWidth="0.5"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono"
                      fontSize="9px"
                      fontWeight="700"
                      fill={badgeText}
                    >
                      {node.label}
                    </text>
                  </g>

                  {/* Bottom Address & Taint Badge */}
                  <g transform={`translate(0, ${radius + 14})`}>
                    <rect
                      x="-55"
                      y="-8"
                      width="110"
                      height="18"
                      rx="2"
                      fill="#ffffff"
                      stroke="#c6c6cd"
                      strokeWidth="1"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.05))"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono"
                      fontSize="9px"
                      fontWeight="600"
                      fill="#0b1c30"
                    >
                      {shortAddr}
                    </text>
                  </g>

                  {/* Taint Percentage Pill */}
                  <g transform={`translate(0, ${radius + 34})`}>
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono"
                      fontSize="9px"
                      fontWeight="700"
                      fill={isRoot ? '#ba1a1a' : isExchange ? '#00876c' : '#76777d'}
                    >
                      {isExchange ? 'ACTIONABLE FREEZE' : `${node.taintPercentage.toFixed(1)}% TAINT`}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Selected Node Inspector Drawer (Bottom Left Floating Panel) */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            width: '380px',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #c6c6cd',
            borderRadius: '4px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 20,
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: selectedNode.nodeType === 'root' ? '#ba1a1a' : selectedNode.nodeType === 'exchange' ? '#00876c' : '#006780',
                }}
              />
              <span style={{ fontFamily: 'Space Grotesk', fontSize: '13px', fontWeight: 700, color: '#0b1c30' }}>
                {selectedNode.categoryLabel}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono',
                fontSize: '14px',
                color: '#76777d',
              }}
            >
              ✕
            </button>
          </div>

          <div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#76777d', display: 'block' }}>
              CHECKSUMMED WALLET ADDRESS:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                  color: '#0b1c30',
                  wordBreak: 'break-all',
                  backgroundColor: '#eff4ff',
                  padding: '4px 6px',
                  borderRadius: '2px',
                  flex: 1,
                }}
              >
                {selectedNode.address}
              </span>
              <button
                onClick={() => copyAddress(selectedNode.address)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              backgroundColor: '#eff4ff',
              padding: '8px',
              borderRadius: '2px',
            }}
          >
            <div>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#76777d', display: 'block' }}>
                RETAINED TAINT:
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 700, color: '#ba1a1a' }}>
                {selectedNode.taintPercentage.toFixed(1)}%
              </span>
            </div>
            <div>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#76777d', display: 'block' }}>
                OUTFLOW VOLUME:
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 700, color: '#0b1c30' }}>
                {selectedNode.amount}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <a
              href={`https://etherscan.io/address/${selectedNode.address}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                fontWeight: 600,
                color: '#006780',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View On Etherscan</span>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
            </a>
            {selectedNode.txHash && (
              <a
                href={`https://etherscan.io/tx/${selectedNode.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                  color: '#45464d',
                  textDecoration: 'none',
                }}
              >
                Tx Explorer ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

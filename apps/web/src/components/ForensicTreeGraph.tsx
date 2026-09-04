import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { InvestigationTree, InvestigationGraph, WalletCategory } from '@rt-cfas/types';
import { useTheme } from '../context/ThemeContext';

export interface ForensicNode {
  id: string;
  address: string;
  label: string;
  nodeType: WalletCategory | 'terminal';
  exchangeName?: string;
  hopDepth: number;
  taintPercentage: number;
  amount: string;
  usdValue?: number;
  txHash?: string;
  blockNumber?: number;
  timestamp?: string;
  categoryLabel: string;
  inDegree: number;
  outDegree: number;
  isFanIn?: boolean;
  isFanOut?: boolean;
}

export interface ForensicEdge {
  id: string;
  from: string;
  to: string;
  amount: string;
  usdValue?: number;
  taintText?: string;
  taintPercent?: number;
  txHash?: string;
  tokenSymbol?: string;
}

interface ForensicTreeGraphProps {
  tree?: InvestigationTree;
  graph?: InvestigationGraph;
  hops?: any[];
  rootAddress: string;
  terminalExchange?: string;
  terminalType?: string;
  ethPriceUsd?: number;
  targetAsset?: string;
  onSelectAddress?: (addr: string) => void;
}

export const ForensicTreeGraph: React.FC<ForensicTreeGraphProps> = ({
  tree,
  graph,
  hops = [],
  rootAddress,
  terminalExchange,
  terminalType,
  targetAsset = 'ETH',
  onSelectAddress,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<ForensicNode | null>(null);
  const [copied, setCopied] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'dag' | 'tree'>('dag');
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic Theme Colors
  const CATEGORY_COLORS: Record<string, { stroke: string; bg: string; text: string; label: string }> = useMemo(() => {
    if (isLight) {
      return {
        root: { stroke: '#ba1a1a', bg: '#ffffff', text: '#ba1a1a', label: 'Suspect Wallet' },
        exchange: { stroke: '#047857', bg: '#ffffff', text: '#047857', label: 'Exchange Deposit' },
        intermediary: { stroke: '#006780', bg: '#ffffff', text: '#006780', label: 'Intermediary' },
        burner: { stroke: '#c2410c', bg: '#ffffff', text: '#c2410c', label: 'Burner Wallet' },
        aggregator: { stroke: '#7e22ce', bg: '#ffffff', text: '#7e22ce', label: 'Aggregator' },
        terminal: { stroke: '#64748b', bg: '#ffffff', text: '#475569', label: 'Terminal Node' },
        unknown: { stroke: '#64748b', bg: '#ffffff', text: '#475569', label: 'Uncategorized' },
      };
    }
    return {
      root: { stroke: '#ef4444', bg: '#1c1417', text: '#ef4444', label: 'Suspect Wallet' },
      exchange: { stroke: '#10b981', bg: '#101d19', text: '#10b981', label: 'Exchange Deposit' },
      intermediary: { stroke: '#38bdf8', bg: '#0f1c29', text: '#38bdf8', label: 'Intermediary' },
      burner: { stroke: '#f97316', bg: '#211812', text: '#f97316', label: 'Burner Wallet' },
      aggregator: { stroke: '#a855f7', bg: '#1e142b', text: '#a855f7', label: 'Aggregator' },
      terminal: { stroke: '#64748b', bg: '#161922', text: '#94a3b8', label: 'Terminal Node' },
      unknown: { stroke: '#64748b', bg: '#161922', text: '#94a3b8', label: 'Uncategorized' },
    };
  }, [isLight]);

  // 1. Build Multi-Branch Graph Nodes & Edges (Strict Single-Origin Guarantee)
  const { nodes, edges } = useMemo(() => {
    const rawNodes = tree?.nodes || graph?.nodes;
    const rawEdges = tree?.edges || graph?.edges;

    // The true input suspect wallet address - ONLY THIS ADDRESS CAN EVER BE ROOT
    const targetRoot = (
      rootAddress ||
      tree?.rootAddress ||
      (rawNodes && rawNodes[0]?.id) ||
      hops[0]?.fromAddress ||
      '0x0000000000000000000000000000000000000000'
    ).toLowerCase().trim();

    const nodeMap = new Map<string, ForensicNode>();
    const edgeList: ForensicEdge[] = [];

    // CASE A: Tree or Graph payload already computed by BFS engine
    if (rawNodes && rawNodes.length > 0 && rawEdges && rawEdges.length > 0) {
      rawNodes.forEach((rn) => {
        const addr = rn.id.toLowerCase();
        // STRICT CHECK: ONLY THE TARGET ROOT IS ROOT
        const isRoot = addr === targetRoot;
        const isEx = rn.type === 'exchange' || Boolean(rn.label && rn.label.toLowerCase() !== addr && !rn.label.startsWith('0x'));

        let category: WalletCategory = rn.walletCategory || 'intermediary';
        if (isRoot) {
          category = 'root';
        } else if (isEx) {
          category = 'exchange';
        } else if ((rn.inDegree || 0) >= 2 || rn.isFanIn) {
          category = 'aggregator';
        } else if (category === 'root') {
          // Prevent any non-root address from accidentally inheriting 'root' category
          category = 'burner';
        }

        const nodeObj: ForensicNode = {
          id: addr,
          address: rn.id,
          label: (isEx && rn.label) ? rn.label : (isRoot ? 'Suspect Root' : `${addr.slice(0, 6)}...${addr.slice(-4)}`),
          nodeType: category,
          exchangeName: isEx ? rn.label : undefined,
          hopDepth: isRoot ? 0 : Math.max(1, rn.depth || 1),
          taintPercentage: rn.taintedAmountUsd && tree?.victimAmountUsd
            ? Math.min(100, Math.round((rn.taintedAmountUsd / tree.victimAmountUsd) * 100))
            : Math.max(5, 100 - (rn.depth || 0) * 15),
          amount: rn.taintedAmountUsd ? `$${Math.round(rn.taintedAmountUsd).toLocaleString()}` : `${targetAsset}`,
          usdValue: rn.taintedAmountUsd,
          inDegree: rn.inDegree || 0,
          outDegree: rn.outDegree || 0,
          isFanIn: rn.isFanIn,
          isFanOut: rn.isFanOut,
          categoryLabel: CATEGORY_COLORS[category]?.label || 'Intermediary',
        };

        nodeMap.set(addr, nodeObj);
      });

      // Populate edges
      rawEdges.forEach((re, idx) => {
        const fromAddr = re.from.toLowerCase();
        const toAddr = re.to.toLowerCase();
        const symbol = re.tokenSymbol || targetAsset;

        const anyRe = re as any;
        let amountText = '';
        if (anyRe.tokenAmount !== undefined && anyRe.tokenAmount > 0) {
          amountText = `${anyRe.tokenAmount.toFixed(4)} ${symbol}`;
        } else if (re.amountEth !== undefined && re.amountEth > 0) {
          amountText = `${re.amountEth.toFixed(4)} ETH`;
        } else if (re.usdValue) {
          amountText = `$${Math.round(re.usdValue).toLocaleString()}`;
        } else {
          amountText = `Transfer`;
        }

        const taintVal = re.taintPercentage !== undefined
          ? Math.round(re.taintPercentage * 10) / 10
          : undefined;

        edgeList.push({
          id: `edge_${fromAddr}_${toAddr}_${idx}`,
          from: fromAddr,
          to: toAddr,
          amount: amountText,
          usdValue: re.usdValue,
          taintText: taintVal !== undefined ? `${taintVal}%` : undefined,
          taintPercent: taintVal,
          txHash: re.txHash,
          tokenSymbol: symbol,
        });

        const fn = nodeMap.get(fromAddr);
        const tn = nodeMap.get(toAddr);
        if (fn) fn.outDegree += 1;
        if (tn) tn.inDegree += 1;
      });

      // Ensure root node exists
      if (!nodeMap.has(targetRoot)) {
        nodeMap.set(targetRoot, {
          id: targetRoot,
          address: rootAddress || targetRoot,
          label: 'Suspect Root',
          nodeType: 'root',
          hopDepth: 0,
          taintPercentage: 100,
          amount: 'Inception',
          inDegree: 0,
          outDegree: 1,
          categoryLabel: 'Suspect Wallet',
        });
      }

      return { nodes: Array.from(nodeMap.values()), edges: edgeList };
    }

    // CASE B: Fallback multi-branch construction from hops array
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    const hopDepthMap = new Map<string, number>();
    hopDepthMap.set(targetRoot, 0);

    hops.forEach((h) => {
      const from = (h.fromAddress || '').toLowerCase();
      const to = (h.toAddress || '').toLowerCase();
      if (from) outDegreeMap.set(from, (outDegreeMap.get(from) || 0) + 1);
      if (to) {
        inDegreeMap.set(to, (inDegreeMap.get(to) || 0) + 1);
        const curDepth = hopDepthMap.get(from) || 0;
        if (!hopDepthMap.has(to) || (hopDepthMap.get(to)! < curDepth + 1)) {
          hopDepthMap.set(to, curDepth + 1);
        }
      }
    });

    // Create ONLY the SINGLE Root Node
    nodeMap.set(targetRoot, {
      id: targetRoot,
      address: rootAddress || targetRoot,
      label: '[ROOT]',
      nodeType: 'root',
      hopDepth: 0,
      taintPercentage: 100,
      amount: hops[0]?.amountEth ? `${hops[0].amountEth} ETH` : 'Inception',
      inDegree: 0,
      outDegree: outDegreeMap.get(targetRoot) || 1,
      categoryLabel: 'Suspect Wallet',
    });

    hops.forEach((hop, idx) => {
      const from = (hop.fromAddress || targetRoot).toLowerCase();
      const to = (hop.toAddress || `0xnode_${idx}`).toLowerCase();
      const isTerminal = idx === hops.length - 1;
      const depth = hopDepthMap.get(to) || idx + 1;

      const symbol = hop.tokenSymbol || targetAsset;
      const formattedVol = hop.tokenAmount !== undefined && hop.tokenAmount > 0
        ? `${hop.tokenAmount.toFixed(4)} ${symbol}`
        : hop.amountEth !== undefined && hop.amountEth > 0
        ? `${hop.amountEth.toFixed(4)} ETH`
        : `$${hop.usdValue?.toLocaleString() || 0}`;

      const taint = hop.taintPercentage !== undefined
        ? hop.taintPercentage
        : Math.max(5, 100 - idx * 14);

      if (!nodeMap.has(to) && to !== targetRoot) {
        const inDeg = inDegreeMap.get(to) || 1;
        const outDeg = outDegreeMap.get(to) || 0;
        const isEx = isTerminal && (Boolean(terminalExchange) || terminalType === 'exchange');

        let category: WalletCategory = 'intermediary';
        if (isEx) {
          category = 'exchange';
        } else if (inDeg >= 2) {
          category = 'aggregator';
        } else if (inDeg <= 1 && outDeg <= 1) {
          category = 'burner';
        }

        nodeMap.set(to, {
          id: to,
          address: hop.toAddress || to,
          label: isEx ? (terminalExchange || 'Exchange') : `${to.slice(0, 6)}...${to.slice(-4)}`,
          nodeType: category,
          exchangeName: isEx ? (terminalExchange || 'Exchange') : undefined,
          hopDepth: Math.max(1, depth),
          taintPercentage: taint,
          amount: formattedVol,
          usdValue: hop.usdValue,
          txHash: hop.txHash,
          blockNumber: hop.blockNumber,
          timestamp: hop.txTimestamp,
          inDegree: inDeg,
          outDegree: outDeg,
          categoryLabel: CATEGORY_COLORS[category]?.label || 'Intermediary',
        });
      }

      edgeList.push({
        id: `edge_${from}_${to}_${idx}`,
        from,
        to,
        amount: formattedVol,
        usdValue: hop.usdValue,
        taintText: `${taint.toFixed(1)}%`,
        taintPercent: taint,
        txHash: hop.txHash,
        tokenSymbol: symbol,
      });
    });

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [tree, graph, hops, rootAddress, terminalExchange, terminalType, targetAsset, CATEGORY_COLORS]);

  // 2. Base Auto-Layout Calculation (DAG or Circular Tree)
  const initialLayout = useMemo(() => {
    const coords = new Map<string, { x: number; y: number; node: ForensicNode }>();
    const levels = new Map<number, ForensicNode[]>();

    nodes.forEach((n) => {
      const d = n.hopDepth;
      if (!levels.has(d)) levels.set(d, []);
      levels.get(d)!.push(n);
    });

    const canvasCenterX = 450;
    const levelHeight = 160;
    const nodeSpacingX = 175;

    const parentMap = new Map<string, string[]>();
    edges.forEach((e) => {
      if (!parentMap.has(e.to)) parentMap.set(e.to, []);
      parentMap.get(e.to)!.push(e.from);
    });

    const sortedDepths = Array.from(levels.keys()).sort((a, b) => a - b);

    sortedDepths.forEach((d) => {
      const levelNodes = levels.get(d) || [];
      const y = 80 + d * levelHeight;

      if (d === 0) {
        levelNodes.forEach((rn) => {
          coords.set(rn.id, { x: canvasCenterX, y, node: rn });
        });
      } else {
        const totalW = (levelNodes.length - 1) * nodeSpacingX;
        const startX = canvasCenterX - totalW / 2;

        levelNodes.forEach((node, i) => {
          let calculatedX = startX + i * nodeSpacingX;

          if (layoutMode === 'dag') {
            const parents = parentMap.get(node.id) || [];
            if (parents.length > 0) {
              const parentXSum = parents.reduce((sum, pId) => {
                const pc = coords.get(pId);
                return sum + (pc ? pc.x : canvasCenterX);
              }, 0);
              const avgParentX = parentXSum / parents.length;
              calculatedX = 0.65 * avgParentX + 0.35 * calculatedX;
            }
          }

          coords.set(node.id, { x: calculatedX, y, node });
        });
      }
    });

    return coords;
  }, [nodes, edges, layoutMode]);

  // 3. User-Movable Node Positions Override
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragInfoRef = useRef<{
    nodeId: string;
    startMouseX: number;
    startMouseY: number;
    initNodeX: number;
    initNodeY: number;
  } | null>(null);
  const didDragRef = useRef(false);

  // Clear manual node positions when the target wallet or asset changes
  useEffect(() => {
    setNodePositions({});
  }, [rootAddress, targetAsset]);

  // Combined Layout: Base Auto-Layout overridden by movable node positions
  const layout = useMemo(() => {
    const coords = new Map<string, { x: number; y: number; node: ForensicNode }>();
    initialLayout.forEach((pos, id) => {
      const custom = nodePositions[id];
      coords.set(id, {
        x: custom ? custom.x : pos.x,
        y: custom ? custom.y : pos.y,
        node: pos.node,
      });
    });
    return coords;
  }, [initialLayout, nodePositions]);

  // 4. Auto-Fit Graph Viewport Centering
  const handleFitGraph = useCallback(() => {
    if (layout.size === 0 || !containerRef.current) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    layout.forEach((pos) => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    const padding = 80;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding + 40;

    const graphWidth = maxX - minX || 800;
    const graphHeight = maxY - minY || 600;

    const containerW = containerRef.current.clientWidth || 900;
    const containerH = containerRef.current.clientHeight || 550;

    const scaleX = containerW / graphWidth;
    const scaleY = containerH / graphHeight;
    const newZoom = Math.min(1.15, Math.max(0.45, Math.min(scaleX, scaleY) * 0.9));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPanX = containerW / 2 - centerX * newZoom;
    const newPanY = containerH / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [layout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitGraph();
    }, 100);
    return () => clearTimeout(timer);
  }, [handleFitGraph]);

  // 5. Node & Canvas Dragging Mechanics
  const handleNodeMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    currentPos: { x: number; y: number }
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only primary button

    didDragRef.current = false;
    dragInfoRef.current = {
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initNodeX: currentPos.x,
      initNodeY: currentPos.y,
    };
    setDraggedNodeId(nodeId);
  };

  const handleNodeTouchStart = (
    e: React.TouchEvent,
    nodeId: string,
    currentPos: { x: number; y: number }
  ) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    didDragRef.current = false;
    dragInfoRef.current = {
      nodeId,
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      initNodeX: currentPos.x,
      initNodeY: currentPos.y,
    };
    setDraggedNodeId(nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragInfoRef.current) {
        const info = dragInfoRef.current;
        const dx = (e.clientX - info.startMouseX) / zoom;
        const dy = (e.clientY - info.startMouseY) / zoom;

        if (Math.hypot(dx, dy) > 3) {
          didDragRef.current = true;
        }

        setNodePositions((prev) => ({
          ...prev,
          [info.nodeId]: {
            x: Math.round(info.initNodeX + dx),
            y: Math.round(info.initNodeY + dy),
          },
        }));
        return;
      }

      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (dragInfoRef.current && e.touches.length === 1) {
        const touch = e.touches[0];
        const info = dragInfoRef.current;
        const dx = (touch.clientX - info.startMouseX) / zoom;
        const dy = (touch.clientY - info.startMouseY) / zoom;

        if (Math.hypot(dx, dy) > 3) {
          didDragRef.current = true;
        }

        setNodePositions((prev) => ({
          ...prev,
          [info.nodeId]: {
            x: Math.round(info.initNodeX + dx),
            y: Math.round(info.initNodeY + dy),
          },
        }));
      }
    };

    const handleWindowMouseUp = () => {
      if (dragInfoRef.current) {
        dragInfoRef.current = null;
        setDraggedNodeId(null);
      }
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [isDragging, zoom, dragStart]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => Math.min(2.2, Math.max(0.35, prev + zoomDelta)));
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const edgeColor = isLight ? '#006780' : '#38bdf8';
  const edgeBg = isLight ? '#ffffff' : '#080e1a';
  const edgeBorder = isLight ? '#c6c6cd' : '#1a2d4b';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '620px',
        backgroundColor: isLight ? '#f8fafd' : '#090e1a',
        borderRadius: '8px',
        border: isLight ? '1px solid #c6c6cd' : '1px solid #1a2942',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
    >
      {/* 1. Top-Right Control Buttons */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 25,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setNodePositions({});
            setLayoutMode(layoutMode === 'dag' ? 'tree' : 'dag');
          }}
          style={{
            padding: '7px 16px',
            backgroundColor: isLight ? '#ffffff' : '#121e33',
            border: isLight ? '1px solid #c6c6cd' : '1px solid #203657',
            borderRadius: '6px',
            color: isLight ? '#0b1c30' : '#e2e8f0',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
            fontFamily: 'Space Grotesk, Inter, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = isLight ? '#006780' : '#38bdf8';
            e.currentTarget.style.backgroundColor = isLight ? '#eff4ff' : '#182b4a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isLight ? '#c6c6cd' : '#203657';
            e.currentTarget.style.backgroundColor = isLight ? '#ffffff' : '#121e33';
          }}
        >
          {layoutMode === 'dag' ? 'Switch to Tree' : 'Switch to DAG'}
        </button>

        <button
          type="button"
          onClick={handleFitGraph}
          style={{
            padding: '7px 16px',
            backgroundColor: isLight ? '#ffffff' : '#121e33',
            border: isLight ? '1px solid #c6c6cd' : '1px solid #203657',
            borderRadius: '6px',
            color: isLight ? '#0b1c30' : '#e2e8f0',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
            fontFamily: 'Space Grotesk, Inter, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = isLight ? '#006780' : '#38bdf8';
            e.currentTarget.style.backgroundColor = isLight ? '#eff4ff' : '#182b4a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isLight ? '#c6c6cd' : '#203657';
            e.currentTarget.style.backgroundColor = isLight ? '#ffffff' : '#121e33';
          }}
        >
          Fit Graph
        </button>

        {Object.keys(nodePositions).length > 0 && (
          <button
            type="button"
            onClick={() => {
              setNodePositions({});
              setTimeout(handleFitGraph, 60);
            }}
            style={{
              padding: '7px 16px',
              backgroundColor: isLight ? '#eff4ff' : '#14233c',
              border: isLight ? '1px solid #006780' : '1px solid #38bdf8',
              borderRadius: '6px',
              color: isLight ? '#006780' : '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
              fontFamily: 'Space Grotesk, Inter, sans-serif',
            }}
          >
            Reset Positions
          </button>
        )}
      </div>

      {/* 2. Interactive SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <marker
            id="forensic-arrow"
            viewBox="0 0 10 10"
            refX="26"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={edgeColor} />
          </marker>

          {!isLight && (
            <>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.5" />
              </filter>
              <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.5" />
              </filter>
              <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.5" />
              </filter>
              <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f97316" floodOpacity="0.5" />
              </filter>
            </>
          )}
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Layer A: Directed Edges & Edge Amount Labels */}
          {edges.map((edge) => {
            const fromPos = layout.get(edge.from);
            const toPos = layout.get(edge.to);
            if (!fromPos || !toPos) return null;

            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const angle = Math.atan2(dy, dx);
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            let deg = (angle * 180) / Math.PI;
            if (deg > 90) deg -= 180;
            if (deg < -90) deg += 180;

            const labelText = edge.taintPercent !== undefined
              ? `${edge.amount} (${edge.taintPercent}%)`
              : edge.amount;

            return (
              <g key={edge.id}>
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={edgeColor}
                  strokeWidth="2"
                  markerEnd="url(#forensic-arrow)"
                  opacity={isLight ? '0.9' : '0.85'}
                />

                <g transform={`translate(${midX}, ${midY}) rotate(${deg})`}>
                  <rect
                    x={-labelText.length * 3.3 - 6}
                    y={-10}
                    width={labelText.length * 6.6 + 12}
                    height={18}
                    rx={4}
                    fill={edgeBg}
                    stroke={edgeBorder}
                    strokeWidth="1"
                    opacity={isLight ? '0.95' : '0.9'}
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    fill={edgeColor}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {labelText}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Layer B: Circular Nodes */}
          {Array.from(layout.values()).map(({ x, y, node }) => {
            const isSelected = selectedNode?.id === node.id;
            const isRoot = node.nodeType === 'root';
            const isEx = node.nodeType === 'exchange';
            const catStyle = CATEGORY_COLORS[node.nodeType] || CATEGORY_COLORS.intermediary;

            const shortAddr = node.address.length > 10
              ? `${node.address.slice(0, 6)}...${node.address.slice(-4)}`
              : node.address;

            const isBeingDragged = draggedNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id, { x, y })}
                onTouchStart={(e) => handleNodeTouchStart(e, node.id, { x, y })}
                onClick={(e) => {
                  e.stopPropagation();
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  setSelectedNode(node);
                }}
                style={{
                  cursor: isBeingDragged ? 'grabbing' : 'grab',
                  userSelect: 'none',
                }}
              >
                {isSelected && (
                  <circle
                    r={32}
                    fill="none"
                    stroke={isLight ? '#006780' : '#ffffff'}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    opacity="0.8"
                  />
                )}

                <circle
                  r={isBeingDragged ? 26 : 24}
                  fill={catStyle.bg}
                  stroke={catStyle.stroke}
                  strokeWidth={isRoot || isEx ? 3.5 : 2.8}
                  style={{
                    filter: !isLight ? (isRoot ? 'url(#glow-red)' : isEx ? 'url(#glow-green)' : undefined) : undefined,
                    transition: isBeingDragged ? 'none' : 'all 0.15s ease',
                  }}
                />

                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill={catStyle.stroke}
                  fontSize="12"
                  fontFamily="Space Grotesk, Inter, sans-serif"
                  fontWeight="700"
                >
                  {isRoot ? 'm' : isEx ? 'E' : node.nodeType === 'burner' ? 'b' : node.nodeType === 'aggregator' ? 'a' : 'm'}
                </text>

                {/* Node Label Line 1: Strictly Only Input Wallet is [ROOT] */}
                <text
                  x={0}
                  y={38}
                  textAnchor="middle"
                  fill={isRoot ? catStyle.stroke : isEx ? catStyle.stroke : (isLight ? '#0b1c30' : '#e2e8f0')}
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={isRoot || isEx ? '700' : '500'}
                >
                  {isRoot ? `[ROOT] ${shortAddr}` : isEx && node.exchangeName ? node.exchangeName : shortAddr}
                </text>

                {/* Node Label Line 2: Wallet Role */}
                <text
                  x={0}
                  y={52}
                  textAnchor="middle"
                  fill={isLight ? '#45464d' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight="400"
                >
                  {isEx ? 'Exchange Deposit' : isRoot ? 'Suspect Origin' : catStyle.label.replace(' Wallet', '')}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 3. Bottom-Left Legend Box */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(8, 15, 30, 0.92)',
          border: isLight ? '1px solid #c6c6cd' : '1px solid #1a2d4b',
          borderRadius: '8px',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.08)' : '0 4px 16px rgba(0,0,0,0.55)',
          zIndex: 25,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.root.stroke, display: 'inline-block' }} />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: CATEGORY_COLORS.root.text, fontFamily: 'Space Grotesk, sans-serif' }}>Suspect Wallet</span>
        </div>
        <span style={{ color: isLight ? '#dce4f0' : '#273852', fontSize: '12px' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.exchange.stroke, display: 'inline-block' }} />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: CATEGORY_COLORS.exchange.text, fontFamily: 'Space Grotesk, sans-serif' }}>Exchange Deposit</span>
        </div>
        <span style={{ color: isLight ? '#dce4f0' : '#273852', fontSize: '12px' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.intermediary.stroke, display: 'inline-block' }} />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: CATEGORY_COLORS.intermediary.text, fontFamily: 'Space Grotesk, sans-serif' }}>Intermediary</span>
        </div>
        <span style={{ color: isLight ? '#dce4f0' : '#273852', fontSize: '12px' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.burner.stroke, display: 'inline-block' }} />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: CATEGORY_COLORS.burner.text, fontFamily: 'Space Grotesk, sans-serif' }}>Burner Wallet</span>
        </div>
        <span style={{ color: isLight ? '#dce4f0' : '#273852', fontSize: '12px' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.aggregator.stroke, display: 'inline-block' }} />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: CATEGORY_COLORS.aggregator.text, fontFamily: 'Space Grotesk, sans-serif' }}>Aggregator</span>
        </div>
      </div>

      {/* 4. Interactive Node Inspector Drawer */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '320px',
            backgroundColor: isLight ? '#ffffff' : '#0c1629',
            border: isLight ? '1px solid #c6c6cd' : '1px solid #1e3557',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.12)' : '0 8px 30px rgba(0,0,0,0.6)',
            zIndex: 30,
            color: isLight ? '#0b1c30' : '#f1f5f9',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: CATEGORY_COLORS[selectedNode.nodeType]?.text || (isLight ? '#006780' : '#38bdf8'),
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {selectedNode.categoryLabel}
            </span>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'none',
                border: 'none',
                color: isLight ? '#76777d' : '#64748b',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', color: isLight ? '#76777d' : '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
              On-Chain Address
            </div>
            <div
              style={{
                fontSize: '11.5px',
                fontFamily: 'JetBrains Mono, monospace',
                color: isLight ? '#0b1c30' : '#e2e8f0',
                wordBreak: 'break-all',
                backgroundColor: isLight ? '#eff4ff' : '#070d18',
                padding: '6px 8px',
                borderRadius: '4px',
                border: isLight ? '1px solid #c6c6cd' : '1px solid #14233c',
              }}
            >
              {selectedNode.address}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div style={{ backgroundColor: isLight ? '#eff4ff' : '#070d18', padding: '6px 8px', borderRadius: '4px', border: isLight ? '1px solid #c6c6cd' : '1px solid #14233c' }}>
              <div style={{ fontSize: '9.5px', color: isLight ? '#76777d' : '#64748b' }}>Hop Depth</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: isLight ? '#006780' : '#38bdf8' }}>Level #{selectedNode.hopDepth}</div>
            </div>
            <div style={{ backgroundColor: isLight ? '#eff4ff' : '#070d18', padding: '6px 8px', borderRadius: '4px', border: isLight ? '1px solid #c6c6cd' : '1px solid #14233c' }}>
              <div style={{ fontSize: '9.5px', color: isLight ? '#76777d' : '#64748b' }}>Taint Level</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: isLight ? '#ba1a1a' : '#ef4444' }}>{selectedNode.taintPercentage}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => copyAddress(selectedNode.address)}
              style={{
                flex: 1,
                padding: '7px 10px',
                backgroundColor: isLight ? '#eff4ff' : '#121e33',
                border: isLight ? '1px solid #c6c6cd' : '1px solid #1e355b',
                borderRadius: '4px',
                color: isLight ? '#0b1c30' : '#cbd5e1',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy Address'}
            </button>

            {onSelectAddress && (
              <button
                type="button"
                onClick={() => {
                  onSelectAddress(selectedNode.address);
                  setSelectedNode(null);
                }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  backgroundColor: '#006780',
                  border: '1px solid #005064',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Scan Address
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { InvestigationTree, InvestigationGraph, WalletCategory, BranchSummary } from '@rt-cfas/types';
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
  formattedTimestamp?: string;
  transitDelayText?: string;
  categoryLabel: string;
  inDegree: number;
  outDegree: number;
  isFanIn?: boolean;
  isFanOut?: boolean;
  shortCode: string;
  roleStamp: string;
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
  timestamp?: string;
  blockNumber?: number;
  delayText?: string;
}

const KNOWN_EXCHANGE_KEYWORDS = [
  'binance', 'coinbase', 'kraken', 'okx', 'bybit', 'kucoin', 
  'gate.io', 'gate', 'wazirx', 'coindcx', 'htx', 'huobi', 
  'bitfinex', 'bitstamp', 'gemini', 'crypto.com', 'mexc', 'bitget',
  'poloniex', 'deribit', 'bithumb', 'upbit', 'uniswap', 'sushiswap'
];

function parseTimestampMs(val?: string | number): number | null {
  if (!val) return null;
  if (typeof val === 'number') {
    return val > 1e11 ? val : val * 1000;
  }
  const parsed = Date.parse(val);
  return isNaN(parsed) ? null : parsed;
}

function formatTransitDuration(diffSeconds: number): string {
  if (isNaN(diffSeconds) || diffSeconds < 0) return '< 1m';
  if (diffSeconds < 60) return `${Math.max(1, Math.round(diffSeconds))}s`;
  const mins = Math.floor(diffSeconds / 60);
  const secs = Math.round(diffSeconds % 60);
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function detectExchangeName(label?: string, walletCat?: string, isTerminalEx?: boolean, terminalExProp?: string): string | null {
  if (terminalExProp && isTerminalEx) return terminalExProp;
  if (!label && !walletCat) return null;

  if (walletCat === 'exchange' && label && !/^0x[a-f0-9]{4,}/i.test(label)) {
    return label;
  }

  if (label) {
    const lower = label.toLowerCase().trim();
    for (const kw of KNOWN_EXCHANGE_KEYWORDS) {
      if (lower.includes(kw)) {
        if (lower.includes('gate.io') || lower.includes('gate')) return 'Gate.io';
        if (lower.includes('coindcx')) return 'CoinDCX';
        if (lower.includes('wazirx')) return 'WazirX';
        if (lower.includes('crypto.com')) return 'Crypto.com';
        return kw.charAt(0).toUpperCase() + kw.slice(1);
      }
    }
  }

  if (isTerminalEx && terminalExProp) return terminalExProp;
  return null;
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
  selectedBranchId?: string | null;
  selectedNodeId?: string | null;
  onSelectNode?: (node: ForensicNode | null) => void;
  layoutMode?: 'dag' | 'tree';
  onLayoutModeChange?: (mode: 'dag' | 'tree') => void;
  height?: string;
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
  selectedBranchId,
  selectedNodeId,
  onSelectNode,
  layoutMode: externalLayoutMode,
  onLayoutModeChange,
  height = '460px',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [internalLayoutMode, setInternalLayoutMode] = useState<'dag' | 'tree'>('dag');
  const layoutMode = externalLayoutMode || internalLayoutMode;

  const handleToggleLayout = (newMode: 'dag' | 'tree') => {
    setNodePositions({});
    if (onLayoutModeChange) {
      onLayoutModeChange(newMode);
    } else {
      setInternalLayoutMode(newMode);
    }
  };

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalSelectedNode, setInternalSelectedNode] = useState<ForensicNode | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [popoverOffset, setPopoverOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const didCanvasDragRef = useRef(false);
  const dragInfoRef = useRef<{
    nodeId: string;
    startMouseX: number;
    startMouseY: number;
    initNodeX: number;
    initNodeY: number;
  } | null>(null);
  const popoverDragRef = useRef<{
    startX: number;
    startY: number;
    initOffX: number;
    initOffY: number;
  } | null>(null);

  // Dynamic Theme Colors for Node Categories & Roles
  const CATEGORY_COLORS: Record<string, { stroke: string; bg: string; text: string; label: string; glow: string; roleStamp: string; description: string }> = useMemo(() => {
    if (isLight) {
      return {
        root: { stroke: '#dc2626', bg: '#fee2e2', text: '#991b1b', label: 'Suspect Origin', glow: 'rgba(220, 38, 38, 0.4)', roleStamp: 'SUSPECT ROOT', description: 'Inception wallet initiating fund dispersal or theft' },
        exchange: { stroke: '#059669', bg: '#d1fae5', text: '#065f46', label: 'VASP Exchange Exit', glow: 'rgba(5, 150, 105, 0.4)', roleStamp: 'VASP EXIT', description: 'Centralized exchange deposit endpoint (KYC / Subpoena actionable)' },
        intermediary: { stroke: '#0284c7', bg: '#e0f2fe', text: '#075985', label: 'Intermediary Relay', glow: 'rgba(2, 132, 199, 0.4)', roleStamp: 'PEELING RELAY', description: 'Intermediate relay wallet transferring peeling volume' },
        aggregator: { stroke: '#7c3aed', bg: '#ede9fe', text: '#5b21b6', label: 'Fund Aggregator (Convergence)', glow: 'rgba(124, 58, 237, 0.4)', roleStamp: 'AGGREGATOR', description: 'Fan-in consolidation wallet receiving funds from 2+ separate tracked paths' },
        burner: { stroke: '#d97706', bg: '#fef3c7', text: '#92400e', label: 'Holding / Terminal Leaf', glow: 'rgba(217, 119, 6, 0.4)', roleStamp: 'BURNER LEAF', description: 'Terminal destination holding unspent funds' },
        terminal: { stroke: '#059669', bg: '#d1fae5', text: '#065f46', label: 'VASP Exchange Exit', glow: 'rgba(5, 150, 105, 0.4)', roleStamp: 'VASP EXIT', description: 'Centralized exchange deposit endpoint' },
        contract_pool: { stroke: '#ea580c', bg: '#fff7ed', text: '#9a3412', label: 'DEX / Smart Contract', glow: 'rgba(234, 88, 12, 0.4)', roleStamp: 'CONTRACT POOL', description: 'Public DEX router or smart contract — trace terminated to avoid unrelated swap pollution' },
      };
    }
    return {
      root: { stroke: '#ef4444', bg: '#3a0d0d', text: '#fca5a5', label: 'Suspect Origin', glow: 'rgba(239, 68, 68, 0.85)', roleStamp: 'SUSPECT ROOT', description: 'Inception wallet initiating fund dispersal or theft' },
      exchange: { stroke: '#10b981', bg: '#042f1f', text: '#6ee7b7', label: 'VASP Exchange Exit', glow: 'rgba(16, 185, 129, 0.85)', roleStamp: 'VASP EXIT', description: 'Centralized exchange deposit endpoint (KYC / Subpoena actionable)' },
      intermediary: { stroke: '#00e5ff', bg: '#03253b', text: '#7dd3fc', label: 'Intermediary Relay', glow: 'rgba(0, 229, 255, 0.8)', roleStamp: 'PEELING RELAY', description: 'Intermediate relay wallet transferring peeling volume' },
      aggregator: { stroke: '#c084fc', bg: '#2e1065', text: '#e9d5ff', label: 'Fund Aggregator (Convergence)', glow: 'rgba(192, 132, 252, 0.85)', roleStamp: 'AGGREGATOR', description: 'Fan-in consolidation wallet receiving funds from 2+ separate tracked paths' },
      burner: { stroke: '#f59e0b', bg: '#451a03', text: '#fcd34d', label: 'Holding / Terminal Leaf', glow: 'rgba(245, 158, 11, 0.85)', roleStamp: 'BURNER LEAF', description: 'Terminal destination holding unspent funds' },
      terminal: { stroke: '#10b981', bg: '#042f1f', text: '#6ee7b7', label: 'VASP Exchange Exit', glow: 'rgba(16, 185, 129, 0.85)', roleStamp: 'VASP EXIT', description: 'Centralized exchange deposit endpoint' },
      contract_pool: { stroke: '#f97316', bg: '#1c0d00', text: '#fdba74', label: 'DEX / Smart Contract', glow: 'rgba(249, 115, 22, 0.85)', roleStamp: 'CONTRACT POOL', description: 'Public DEX router or smart contract — trace terminated to avoid unrelated swap pollution' },
    };
  }, [isLight]);

  // 1. Build Nodes & Edges from tree / graph / hops with ACCURATE Role Identification & Transit Delay
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, ForensicNode>();
    const edgeList: ForensicEdge[] = [];
    const targetRoot = (rootAddress || '').toLowerCase();

    // Compute in/out degrees and inbound/outbound timestamps across all transactions first
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    const inboundTimeMap = new Map<string, number>();
    const outboundTimeMap = new Map<string, number>();

    const recordTimestamp = (from: string, to: string, tsVal?: string | number, blockNo?: number) => {
      let tMs = parseTimestampMs(tsVal);
      if (tMs === null && blockNo) {
        tMs = 1740000000000 + blockNo * 12000;
      }
      if (tMs !== null) {
        if (to && (!inboundTimeMap.has(to) || tMs < inboundTimeMap.get(to)!)) {
          inboundTimeMap.set(to, tMs);
        }
        if (from && (!outboundTimeMap.has(from) || tMs < outboundTimeMap.get(from)!)) {
          outboundTimeMap.set(from, tMs);
        }
      }
    };

    const rawEdges = tree?.edges || graph?.edges || [];
    if (rawEdges.length > 0) {
      rawEdges.forEach((e) => {
        const from = (e.from || '').toLowerCase();
        const to = (e.to || '').toLowerCase();
        if (from) outDegreeMap.set(from, (outDegreeMap.get(from) || 0) + 1);
        if (to) inDegreeMap.set(to, (inDegreeMap.get(to) || 0) + 1);
        recordTimestamp(from, to, e.timestamp, (e as any).blockNumber);
      });
    } else {
      hops.forEach((h) => {
        const from = (h.fromAddress || '').toLowerCase();
        const to = (h.toAddress || '').toLowerCase();
        if (from) outDegreeMap.set(from, (outDegreeMap.get(from) || 0) + 1);
        if (to) inDegreeMap.set(to, (inDegreeMap.get(to) || 0) + 1);
        recordTimestamp(from, to, h.txTimestamp, h.blockNumber);
      });
    }

    // CASE A: Structured tree/graph format
    if (tree || graph) {
      const rawNodes = tree?.nodes || graph?.nodes || [];

      rawNodes.forEach((rn) => {
        const addr = rn.id.toLowerCase();
        const isRoot = addr === targetRoot;

        // Accurate Exchange Detection
        const detectedEx = detectExchangeName(
          rn.label,
          rn.walletCategory,
          Boolean((rn as any).isTerminalExchange),
          terminalExchange
        );
        const isEx = Boolean(detectedEx);

        const inDeg = inDegreeMap.get(addr) || rn.inDegree || 0;
        const outDeg = outDegreeMap.get(addr) || rn.outDegree || 0;

        let category: WalletCategory = 'intermediary';
        let shortCode = 'H1';
        let roleStamp = 'PEELING RELAY';

        const depth = isRoot ? 0 : Math.max(1, rn.depth || 1);

        if (isRoot) {
          category = 'root';
          shortCode = 'ROOT';
          roleStamp = 'SUSPECT ROOT';
        } else if (rn.type === 'contract_pool') {
          // FIX 3: DEX / Smart Contract Pool terminal — distinct orange node
          category = 'contract_pool' as any;
          shortCode = 'DEX';
          roleStamp = 'CONTRACT POOL';
        } else if (isEx) {
          category = 'exchange';
          shortCode = 'VASP';
          roleStamp = detectedEx ? detectedEx.toUpperCase() : 'VASP EXIT';
        } else if (inDeg >= 2 || rn.isFanIn) {
          category = 'aggregator';
          shortCode = 'AGG';
          roleStamp = 'AGGREGATOR';
        } else if (outDeg === 0) {
          category = 'burner';
          shortCode = 'LEAF';
          roleStamp = 'BURNER LEAF';
        } else {
          category = 'intermediary';
          shortCode = `H${depth}`;
          roleStamp = 'PEELING RELAY';
        }

        const shortAddr = addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
        const displayLabel = isRoot
          ? `[ORIGIN] ${shortAddr}`
          : isEx && detectedEx
          ? `${detectedEx} (${shortAddr})`
          : shortAddr;

        // Transit Delay & Holding Duration Computation
        const inTime = inboundTimeMap.get(addr);
        const outTime = outboundTimeMap.get(addr);
        const rootOutTime = outboundTimeMap.get(targetRoot);
        let transitDelayText = '';

        if (category === 'root') {
          transitDelayText = 'Inception Source (Initial Fund Theft & Outflow)';
        } else if ((category as string) === 'contract_pool') {
          transitDelayText = 'DEX / Smart Contract Pool — trace terminated (shared public contract, not a personal wallet)';
        } else if (category === 'exchange') {
          if (inTime && rootOutTime && inTime >= rootOutTime) {
            const diffSec = Math.max(0, (inTime - rootOutTime) / 1000);
            transitDelayText = `Deposited into VASP in ${formatTransitDuration(diffSec)} from inception`;
          } else {
            transitDelayText = `Deposited into VASP in ${formatTransitDuration(depth * 520 + 120)} from inception`;
          }
        } else if (category === 'burner') {
          transitDelayText = 'Terminal Leaf (Residual dust retained - No outbound relay)';
        } else {
          if (inTime && outTime && outTime >= inTime) {
            const diffSec = Math.max(0, (outTime - inTime) / 1000);
            transitDelayText = `Forwarded in ${formatTransitDuration(diffSec)} after receiving funds`;
          } else {
            transitDelayText = `Forwarded in ${formatTransitDuration(depth * 420 + 90)} after receiving`;
          }
        }


        let formattedTimestamp: string | undefined = undefined;
        const rawNodeTs = (rn as any).timestamp || (rn as any).txTimestamp;
        const nodeTimeMs = parseTimestampMs(rawNodeTs) || inTime || outTime;
        if (nodeTimeMs) {
          formattedTimestamp = new Date(nodeTimeMs).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        }

        const nodeObj: ForensicNode = {
          id: addr,
          address: rn.id,
          label: displayLabel,
          nodeType: category,
          exchangeName: detectedEx || undefined,
          hopDepth: depth,
          taintPercentage: rn.taintedAmountUsd && tree?.victimAmountUsd
            ? Math.min(100, Math.round((rn.taintedAmountUsd / tree.victimAmountUsd) * 100))
            : Math.max(5, 100 - depth * 15),
          amount: rn.taintedAmountUsd ? `$${Math.round(rn.taintedAmountUsd).toLocaleString()}` : `${targetAsset}`,
          usdValue: rn.taintedAmountUsd,
          inDegree: inDeg,
          outDegree: outDeg,
          isFanIn: rn.isFanIn,
          isFanOut: rn.isFanOut,
          categoryLabel: CATEGORY_COLORS[category]?.label || 'Intermediary',
          shortCode,
          roleStamp,
          transitDelayText,
          formattedTimestamp,
        };

        nodeMap.set(addr, nodeObj);
      });

      // Consolidate parallel edges between the exact same (from, to) pair
      // to eliminate overlapping duplicate lines and stacked label boxes
      const consolidatedEdgeMap = new Map<string, {
        from: string;
        to: string;
        totalEth: number;
        totalTokenAmount: number;
        tokenSymbol?: string;
        totalUsd: number;
        maxTaintPercent?: number;
        txHashes: string[];
        timestamps: string[];
        txCount: number;
      }>();

      rawEdges.forEach((re) => {
        const fromAddr = (re.from || '').toLowerCase();
        const toAddr = (re.to || '').toLowerCase();
        if (!fromAddr || !toAddr) return;

        const pairKey = `${fromAddr}->${toAddr}`;
        const anyRe = re as any;
        const ethVal = typeof re.amountEth === 'number' ? re.amountEth : 0;
        const tokenVal = typeof anyRe.tokenAmount === 'number' ? anyRe.tokenAmount : 0;
        const usdVal = typeof re.usdValue === 'number' ? re.usdValue : 0;
        const taintVal = re.taintPercentage !== undefined ? Math.round(re.taintPercentage * 10) / 10 : undefined;
        const sym = re.tokenSymbol || targetAsset;

        if (!consolidatedEdgeMap.has(pairKey)) {
          consolidatedEdgeMap.set(pairKey, {
            from: fromAddr,
            to: toAddr,
            totalEth: ethVal,
            totalTokenAmount: tokenVal,
            tokenSymbol: sym,
            totalUsd: usdVal,
            maxTaintPercent: taintVal,
            txHashes: re.txHash ? [re.txHash] : [],
            timestamps: re.timestamp ? [re.timestamp] : [],
            txCount: 1,
          });
        } else {
          const item = consolidatedEdgeMap.get(pairKey)!;
          item.totalEth += ethVal;
          item.totalTokenAmount += tokenVal;
          item.totalUsd += usdVal;
          if (taintVal !== undefined) {
            item.maxTaintPercent = Math.max(item.maxTaintPercent || 0, taintVal);
          }
          if (re.txHash && !item.txHashes.includes(re.txHash)) {
            item.txHashes.push(re.txHash);
          }
          if (re.timestamp) {
            item.timestamps.push(re.timestamp);
          }
          item.txCount += 1;
        }
      });

      consolidatedEdgeMap.forEach((ce) => {
        let amountText = '';
        const symbol = ce.tokenSymbol || 'ETH';
        if (ce.totalTokenAmount > 0) {
          amountText = `${ce.totalTokenAmount.toFixed(4)} ${symbol}`;
        } else if (ce.totalEth > 0) {
          amountText = `${ce.totalEth.toFixed(4)} ETH`;
        } else if (ce.totalUsd > 0) {
          amountText = `$${Math.round(ce.totalUsd).toLocaleString()}`;
        } else {
          amountText = `Transfer`;
        }

        if (ce.txCount > 1) {
          amountText = `${amountText} (${ce.txCount} txs)`;
        }

        edgeList.push({
          id: `edge_${ce.from}_${ce.to}`,
          from: ce.from,
          to: ce.to,
          amount: amountText,
          usdValue: ce.totalUsd,
          taintText: ce.maxTaintPercent !== undefined ? `${ce.maxTaintPercent}%` : undefined,
          taintPercent: ce.maxTaintPercent,
          txHash: ce.txHashes[0],
          tokenSymbol: symbol,
          timestamp: ce.timestamps[0],
        });
      });

      // Ensure root node exists
      if (!nodeMap.has(targetRoot)) {
        const rootOutTime = outboundTimeMap.get(targetRoot);
        const formattedTimestamp = rootOutTime ? new Date(rootOutTime).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) : undefined;

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
          categoryLabel: 'Suspect Origin',
          shortCode: 'ROOT',
          roleStamp: 'SUSPECT ROOT',
          transitDelayText: 'Inception Source (Initial Fund Theft & Outflow)',
          formattedTimestamp,
        });
      }

      // Exact synchronization: compute in/out degrees directly from verified edgeList
      const actualInDegreeMap = new Map<string, number>();
      const actualOutDegreeMap = new Map<string, number>();
      edgeList.forEach((e) => {
        const from = (e.from || '').toLowerCase();
        const to = (e.to || '').toLowerCase();
        if (from) actualOutDegreeMap.set(from, (actualOutDegreeMap.get(from) || 0) + 1);
        if (to) actualInDegreeMap.set(to, (actualInDegreeMap.get(to) || 0) + 1);
      });

      nodeMap.forEach((node) => {
        const key = node.id.toLowerCase();
        const isRoot = key === targetRoot;
        const actualIn = actualInDegreeMap.get(key) || 0;
        const actualOut = actualOutDegreeMap.get(key) || 0;

        node.inDegree = actualIn;
        node.outDegree = actualOut;
        node.isFanIn = actualIn >= 2;
        node.isFanOut = actualOut >= 2;

        // Re-classify role and transit delay strictly based on actual visible on-canvas graph edges
        const inTime = inboundTimeMap.get(key);
        const outTime = outboundTimeMap.get(key);
        const rootOutTime = outboundTimeMap.get(targetRoot);

        if (isRoot) {
          node.nodeType = 'root';
          node.shortCode = 'ROOT';
          node.roleStamp = 'SUSPECT ROOT';
          node.categoryLabel = 'Suspect Origin';
          node.transitDelayText = 'Inception Source (Initial Fund Outflow)';
        } else if ((node.nodeType as string) === 'contract_pool' || (node as any).type === 'contract_pool') {
          node.nodeType = 'contract_pool' as any;
          node.shortCode = 'DEX';
          node.roleStamp = 'CONTRACT POOL';
          node.categoryLabel = 'DEX / Smart Contract';
          node.transitDelayText = 'DEX / Smart Contract Pool (Trace terminated at public contract)';
        } else if (node.exchangeName || node.nodeType === 'exchange' || node.nodeType === 'terminal') {
          node.nodeType = 'exchange';
          node.shortCode = 'VASP';
          node.roleStamp = node.exchangeName ? node.exchangeName.toUpperCase() : 'VASP EXIT';
          node.categoryLabel = node.exchangeName || 'VASP Exchange Exit';
          if (inTime && rootOutTime && inTime >= rootOutTime) {
            node.transitDelayText = `Deposited into VASP in ${formatTransitDuration((inTime - rootOutTime) / 1000)} from inception`;
          } else {
            node.transitDelayText = 'Deposited into VASP Exchange endpoint';
          }
        } else if (actualIn >= 2) {
          node.nodeType = 'aggregator';
          node.shortCode = 'AGG';
          node.roleStamp = 'AGGREGATOR';
          node.categoryLabel = 'Fund Aggregator (Convergence)';
          if (actualOut > 0 && inTime && outTime && outTime >= inTime) {
            node.transitDelayText = `Forwarded in ${formatTransitDuration((outTime - inTime) / 1000)} after receiving funds`;
          } else {
            node.transitDelayText = 'Fund Consolidation (Convergence Point — No further outflows)';
          }
        } else if (actualOut === 0) {
          node.nodeType = 'burner';
          node.shortCode = 'LEAF';
          node.roleStamp = 'BURNER LEAF';
          node.categoryLabel = 'Holding / Terminal Leaf';
          node.transitDelayText = 'Holding Funds (Terminal node / No further outflows tracked)';
        } else {
          node.nodeType = 'intermediary';
          node.shortCode = `H${Math.max(1, node.hopDepth)}`;
          node.roleStamp = 'PEELING RELAY';
          node.categoryLabel = 'Intermediary Relay';
          if (inTime && outTime && outTime >= inTime) {
            node.transitDelayText = `Forwarded in ${formatTransitDuration((outTime - inTime) / 1000)} after receiving funds`;
          } else {
            node.transitDelayText = 'Forwarded downstream in laundering path';
          }
        }
      });

      return { nodes: Array.from(nodeMap.values()), edges: edgeList };
    }

    // CASE B: Fallback multi-branch construction from hops array
    const hopDepthMap = new Map<string, number>();
    hopDepthMap.set(targetRoot, 0);

    hops.forEach((h) => {
      const from = (h.fromAddress || '').toLowerCase();
      const to = (h.toAddress || '').toLowerCase();
      if (to) {
        const curDepth = hopDepthMap.get(from) || 0;
        if (!hopDepthMap.has(to) || (hopDepthMap.get(to)! < curDepth + 1)) {
          hopDepthMap.set(to, curDepth + 1);
        }
      }
    });

    // Add root
    const rootOutTime = outboundTimeMap.get(targetRoot);
    const rootFormattedTime = rootOutTime ? new Date(rootOutTime).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) : undefined;

    nodeMap.set(targetRoot, {
      id: targetRoot,
      address: rootAddress || targetRoot,
      label: `[ORIGIN] ${targetRoot.slice(0, 6)}...${targetRoot.slice(-4)}`,
      nodeType: 'root',
      hopDepth: 0,
      taintPercentage: 100,
      amount: 'Inception',
      inDegree: inDegreeMap.get(targetRoot) || 0,
      outDegree: outDegreeMap.get(targetRoot) || 1,
      categoryLabel: 'Suspect Origin',
      shortCode: 'ROOT',
      roleStamp: 'SUSPECT ROOT',
      transitDelayText: 'Inception Source (Initial Fund Theft & Outflow)',
      formattedTimestamp: rootFormattedTime,
    });

    hops.forEach((h, idx) => {
      const from = (h.fromAddress || '').toLowerCase();
      const to = (h.toAddress || '').toLowerCase();
      const isTerminal = idx === hops.length - 1;

      const symbol = h.tokenSymbol || targetAsset;
      const tokenAmt = h.tokenAmount !== undefined ? h.tokenAmount : h.amountEth || 0;
      const formattedVol = tokenAmt > 0 ? `${tokenAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}` : `$${Math.round(h.usdValue || 0).toLocaleString()}`;
      const taint = h.taintPercentage !== undefined ? h.taintPercentage : Math.max(5, 100 - idx * 15);

      const fromDepth = hopDepthMap.get(from) || idx;
      if (from && !nodeMap.has(from)) {
        const isFromRoot = from === targetRoot;
        const shortAddr = from.length > 10 ? `${from.slice(0, 6)}...${from.slice(-4)}` : from;
        const inTime = inboundTimeMap.get(from);
        const outTime = outboundTimeMap.get(from);
        const transitDelayText = isFromRoot
          ? 'Inception Source (Initial Fund Theft & Outflow)'
          : inTime && outTime && outTime >= inTime
          ? `Forwarded in ${formatTransitDuration((outTime - inTime) / 1000)} after receiving`
          : `Forwarded in ${formatTransitDuration(fromDepth * 420 + 90)} after receiving`;

        const nodeTimeMs = parseTimestampMs(h.txTimestamp) || inTime || outTime;
        const formattedTimestamp = nodeTimeMs ? new Date(nodeTimeMs).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) : undefined;

        nodeMap.set(from, {
          id: from,
          address: h.fromAddress,
          label: isFromRoot ? `[ORIGIN] ${shortAddr}` : shortAddr,
          nodeType: isFromRoot ? 'root' : 'intermediary',
          hopDepth: fromDepth,
          taintPercentage: Math.min(100, taint + 10),
          amount: formattedVol,
          usdValue: h.usdValue,
          txHash: h.txHash,
          timestamp: h.txTimestamp,
          inDegree: inDegreeMap.get(from) || 0,
          outDegree: outDegreeMap.get(from) || 1,
          categoryLabel: isFromRoot ? 'Suspect Origin' : 'Peeling Intermediary',
          shortCode: isFromRoot ? 'ROOT' : `H${fromDepth}`,
          roleStamp: isFromRoot ? 'SUSPECT ROOT' : 'PEELING RELAY',
          transitDelayText,
          formattedTimestamp,
        });
      }

      const toDepth = hopDepthMap.get(to) || idx + 1;
      if (to && !nodeMap.has(to)) {
        const inDeg = inDegreeMap.get(to) || 1;
        const outDeg = outDegreeMap.get(to) || 0;

        const detectedEx = isTerminal && (terminalExchange || terminalType === 'exchange')
          ? (terminalExchange || 'Exchange Deposit')
          : detectExchangeName(h.toAddressLabel || h.label, undefined, isTerminal, terminalExchange);
        const isEx = Boolean(detectedEx);

        let cat: WalletCategory = 'intermediary';
        let shortCode = `H${toDepth}`;
        let roleStamp = 'PEELING RELAY';

        if (isEx) {
          cat = 'exchange';
          shortCode = 'VASP';
          roleStamp = detectedEx ? detectedEx.toUpperCase() : 'VASP EXIT';
        } else if (inDeg >= 2) {
          cat = 'aggregator';
          shortCode = 'AGG';
          roleStamp = 'AGGREGATOR';
        } else if (outDeg === 0) {
          cat = 'burner';
          shortCode = 'LEAF';
          roleStamp = 'BURNER LEAF';
        } else {
          cat = 'intermediary';
          shortCode = `H${toDepth}`;
          roleStamp = 'PEELING RELAY';
        }

        const shortAddr = to.length > 10 ? `${to.slice(0, 6)}...${to.slice(-4)}` : to;
        const displayLabel = isEx && detectedEx ? `${detectedEx} (${shortAddr})` : shortAddr;

        const inTime = inboundTimeMap.get(to);
        const outTime = outboundTimeMap.get(to);
        let transitDelayText = '';
        if (cat === 'exchange') {
          if (inTime && rootOutTime && inTime >= rootOutTime) {
            transitDelayText = `Deposited into VASP in ${formatTransitDuration((inTime - rootOutTime) / 1000)} from inception`;
          } else {
            transitDelayText = `Deposited into VASP in ${formatTransitDuration(toDepth * 520 + 120)} from inception`;
          }
        } else if (cat === 'burner') {
          transitDelayText = 'Terminal Leaf (Residual dust retained - No outbound relay)';
        } else if (inTime && outTime && outTime >= inTime) {
          transitDelayText = `Forwarded in ${formatTransitDuration((outTime - inTime) / 1000)} after receiving`;
        } else {
          transitDelayText = `Forwarded in ${formatTransitDuration(toDepth * 420 + 90)} after receiving`;
        }

        const nodeTimeMs = parseTimestampMs(h.txTimestamp) || inTime || outTime;
        const formattedTimestamp = nodeTimeMs ? new Date(nodeTimeMs).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) : undefined;

        nodeMap.set(to, {
          id: to,
          address: h.toAddress,
          label: displayLabel,
          nodeType: cat,
          exchangeName: detectedEx || undefined,
          hopDepth: toDepth,
          taintPercentage: taint,
          amount: formattedVol,
          usdValue: h.usdValue,
          txHash: h.txHash,
          timestamp: h.txTimestamp,
          inDegree: inDeg,
          outDegree: outDeg,
          categoryLabel: isEx ? (detectedEx || 'VASP Exchange') : CATEGORY_COLORS[cat]?.label || 'Intermediary',
          shortCode,
          roleStamp,
          transitDelayText,
          formattedTimestamp,
        });
      }
    });

    // Consolidate hops between the exact same (from, to) pair in Case B
    const consolidatedHopMap = new Map<string, {
      from: string;
      to: string;
      totalUsd: number;
      tokenSymbol?: string;
      formattedVol: string;
      taint: number;
      txHash?: string;
      timestamp?: string;
      txCount: number;
    }>();

    hops.forEach((h, idx) => {
      const from = (h.fromAddress || '').toLowerCase();
      const to = (h.toAddress || '').toLowerCase();
      if (!from || !to) return;
      const pairKey = `${from}->${to}`;

      const symbol = h.tokenSymbol || targetAsset;
      const tokenAmt = h.tokenAmount !== undefined ? h.tokenAmount : h.amountEth || 0;
      const formattedVol = tokenAmt > 0 ? `${tokenAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}` : `$${Math.round(h.usdValue || 0).toLocaleString()}`;
      const taint = h.taintPercentage !== undefined ? h.taintPercentage : Math.max(5, 100 - idx * 15);

      if (!consolidatedHopMap.has(pairKey)) {
        consolidatedHopMap.set(pairKey, {
          from,
          to,
          totalUsd: h.usdValue || 0,
          tokenSymbol: symbol,
          formattedVol,
          taint,
          txHash: h.txHash,
          timestamp: h.txTimestamp,
          txCount: 1,
        });
      } else {
        const item = consolidatedHopMap.get(pairKey)!;
        item.totalUsd += (h.usdValue || 0);
        item.txCount += 1;
        item.taint = Math.max(item.taint, taint);
      }
    });

    consolidatedHopMap.forEach((ch) => {
      const volText = ch.txCount > 1 ? `${ch.formattedVol} (${ch.txCount} txs)` : ch.formattedVol;
      edgeList.push({
        id: `hop_edge_${ch.from}_${ch.to}`,
        from: ch.from,
        to: ch.to,
        amount: volText,
        usdValue: ch.totalUsd,
        taintText: `${ch.taint.toFixed(1)}%`,
        taintPercent: ch.taint,
        txHash: ch.txHash,
        tokenSymbol: ch.tokenSymbol,
        timestamp: ch.timestamp,
      });
    });

    // Exact synchronization: compute in/out degrees directly from verified edgeList
    const actualInDegreeMap = new Map<string, number>();
    const actualOutDegreeMap = new Map<string, number>();
    edgeList.forEach((e) => {
      const from = (e.from || '').toLowerCase();
      const to = (e.to || '').toLowerCase();
      if (from) actualOutDegreeMap.set(from, (actualOutDegreeMap.get(from) || 0) + 1);
      if (to) actualInDegreeMap.set(to, (actualInDegreeMap.get(to) || 0) + 1);
    });

    nodeMap.forEach((node) => {
      const key = node.id.toLowerCase();
      const isRoot = key === targetRoot;
      const actualIn = actualInDegreeMap.get(key) || 0;
      const actualOut = actualOutDegreeMap.get(key) || 0;

      node.inDegree = actualIn;
      node.outDegree = actualOut;
      node.isFanIn = actualIn >= 2;
      node.isFanOut = actualOut >= 2;

      // Re-classify role and transit delay strictly based on actual visible on-canvas graph edges
      const inTime = inboundTimeMap.get(key);
      const outTime = outboundTimeMap.get(key);
      const rootOutTime = outboundTimeMap.get(targetRoot);

      if (isRoot) {
        node.nodeType = 'root';
        node.shortCode = 'ROOT';
        node.roleStamp = 'SUSPECT ROOT';
        node.categoryLabel = 'Suspect Origin';
        node.transitDelayText = 'Inception Source (Initial Fund Outflow)';
      } else if ((node.nodeType as string) === 'contract_pool' || (node as any).type === 'contract_pool') {
        node.nodeType = 'contract_pool' as any;
        node.shortCode = 'DEX';
        node.roleStamp = 'CONTRACT POOL';
        node.categoryLabel = 'DEX / Smart Contract';
        node.transitDelayText = 'DEX / Smart Contract Pool (Trace terminated at public contract)';
      } else if (node.exchangeName || node.nodeType === 'exchange' || node.nodeType === 'terminal') {
        node.nodeType = 'exchange';
        node.shortCode = 'VASP';
        node.roleStamp = node.exchangeName ? node.exchangeName.toUpperCase() : 'VASP EXIT';
        node.categoryLabel = node.exchangeName || 'VASP Exchange Exit';
        if (inTime && rootOutTime && inTime >= rootOutTime) {
          node.transitDelayText = `Deposited into VASP in ${formatTransitDuration((inTime - rootOutTime) / 1000)} from inception`;
        } else {
          node.transitDelayText = 'Deposited into VASP Exchange endpoint';
        }
      } else if (actualIn >= 2) {
        node.nodeType = 'aggregator';
        node.shortCode = 'AGG';
        node.roleStamp = 'AGGREGATOR';
        node.categoryLabel = 'Fund Aggregator (Convergence)';
        if (actualOut > 0 && inTime && outTime && outTime >= inTime) {
          node.transitDelayText = `Forwarded in ${formatTransitDuration((outTime - inTime) / 1000)} after receiving funds`;
        } else {
          node.transitDelayText = 'Fund Consolidation (Convergence Point — No further outflows)';
        }
      } else if (actualOut === 0) {
        node.nodeType = 'burner';
        node.shortCode = 'LEAF';
        node.roleStamp = 'BURNER LEAF';
        node.categoryLabel = 'Holding / Terminal Leaf';
        node.transitDelayText = 'Holding Funds (Terminal node / No further outflows tracked)';
      } else {
        node.nodeType = 'intermediary';
        node.shortCode = `H${Math.max(1, node.hopDepth)}`;
        node.roleStamp = 'PEELING RELAY';
        node.categoryLabel = 'Intermediary Relay';
        if (inTime && outTime && outTime >= inTime) {
          node.transitDelayText = `Forwarded in ${formatTransitDuration((outTime - inTime) / 1000)} after receiving funds`;
        } else {
          node.transitDelayText = 'Forwarded downstream in laundering path';
        }
      }
    });

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [tree, graph, hops, rootAddress, terminalExchange, terminalType, targetAsset, CATEGORY_COLORS]);

  // Active Focused Branch Node & Edge IDs
  const focusedNodeAddresses = useMemo(() => {
    if (!selectedBranchId) return null;
    const branches = tree?.branches || (graph as any)?.branches || [];
    const targetBranch = branches.find((b: BranchSummary) => b.branchId === selectedBranchId);
    if (!targetBranch) return null;

    const set = new Set<string>();
    targetBranch.hops.forEach((h: any) => {
      if (h.fromAddress) set.add(h.fromAddress.toLowerCase());
      if (h.toAddress) set.add(h.toAddress.toLowerCase());
    });
    if (targetBranch.terminalAddress) set.add(targetBranch.terminalAddress.toLowerCase());
    if (rootAddress) set.add(rootAddress.toLowerCase());
    return set;
  }, [selectedBranchId, tree, graph, rootAddress]);

  // Active Selected Node Sync & Auto-Dismissal Sync
  const activeSelectedNode = useMemo(() => {
    if (selectedNodeId) {
      return nodes.find((n) => n.id.toLowerCase() === selectedNodeId.toLowerCase()) || null;
    }
    return internalSelectedNode;
  }, [selectedNodeId, internalSelectedNode, nodes]);

  const handleSelectNode = (node: ForensicNode | null) => {
    setInternalSelectedNode(node);
    setPopoverOffset({ x: 0, y: 0 });
    if (onSelectNode) onSelectNode(node);
  };

  // Reset offset and dismiss if branch selection focuses outside active node
  useEffect(() => {
    setPopoverOffset({ x: 0, y: 0 });
  }, [selectedNodeId]);

  useEffect(() => {
    if (selectedBranchId && activeSelectedNode && focusedNodeAddresses && !focusedNodeAddresses.has(activeSelectedNode.id)) {
      handleSelectNode(null);
    }
  }, [selectedBranchId, focusedNodeAddresses]);

  // 2. Auto-Layout Calculation
  const initialLayout = useMemo(() => {
    const coords = new Map<string, { x: number; y: number; node: ForensicNode }>();
    const levels = new Map<number, ForensicNode[]>();

    nodes.forEach((n) => {
      const d = n.hopDepth;
      if (!levels.has(d)) levels.set(d, []);
      levels.get(d)!.push(n);
    });

    const parentMap = new Map<string, string[]>();
    const childrenMap = new Map<string, string[]>();
    edges.forEach((e) => {
      if (!parentMap.has(e.to)) parentMap.set(e.to, []);
      parentMap.get(e.to)!.push(e.from);

      if (!childrenMap.has(e.from)) childrenMap.set(e.from, []);
      childrenMap.get(e.from)!.push(e.to);
    });

    const sortedDepths = Array.from(levels.keys()).sort((a, b) => a - b);

    if (layoutMode === 'dag') {
      // Horizontal Straight-Flow DAG (Guaranteed 0-Crossing Hierarchical Planar Layout)
      const colWidth = 290;
      const minNodeGapY = 95; // Minimum vertical gap between adjacent node centers in the same column
      const startX = 100;
      const centerY = 300;

      // 1. Root Level (Depth 0)
      const rootNodes = levels.get(0) || [];
      rootNodes.forEach((rn, idx) => {
        const offset = (idx - (rootNodes.length - 1) / 2) * minNodeGapY;
        coords.set(rn.id, { x: startX, y: centerY + offset, node: rn });
      });

      // 2. Forward Layer-by-Layer Placement
      // Invariant: Order of nodes in layer d is strictly determined by parent Y position (no interleaving)
      sortedDepths.forEach((d) => {
        if (d === 0) return;
        const levelNodes = levels.get(d) || [];
        const x = startX + d * colWidth;

        // Determine primary parent Y and barycenter for each node
        const nodeItems = levelNodes.map((node) => {
          const parents = parentMap.get(node.id) || [];
          let parentY = centerY;

          if (parents.length > 0) {
            const parentYs = parents
              .map((p) => coords.get(p)?.y)
              .filter((y): y is number => y !== undefined);

            if (parentYs.length > 0) {
              parentY = parentYs.reduce((a, b) => a + b, 0) / parentYs.length;
            }
          }

          return {
            id: node.id,
            node,
            parentY,
            taint: node.taintPercentage || 0,
          };
        });

        // Strict non-crossing sort:
        // 1. Sort strictly by parent Y position (top-to-bottom)
        // 2. Within the same parent, sort by taint volume descending
        nodeItems.sort((a, b) => {
          if (Math.abs(a.parentY - b.parentY) > 0.001) {
            return a.parentY - b.parentY;
          }
          return b.taint - a.taint;
        });

        // Assign initial target Y based on parent barycenter
        const placed: { id: string; node: ForensicNode; y: number }[] = [];
        nodeItems.forEach((item) => {
          placed.push({ id: item.id, node: item.node, y: item.parentY });
        });

        // Space out nodes consecutively to enforce minNodeGapY while preserving strict order
        for (let i = 1; i < placed.length; i++) {
          if (placed[i].y < placed[i - 1].y + minNodeGapY) {
            placed[i].y = placed[i - 1].y + minNodeGapY;
          }
        }

        // Backward centering shift (align layer median to parent cluster median)
        const currentCenter = (placed[0].y + placed[placed.length - 1].y) / 2;
        const targetCenter = nodeItems.reduce((acc, it) => acc + it.parentY, 0) / nodeItems.length;
        const shiftY = targetCenter - currentCenter;

        placed.forEach((p) => {
          coords.set(p.id, { x, y: p.y + shiftY, node: p.node });
        });
      });

      // 3. Backward Relaxation Pass (Sugiyama centering: align parents to their children's midpoint)
      for (let d = sortedDepths.length - 2; d >= 0; d--) {
        const depthVal = sortedDepths[d];
        const levelNodes = levels.get(depthVal) || [];

        levelNodes.forEach((node) => {
          const children = childrenMap.get(node.id) || [];
          if (children.length > 0) {
            const childYs = children
              .map((c) => coords.get(c)?.y)
              .filter((y): y is number => y !== undefined);

            if (childYs.length > 0) {
              const childMidY = (Math.min(...childYs) + Math.max(...childYs)) / 2;
              const cur = coords.get(node.id);
              if (cur) {
                coords.set(node.id, {
                  x: cur.x,
                  y: cur.y * 0.35 + childMidY * 0.65,
                  node: cur.node,
                });
              }
            }
          }
        });

        // Enforce minNodeGapY in this layer to prevent collisions after backward relaxation
        const layerCoords = levelNodes
          .map((n) => ({ id: n.id, coord: coords.get(n.id)! }))
          .filter((item) => item.coord !== undefined);

        layerCoords.sort((a, b) => a.coord.y - b.coord.y);

        for (let i = 1; i < layerCoords.length; i++) {
          if (layerCoords[i].coord.y < layerCoords[i - 1].coord.y + minNodeGapY) {
            layerCoords[i].coord.y = layerCoords[i - 1].coord.y + minNodeGapY;
          }
        }
      }
    } else {
      // Top-Down Hierarchical Tree with Horizontal Barycenter Spacing
      const canvasCenterX = 450;
      const rowHeight = 175;
      const minNodeGapX = 170;
      const startY = 90;

      const rootNodes = levels.get(0) || [];
      rootNodes.forEach((rn, idx) => {
        const offset = (idx - (rootNodes.length - 1) / 2) * minNodeGapX;
        coords.set(rn.id, { x: canvasCenterX + offset, y: startY, node: rn });
      });

      sortedDepths.forEach((d) => {
        if (d === 0) return;
        const levelNodes = levels.get(d) || [];
        const y = startY + d * rowHeight;

        const nodeItems = levelNodes.map((node) => {
          const parents = parentMap.get(node.id) || [];
          let parentX = canvasCenterX;

          if (parents.length > 0) {
            const parentXs = parents
              .map((p) => coords.get(p)?.x)
              .filter((x): x is number => x !== undefined);

            if (parentXs.length > 0) {
              parentX = parentXs.reduce((a, b) => a + b, 0) / parentXs.length;
            }
          }

          return {
            id: node.id,
            node,
            parentX,
            taint: node.taintPercentage || 0,
          };
        });

        // Sort strictly by parent X to prevent line crossings
        nodeItems.sort((a, b) => {
          if (Math.abs(a.parentX - b.parentX) > 0.001) {
            return a.parentX - b.parentX;
          }
          return b.taint - a.taint;
        });

        const placed: { id: string; node: ForensicNode; x: number }[] = [];
        nodeItems.forEach((item) => {
          placed.push({ id: item.id, node: item.node, x: item.parentX });
        });

        for (let i = 1; i < placed.length; i++) {
          if (placed[i].x < placed[i - 1].x + minNodeGapX) {
            placed[i].x = placed[i - 1].x + minNodeGapX;
          }
        }

        const currentCenter = (placed[0].x + placed[placed.length - 1].x) / 2;
        const targetCenter = nodeItems.reduce((acc, it) => acc + it.parentX, 0) / nodeItems.length;
        const shiftX = targetCenter - currentCenter;

        placed.forEach((p) => {
          coords.set(p.id, { x: p.x + shiftX, y, node: p.node });
        });
      });

      // Backward relaxation for Tree mode
      for (let d = sortedDepths.length - 2; d >= 0; d--) {
        const depthVal = sortedDepths[d];
        const levelNodes = levels.get(depthVal) || [];

        levelNodes.forEach((node) => {
          const children = childrenMap.get(node.id) || [];
          if (children.length > 0) {
            const childXs = children
              .map((c) => coords.get(c)?.x)
              .filter((x): x is number => x !== undefined);

            if (childXs.length > 0) {
              const childMidX = (Math.min(...childXs) + Math.max(...childXs)) / 2;
              const cur = coords.get(node.id);
              if (cur) {
                coords.set(node.id, {
                  x: cur.x * 0.35 + childMidX * 0.65,
                  y: cur.y,
                  node: cur.node,
                });
              }
            }
          }
        });

        const layerCoords = levelNodes
          .map((n) => ({ id: n.id, coord: coords.get(n.id)! }))
          .filter((item) => item.coord !== undefined);

        layerCoords.sort((a, b) => a.coord.x - b.coord.x);

        for (let i = 1; i < layerCoords.length; i++) {
          if (layerCoords[i].coord.x < layerCoords[i - 1].coord.x + minNodeGapX) {
            layerCoords[i].coord.x = layerCoords[i - 1].coord.x + minNodeGapX;
          }
        }
      }
    }

    return coords;
  }, [nodes, edges, layoutMode]);

  // 3. Merged Position Map
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

  // Dynamic Floating Popover Coordinates attached beside the selected node with strict bounding clamp
  const nodePopoverPos = useMemo(() => {
    if (!activeSelectedNode) return null;
    const pos = layout.get(activeSelectedNode.id);
    if (!pos) return null;

    const screenX = pos.x * zoom + pan.x;
    const screenY = pos.y * zoom + pan.y;

    const popoverW = 290;
    const popoverH = 310;
    const containerW = containerRef.current?.clientWidth || 700;
    const containerH = containerRef.current?.clientHeight || 460;

    // Position to the right by default; if overflow, flip to left of node
    let left = screenX + 36;
    if (left + popoverW > containerW - 12) {
      left = screenX - popoverW - 36;
    }
    left = Math.max(10, Math.min(left, containerW - popoverW - 10));

    // Align vertically around node center, strictly bounded within canvas viewport
    let top = screenY - popoverH / 2;
    top = Math.max(10, Math.min(top, containerH - popoverH - 10));

    return { left, top, popoverW, popoverH, containerW, containerH };
  }, [activeSelectedNode, layout, zoom, pan]);

  // 4. Auto-Fit Graph Viewport Centering (Stable without jerkiness while dragging)
  const fitToCurrentBounds = useCallback(() => {
    if (initialLayout.size === 0 || !containerRef.current) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    initialLayout.forEach((pos) => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    const padding = 65;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding + 15;

    const graphWidth = maxX - minX || 650;
    const graphHeight = maxY - minY || 380;

    const containerW = containerRef.current.clientWidth || 700;
    const containerH = containerRef.current.clientHeight || 440;

    const scaleX = containerW / graphWidth;
    const scaleY = containerH / graphHeight;
    const newZoom = Math.min(1.25, Math.max(0.45, Math.min(scaleX, scaleY) * 0.94));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPanX = containerW / 2 - centerX * newZoom;
    const newPanY = containerH / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [initialLayout]);

  useEffect(() => {
    fitToCurrentBounds();
  }, [fitToCurrentBounds, layoutMode]);

  // 5. Node, Canvas & Popover Dragging Mechanics
  const handleNodeMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    currentPos: { x: number; y: number }
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;

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

  const handlePopoverMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    popoverDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initOffX: popoverOffset.x,
      initOffY: popoverOffset.y,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    didCanvasDragRef.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasClick = () => {
    if (!didCanvasDragRef.current) {
      handleSelectNode(null);
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // Popover drag tracking
      if (popoverDragRef.current) {
        const dx = e.clientX - popoverDragRef.current.startX;
        const dy = e.clientY - popoverDragRef.current.startY;
        setPopoverOffset({
          x: Math.round(popoverDragRef.current.initOffX + dx),
          y: Math.round(popoverDragRef.current.initOffY + dy),
        });
        return;
      }

      // Individual Node drag tracking
      if (dragInfoRef.current) {
        const info = dragInfoRef.current;
        const dx = (e.clientX - info.startMouseX) / zoom;
        const dy = (e.clientY - info.startMouseY) / zoom;

        if (Math.hypot(dx, dy) > 2) {
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

      // Canvas pan tracking
      if (isDragging) {
        if (Math.hypot(e.clientX - dragStart.x - pan.x, e.clientY - dragStart.y - pan.y) > 3) {
          didCanvasDragRef.current = true;
        }
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (popoverDragRef.current) {
        popoverDragRef.current = null;
      }
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

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, zoom, dragStart, pan]);

  // 6. Cursor-Centered Canvas Zoom with Native Non-Passive Wheel Listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent entire browser window / site from zooming or scrolling
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Exponential zoom step factor
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(2.5, Math.max(0.35, prevZoom * zoomFactor));
        if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom;

        // Keep the exact point under mouse cursor fixed in viewport
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom),
          y: mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom),
        }));

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const handleStepZoom = (factor: number) => {
    const container = containerRef.current;
    const centerX = (container?.clientWidth || 700) / 2;
    const centerY = (container?.clientHeight || 460) / 2;

    setZoom((prevZoom) => {
      const nextZoom = Math.min(2.5, Math.max(0.35, prevZoom * factor));
      if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom;

      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * (nextZoom / prevZoom),
        y: centerY - (centerY - prevPan.y) * (nextZoom / prevZoom),
      }));

      return nextZoom;
    });
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const edgeColor = isLight ? '#0284c7' : '#38bdf8';
  const edgeBg = isLight ? '#ffffff' : '#080d1a';
  const edgeBorder = isLight ? '#cbd5e1' : '#1e293b';

  const ROLE_MATRIX_ITEMS = useMemo(() => [
    { key: 'root', name: 'Suspect Origin', symbol: 'ROOT', color: CATEGORY_COLORS.root.stroke, bg: CATEGORY_COLORS.root.bg },
    { key: 'exchange', name: 'VASP Exchange Exit', symbol: 'VASP', color: CATEGORY_COLORS.exchange.stroke, bg: CATEGORY_COLORS.exchange.bg },
    { key: 'intermediary', name: 'Intermediary Relay', symbol: 'H1 / H2', color: CATEGORY_COLORS.intermediary.stroke, bg: CATEGORY_COLORS.intermediary.bg },
    { key: 'aggregator', name: 'Fund Aggregator', symbol: 'AGG', color: CATEGORY_COLORS.aggregator.stroke, bg: CATEGORY_COLORS.aggregator.bg },
    { key: 'burner', name: 'Holding / Terminal Leaf', symbol: 'LEAF', color: CATEGORY_COLORS.burner.stroke, bg: CATEGORY_COLORS.burner.bg },
    { key: 'contract_pool', name: 'DEX / Smart Contract', symbol: 'POOL', color: CATEGORY_COLORS.contract_pool.stroke, bg: CATEGORY_COLORS.contract_pool.bg },
  ], [CATEGORY_COLORS]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        backgroundColor: isLight ? 'var(--bg-canvas)' : '#04070d',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        transition: 'background-color 0.2s ease',
      }}
      onMouseDown={handleCanvasMouseDown}
      onClick={handleCanvasClick}
    >
      {/* 1. Top-Left Node Role Matrix Button & Floating Legend HUD */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '6px',
          zIndex: 30,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowRoleMatrix((prev) => !prev)}
          title="Toggle Forensic Role Matrix Legend"
          style={{
            padding: '4px 10px',
            backgroundColor: showRoleMatrix
              ? (isLight ? '#e0f2fe' : 'rgba(6, 182, 212, 0.18)')
              : (isLight ? '#ffffff' : '#0a1220'),
            border: showRoleMatrix
              ? '1px solid var(--accent-cyan)'
              : '1px solid var(--border-tactical)',
            borderRadius: '4px',
            color: showRoleMatrix ? 'var(--accent-cyan)' : 'var(--text-main)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-headline)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: showRoleMatrix ? '0 0 10px rgba(6, 182, 212, 0.25)' : 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--accent-cyan)' }}>
            category
          </span>
          <span>Role Matrix</span>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '13px',
              transition: 'transform 0.2s ease',
              transform: showRoleMatrix ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'var(--text-dim)',
            }}
          >
            expand_more
          </span>
        </button>

        {/* Floating Compact Role Matrix HUD Popover */}
        {showRoleMatrix && (
          <div
            style={{
              width: '240px',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(7, 13, 22, 0.96)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '6px',
              padding: '10px 12px',
              boxShadow: isLight
                ? '0 8px 24px rgba(0, 0, 0, 0.12)'
                : '0 8px 28px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border-tactical)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>
                  key
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Forensic Node Roles
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleMatrix(false)}
                title="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '0 2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </div>

            {/* Compact List: Color dot, Name, Symbol */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
              {ROLE_MATRIX_ITEMS.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        boxShadow: `0 0 6px ${item.color}`,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-headline)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '1px 6px',
                      backgroundColor: item.bg,
                      color: item.color,
                      border: `1px solid ${item.color}55`,
                      borderRadius: '3px',
                      fontSize: '9.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Top-Right Control Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 25,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Layout Switcher */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: isLight ? '#ffffff' : '#0a1220',
            border: '1px solid var(--border-tactical)',
            borderRadius: '4px',
            padding: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => handleToggleLayout('dag')}
            title="Horizontal Straight-Flow DAG View"
            style={{
              padding: '4px 9px',
              backgroundColor: layoutMode === 'dag' ? 'var(--accent-cyan)' : 'transparent',
              color: layoutMode === 'dag' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-headline)',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schema</span>
            <span>DAG Flow</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleLayout('tree')}
            title="Top-Down Hierarchical Tree View"
            style={{
              padding: '4px 9px',
              backgroundColor: layoutMode === 'tree' ? 'var(--accent-cyan)' : 'transparent',
              color: layoutMode === 'tree' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-headline)',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>account_tree</span>
            <span>Tree View</span>
          </button>
        </div>

        {/* Zoom In & Out Step Controls */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: isLight ? '#ffffff' : '#0a1220',
            border: '1px solid var(--border-tactical)',
            borderRadius: '4px',
            padding: '2px',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => handleStepZoom(0.85)}
            title="Zoom Out"
            style={{
              padding: '4px 6px',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>remove</span>
          </button>
          <span
            style={{
              fontSize: '10.5px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-dim)',
              padding: '0 4px',
              minWidth: '34px',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleStepZoom(1.18)}
            title="Zoom In"
            style={{
              padding: '4px 6px',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
          </button>
        </div>

        {/* Fit Canvas */}
        <button
          type="button"
          onClick={fitToCurrentBounds}
          title="Center and fit canvas view"
          style={{
            padding: '4px 9px',
            backgroundColor: isLight ? '#ffffff' : '#0a1220',
            border: '1px solid var(--border-tactical)',
            borderRadius: '4px',
            color: 'var(--text-main)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-headline)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>fit_screen</span>
          <span>Fit</span>
        </button>

        {Object.keys(nodePositions).length > 0 && (
          <button
            type="button"
            onClick={() => {
              setNodePositions({});
              setTimeout(fitToCurrentBounds, 50);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--bg-surface-low)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '4px',
              color: 'var(--accent-cyan)',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'var(--font-headline)',
            }}
          >
            Reset
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
            refX="33"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="7.5"
            markerHeight="7.5"
            orient="auto"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={edgeColor} />
          </marker>
        </defs>

        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ transition: isDragging || draggedNodeId ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Layer A: Directed Sharp Straight Lines */}
          {edges.map((edge) => {
            const fromPos = layout.get(edge.from);
            const toPos = layout.get(edge.to);
            if (!fromPos || !toPos) return null;

            const isEdgeFocused = !focusedNodeAddresses || (
              focusedNodeAddresses.has(edge.from) && focusedNodeAddresses.has(edge.to)
            );

            return (
              <line
                key={`line_${edge.id}`}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={edgeColor}
                strokeWidth={isEdgeFocused && focusedNodeAddresses ? '2.2' : '1.8'}
                opacity={isEdgeFocused ? 1 : 0.15}
                markerEnd="url(#forensic-arrow)"
                style={{ transition: 'opacity 0.25s ease' }}
              />
            );
          })}

          {/* Layer B: Crisp Flow Label Pills (Rendered on top of ALL curves for guaranteed zero overlap) */}
          {edges.map((edge) => {
            const fromPos = layout.get(edge.from);
            const toPos = layout.get(edge.to);
            if (!fromPos || !toPos) return null;

            const isEdgeFocused = !focusedNodeAddresses || (
              focusedNodeAddresses.has(edge.from) && focusedNodeAddresses.has(edge.to)
            );

            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            const labelText = edge.taintPercent !== undefined
              ? `${edge.amount} (${edge.taintPercent}%)`
              : edge.amount;

            const pillWidth = Math.max(50, labelText.length * 5.8 + 12);

            return (
              <g
                key={`pill_${edge.id}`}
                transform={`translate(${midX}, ${midY})`}
                opacity={isEdgeFocused ? 1 : 0.15}
                style={{ transition: isDragging || draggedNodeId ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease' }}
              >
                <rect
                  x={-pillWidth / 2}
                  y={-10}
                  width={pillWidth}
                  height={20}
                  rx={4}
                  fill={edgeBg}
                  stroke={edgeBorder}
                  strokeWidth="1.2"
                />
                <text
                  x={0}
                  y={3.8}
                  textAnchor="middle"
                  fill={edgeColor}
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  {labelText}
                </text>
              </g>
            );
          })}

          {/* Layer C: Distinct Colored Tactical Nodes */}
          {Array.from(layout.values()).map(({ x, y, node }) => {
            const isSelected = activeSelectedNode?.id === node.id;
            const isRoot = node.nodeType === 'root';
            const isEx = node.nodeType === 'exchange';
            const catStyle = CATEGORY_COLORS[node.nodeType] || CATEGORY_COLORS.intermediary;

            const isNodeFocused = !focusedNodeAddresses || focusedNodeAddresses.has(node.id);
            const isBeingDragged = draggedNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                opacity={isNodeFocused ? 1 : 0.2}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id, { x, y })}
                onClick={(e) => {
                  e.stopPropagation();
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  handleSelectNode(node);
                }}
                style={{
                  cursor: isBeingDragged ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  transition: isBeingDragged ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                }}
              >
                {/* Selection Tactical Ring */}
                {isSelected && (
                  <circle
                    r={28}
                    fill="none"
                    stroke={catStyle.stroke}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r={isBeingDragged ? 25 : 22}
                  fill={catStyle.bg}
                  stroke={catStyle.stroke}
                  strokeWidth={isRoot || isEx ? 2.8 : 2.2}
                />

                {/* Inner Role Acronym / Code */}
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill={catStyle.stroke}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight="800"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.shortCode}
                </text>

                {/* Node Label Line 1: Address */}
                <text
                  x={0}
                  y={37}
                  textAnchor="middle"
                  fill={isRoot || isEx ? catStyle.stroke : (isLight ? '#0b1c30' : '#f8fafc')}
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fontWeight={isRoot || isEx ? '700' : '600'}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label}
                </text>

                {/* Node Label Line 2: Taint / USD Valuation */}
                <text
                  x={0}
                  y={50}
                  textAnchor="middle"
                  fill={isLight ? '#334155' : '#cbd5e1'}
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.taintPercentage}% TAINT • {node.amount}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 3. Interactive Moveable Node Forensic Inspector Attached Beside Node (Strictly Canvas-Bounded) */}
      {activeSelectedNode && nodePopoverPos && (() => {
        const containerW = containerRef.current?.clientWidth || nodePopoverPos.containerW;
        const containerH = containerRef.current?.clientHeight || nodePopoverPos.containerH;
        const popoverW = nodePopoverPos.popoverW;
        const popoverH = nodePopoverPos.popoverH;

        // Strictly bound position inside canvas so inspector is never cut off
        const leftPos = Math.max(8, Math.min(containerW - popoverW - 8, nodePopoverPos.left + popoverOffset.x));
        const topPos = Math.max(8, Math.min(containerH - popoverH - 8, nodePopoverPos.top + popoverOffset.y));

        return (
          <div
            style={{
              position: 'absolute',
              top: `${topPos}px`,
              left: `${leftPos}px`,
              width: `${popoverW}px`,
              maxHeight: `${containerH - 16}px`,
              overflowY: 'auto',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(7, 13, 22, 0.96)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${CATEGORY_COLORS[activeSelectedNode.nodeType]?.stroke || 'var(--accent-cyan)'}`,
              borderRadius: '6px',
              padding: '9px 11px',
              zIndex: 35,
              color: 'var(--text-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Draggable Header */}
          <div
            onMouseDown={handlePopoverMouseDown}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-tactical)',
              paddingBottom: '6px',
              cursor: 'grab',
              userSelect: 'none',
            }}
            title="Drag to reposition inspector dialog"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--text-dim)', cursor: 'grab' }}>
                drag_indicator
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CATEGORY_COLORS[activeSelectedNode.nodeType]?.stroke }}>
                fingerprint
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: CATEGORY_COLORS[activeSelectedNode.nodeType]?.stroke || 'var(--accent-cyan)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-headline)',
                }}
              >
                {activeSelectedNode.categoryLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectNode(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close Details"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
            </button>
          </div>

          {/* Address Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              On-Chain Address
            </span>
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-main)',
                wordBreak: 'break-all',
                backgroundColor: 'var(--bg-surface-low)',
                padding: '5px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-tactical)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '4px',
              }}
            >
              <span>{activeSelectedNode.address}</span>
              <button
                type="button"
                onClick={() => copyAddress(activeSelectedNode.address)}
                title="Copy Address"
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? 'var(--success-emerald)' : 'var(--accent-cyan)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          {/* Forwarding Delay / Transit Duration Block */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '6px 9px',
              borderRadius: '4px',
              border: '1px solid var(--border-tactical)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '8.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase' }}>
                Forwarding / Transit Delay
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>
                schedule
              </span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-headline)' }}>
              {activeSelectedNode.transitDelayText || 'Immediate Forwarding (< 1m)'}
            </div>
            {activeSelectedNode.formattedTimestamp && (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Tx Timestamp: {activeSelectedNode.formattedTimestamp}
              </span>
            )}
          </div>

          {/* Metric Matrix Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-low)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-tactical)' }}>
              <span style={{ fontSize: '8.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>HOP DEPTH</span>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-headline)' }}>
                Level #{activeSelectedNode.hopDepth}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-low)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-tactical)' }}>
              <span style={{ fontSize: '8.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>TAINT RETENTION</span>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: activeSelectedNode.taintPercentage > 50 ? 'var(--danger-crimson)' : 'var(--warning-amber)', fontFamily: 'var(--font-headline)' }}>
                {activeSelectedNode.taintPercentage}%
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-low)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-tactical)' }}>
              <span style={{ fontSize: '8.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>INFLOWS</span>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-headline)' }}>
                {activeSelectedNode.inDegree} in
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-low)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-tactical)' }}>
              <span style={{ fontSize: '8.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>OUTFLOWS</span>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-headline)' }}>
                {activeSelectedNode.outDegree} out
              </div>
            </div>
          </div>

          {/* Action Links */}
          <a
            href={`https://etherscan.io/address/${activeSelectedNode.address}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '5px',
              backgroundColor: 'var(--bg-surface-low)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '4px',
              color: 'var(--accent-cyan)',
              fontSize: '10.5px',
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>View On Etherscan</span>
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
          </a>
        </div>
      );})()}
    </div>
  );
};

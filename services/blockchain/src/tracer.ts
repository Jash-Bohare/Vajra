import { TraceHop, TerminalType } from '@rt-cfas/types';
import { EthereumProvider, NormalizedTx, checksumAddress } from './index';

export interface TraceResult {
  hops: TraceHop[];
  terminalType: TerminalType;
  terminalExchange?: string;
  hopDepthUsed: number;
}

export type VaspLookupFn = (address: string) => string | undefined;

/**
 * Greedy Single-Path Tracing Engine (Doc 03 Section 17)
 * At each wallet, follows the single largest outgoing ETH transaction,
 * filtering out failed & zero-value transactions.
 */
export async function traceWalletHops(
  startAddress: string,
  provider: EthereumProvider,
  vaspLookup: VaspLookupFn,
  maxHops: number = 5
): Promise<TraceResult> {
  const hops: TraceHop[] = [];
  let currentAddress = checksumAddress(startAddress);
  let terminalType: TerminalType = 'inconclusive';
  let terminalExchange: string | undefined = undefined;

  const visitedAddresses = new Set<string>([currentAddress.toLowerCase()]);

  for (let hopIndex = 1; hopIndex <= maxHops; hopIndex++) {
    // 1. Fetch transactions for current address
    const txs: NormalizedTx[] = await provider.getTransactions(currentAddress);

    // 2. Filter outgoing transactions from current address
    const outgoingTxs = txs.filter((tx) => {
      const isFromCurrent = tx.fromAddress.toLowerCase() === currentAddress.toLowerCase();
      const isNotSelf = tx.toAddress.toLowerCase() !== currentAddress.toLowerCase();
      const isValidRecipient = Boolean(tx.toAddress);
      const isNotFailed = !tx.isFailed;
      const hasValue = tx.amountEth > 0;
      const notVisited = !visitedAddresses.has(tx.toAddress.toLowerCase());

      return isFromCurrent && isNotSelf && isValidRecipient && isNotFailed && hasValue && notVisited;
    });

    // 3. If no outgoing valid transfer, stop tracing
    if (outgoingTxs.length === 0) {
      break;
    }

    // 4. Select the single largest outgoing transaction by ETH value (Greedy Heuristic)
    outgoingTxs.sort((a, b) => b.amountEth - a.amountEth);
    const largestTx = outgoingTxs[0];

    const nextAddress = checksumAddress(largestTx.toAddress);
    visitedAddresses.add(nextAddress.toLowerCase());

    const currentHop: TraceHop = {
      hopIndex,
      fromAddress: currentAddress,
      toAddress: nextAddress,
      amountEth: largestTx.amountEth,
      txHash: largestTx.txHash,
      txTimestamp: largestTx.timestamp,
    };

    hops.push(currentHop);

    // 5. Check if nextAddress matches a known Exchange / VASP deposit address
    const matchedExchange = vaspLookup(nextAddress);
    if (matchedExchange) {
      terminalType = 'exchange';
      terminalExchange = matchedExchange;
      break;
    }

    // Continue tracing from next address
    currentAddress = nextAddress;
  }

  return {
    hops,
    terminalType,
    terminalExchange,
    hopDepthUsed: hops.length,
  };
}

/**
 * Transforms raw trace hops into an InvestigationGraph object (Doc 03 Section 5 & Doc 04 Phase 3)
 */
export function buildInvestigationGraph(
  startAddress: string,
  hops: TraceHop[],
  terminalType: TerminalType,
  terminalExchange?: string
) {
  const rootAddr = checksumAddress(startAddress);
  const nodes: { id: string; type: 'wallet' | 'exchange'; label?: string }[] = [];
  const edges: { from: string; to: string; amountEth: number; txHash: string; timestamp: string }[] = [];
  const nodeSet = new Set<string>();

  // Add suspect root node
  nodes.push({ id: rootAddr, type: 'wallet' });
  nodeSet.add(rootAddr.toLowerCase());

  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const isTerminalHop = i === hops.length - 1;
    const isExchangeNode = isTerminalHop && terminalType === 'exchange';

    // Edge
    edges.push({
      from: hop.fromAddress,
      to: hop.toAddress,
      amountEth: hop.amountEth,
      txHash: hop.txHash,
      timestamp: hop.txTimestamp,
    });

    // Destination Node
    if (!nodeSet.has(hop.toAddress.toLowerCase())) {
      nodes.push({
        id: hop.toAddress,
        type: isExchangeNode ? 'exchange' : 'wallet',
        label: isExchangeNode ? terminalExchange : undefined,
      });
      nodeSet.add(hop.toAddress.toLowerCase());
    }
  }

  return {
    nodes,
    edges,
    terminal: {
      type: terminalType,
      exchangeName: terminalExchange,
    },
  };
}

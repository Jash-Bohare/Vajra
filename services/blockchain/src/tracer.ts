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

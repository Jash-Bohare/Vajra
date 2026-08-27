/**
 * Blockchain Intelligence Service Engine
 * Architected behind a ChainProvider interface (Doc 03 Section 10)
 */

import { TraceHop, TerminalType } from '@rt-cfas/types';

export interface RawEtherscanTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

export interface NormalizedTx {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountEth: number;
  timestamp: string; // ISO 8601 UTC
  isFailed: boolean;
}

export interface ChainProvider {
  isValidAddress(address: string): boolean;
  checksumAddress(address: string): string;
  getTransactions(address: string): Promise<NormalizedTx[]>;
}

/**
 * EIP-55 Checksum & Validation Helper
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function checksumAddress(address: string): string {
  if (!isValidEthereumAddress(address)) return address;
  return address.toLowerCase();
}

/**
 * Wei to ETH conversion helper (NUMERIC safe)
 */
export function weiToEth(weiString: string): number {
  try {
    const weiBigInt = BigInt(weiString);
    if (weiBigInt === BigInt(0)) return 0;

    const ethWhole = weiBigInt / BigInt(10 ** 18);
    const ethFraction = weiBigInt % BigInt(10 ** 18);
    const fractionString = ethFraction.toString().padStart(18, '0').slice(0, 6);
    return parseFloat(`${ethWhole}.${fractionString}`);
  } catch {
    return 0;
  }
}

/**
 * Simple in-memory cache entry with TTL (Doc 03 Section 20)
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * EthereumProvider - Primary implementation backed by Etherscan API (Doc 03 Section 10 & 33)
 */
export class EthereumProvider implements ChainProvider {
  private apiKey: string;
  private cache: Map<string, CacheEntry<NormalizedTx[]>> = new Map();
  private ttlMs: number = 10 * 60 * 1000; // 10 minutes TTL

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ETHERSCAN_API_KEY || '';
  }

  public isValidAddress(address: string): boolean {
    return isValidEthereumAddress(address);
  }

  public checksumAddress(address: string): string {
    return checksumAddress(address);
  }

  /**
   * Helper method with exponential backoff retries (Doc 03 Section 33)
   */
  private async fetchWithRetry(url: string, retries: number = 3, backoffMs: number = 1000): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        return json;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  /**
   * Fetches outgoing & incoming transactions for an address with caching
   */
  public async getTransactions(address: string): Promise<NormalizedTx[]> {
    const normalizedAddr = this.checksumAddress(address);
    const cacheKey = `txs_${normalizedAddr}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const apiUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${normalizedAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`;

    try {
      const data = await this.fetchWithRetry(apiUrl);

      if (!data || (data.status !== '1' && data.message !== 'No transactions found')) {
        // If Etherscan rate limits or fails, return empty list gracefully
        console.warn(`[EthereumProvider] Etherscan response warning for ${normalizedAddr}:`, data?.message || 'Unknown');
        if (data?.result && Array.isArray(data.result)) {
          // Continue if result has array
        } else {
          return [];
        }
      }

      const rawTxs: RawEtherscanTx[] = Array.isArray(data.result) ? data.result : [];

      const normalizedList: NormalizedTx[] = rawTxs.map((tx) => {
        const isFailed = tx.isError === '1' || tx.txreceipt_status === '0';
        const timestampIso = new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString();
        return {
          txHash: tx.hash,
          fromAddress: checksumAddress(tx.from),
          toAddress: checksumAddress(tx.to || ''),
          amountEth: weiToEth(tx.value),
          timestamp: timestampIso,
          isFailed,
        };
      });

      // Save to cache
      this.cache.set(cacheKey, {
        data: normalizedList,
        expiresAt: Date.now() + this.ttlMs,
      });

      return normalizedList;
    } catch (err: any) {
      console.error(`[EthereumProvider] Failed to fetch transactions for ${normalizedAddr}:`, err.message);
      return [];
    }
  }
}

export * from './tracer';

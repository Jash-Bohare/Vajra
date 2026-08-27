/**
 * Blockchain Intelligence Service Engine
 * Architected behind a ChainProvider interface (Doc 03 Section 10 & Spec 08)
 */

import { TraceHop, TerminalType, AssetType } from '@rt-cfas/types';

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

export interface RawEtherscanTokenTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

export interface NormalizedTx {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountEth: number; // 0 for pure token transfers
  timestamp: string; // ISO 8601 UTC
  isFailed: boolean;
  tokenSymbol?: AssetType;
  tokenAmount?: number;
  tokenDecimals?: number;
  usdValue?: number;
  isInternalTx?: boolean;
  contractAddress?: string;
}

export interface ChainProvider {
  isValidAddress(address: string): boolean;
  checksumAddress(address: string): string;
  getTransactions(address: string): Promise<NormalizedTx[]>;
  getTokenTransactions(address: string): Promise<NormalizedTx[]>;
  getInternalTransactions(address: string): Promise<NormalizedTx[]>;
}

/**
 * Tracked Token Contracts & Decimals (Spec 08)
 */
export const TRACKED_ERC20_CONTRACTS: Record<string, AssetType> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT', // Tether USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC', // USD Coin
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI', // Dai Stablecoin
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH', // Wrapped ETH
};

export const TOKEN_DECIMALS: Record<AssetType, number> = {
  ETH: 18,
  USDT: 6,
  USDC: 6,
  DAI: 18,
  WETH: 18,
  ERC20: 18,
};

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
 * EthereumProvider - Primary implementation backed by Etherscan API (Doc 03 Section 10 & Spec 08)
 */
export class EthereumProvider implements ChainProvider {
  private apiKey: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ttlMs: number = 10 * 60 * 1000; // 10 minutes TTL
  private cachedEthPriceUsd: number = 3000.0; // Fallback ETH price in USD
  private lastRequestTime: number = 0;
  private minIntervalMs: number = 220; // Guarantee <= 4.5 req/sec rate limit compliance

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
   * Throttled fetch with automatic rate-limit retry & backoff
   */
  private async fetchWithRetry(url: string, retries: number = 4, backoffMs: number = 600): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      // Throttle outgoing HTTP calls to respect Etherscan rate limit
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minIntervalMs) {
        await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - timeSinceLast));
      }
      this.lastRequestTime = Date.now();

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();

        // If Etherscan returned rate-limit response ("NOTOK" or "Max rate limit reached")
        if (
          json &&
          json.status === '0' &&
          (json.message === 'NOTOK' || (typeof json.result === 'string' && json.result.includes('rate limit')))
        ) {
          console.warn(`[EthereumProvider] Etherscan rate limit hit (Attempt ${attempt}/${retries}). Retrying...`);
          if (attempt === retries) throw new Error('Etherscan rate limit exceeded max retries.');
          await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
          continue;
        }

        return json;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  /**
   * Fetches outgoing & incoming native ETH transactions for an address with caching
   */
  public async getTransactions(address: string): Promise<NormalizedTx[]> {
    const normalizedAddr = this.checksumAddress(address);
    const cacheKey = `txs_${normalizedAddr}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const apiUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${normalizedAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`;

    try {
      const data = await this.fetchWithRetry(apiUrl);

      if (!data || (data.status !== '1' && data.message !== 'No transactions found')) {
        if (!data?.result || !Array.isArray(data.result)) {
          // DO NOT cache failed/rate-limited responses!
          return [];
        }
      }

      const rawTxs: RawEtherscanTx[] = Array.isArray(data.result) ? data.result : [];

      const normalizedList: NormalizedTx[] = rawTxs.map((tx) => {
        const isFailed = tx.isError === '1' || tx.txreceipt_status === '0';
        const timestampIso = new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString();
        const amountEth = weiToEth(tx.value);
        const usdValue = amountEth > 0 ? parseFloat((amountEth * this.cachedEthPriceUsd).toFixed(2)) : 0;

        return {
          txHash: tx.hash,
          fromAddress: checksumAddress(tx.from),
          toAddress: checksumAddress(tx.to || ''),
          amountEth,
          usdValue,
          timestamp: timestampIso,
          tokenSymbol: 'ETH',
          isFailed,
        };
      });

      // Cache valid result
      this.cache.set(cacheKey, { data: normalizedList, expiresAt: Date.now() + this.ttlMs });
      return normalizedList;
    } catch (err: any) {
      console.error(`[EthereumProvider] Failed to fetch ETH txs for ${normalizedAddr}:`, err.message);
      return [];
    }
  }

  /**
   * Fetches ERC-20 token transfers for an address with caching (Spec 08)
   */
  public async getTokenTransactions(address: string): Promise<NormalizedTx[]> {
    const normalizedAddr = this.checksumAddress(address);
    const cacheKey = `tokentx_${normalizedAddr}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const apiUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&address=${normalizedAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`;

    try {
      const data = await this.fetchWithRetry(apiUrl);

      if (!data || (data.status !== '1' && data.message !== 'No transactions found')) {
        if (!data?.result || !Array.isArray(data.result)) {
          // DO NOT cache failed/rate-limited responses!
          return [];
        }
      }

      const rawTxs: RawEtherscanTokenTx[] = Array.isArray(data.result) ? data.result : [];

      const normalizedList: NormalizedTx[] = rawTxs
        .filter((tx) => {
          const contractLower = (tx.contractAddress || '').toLowerCase();
          return Boolean(TRACKED_ERC20_CONTRACTS[contractLower]);
        })
        .map((tx) => {
          const contractLower = (tx.contractAddress || '').toLowerCase();
          const trackedSymbol = TRACKED_ERC20_CONTRACTS[contractLower] || 'ERC20';

          const decimals = parseInt(tx.tokenDecimal || '18', 10);
          const rawVal = BigInt(tx.value || '0');
          const tokenAmount = parseFloat((Number(rawVal) / Math.pow(10, decimals)).toFixed(4));
          const timestampIso = new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString();

          // [BUG FIX #2] amountEth = 0 for pure token transfers. usdValue = tokenAmount for stablecoins (USDT/USDC/DAI)
          const usdValue = ['USDT', 'USDC', 'DAI'].includes(trackedSymbol)
            ? tokenAmount
            : parseFloat((tokenAmount * this.cachedEthPriceUsd).toFixed(2));

          return {
            txHash: tx.hash,
            fromAddress: checksumAddress(tx.from),
            toAddress: checksumAddress(tx.to || ''),
            amountEth: 0, // BUG FIX #2: Native ETH is 0 for pure token transfer
            tokenSymbol: trackedSymbol,
            tokenAmount,
            tokenDecimals: decimals,
            usdValue,
            contractAddress: contractLower,
            timestamp: timestampIso,
            isFailed: false,
            isInternalTx: false,
          };
        });

      // Cache valid result
      this.cache.set(cacheKey, { data: normalizedList, expiresAt: Date.now() + this.ttlMs });
      return normalizedList;
    } catch (err: any) {
      console.error(`[EthereumProvider] Failed to fetch Token txs for ${normalizedAddr}:`, err.message);
      return [];
    }
  }

  /**
   * Fetches internal smart contract transactions for an address with caching (Spec 08)
   */
  public async getInternalTransactions(address: string): Promise<NormalizedTx[]> {
    const normalizedAddr = this.checksumAddress(address);
    const cacheKey = `internal_${normalizedAddr}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const apiUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlistinternal&address=${normalizedAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${this.apiKey}`;

    try {
      const data = await this.fetchWithRetry(apiUrl);

      if (!data || (data.status !== '1' && data.message !== 'No transactions found')) {
        if (!data?.result || !Array.isArray(data.result)) {
          // DO NOT cache failed/rate-limited responses!
          return [];
        }
      }

      const rawTxs: any[] = Array.isArray(data.result) ? data.result : [];

      const normalizedList: NormalizedTx[] = rawTxs
        .filter((tx) => tx.isError === '0')
        .map((tx) => {
          const timestampIso = new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString();
          const amountEth = weiToEth(tx.value);
          const usdValue = parseFloat((amountEth * this.cachedEthPriceUsd).toFixed(2));

          return {
            txHash: tx.hash,
            fromAddress: checksumAddress(tx.from),
            toAddress: checksumAddress(tx.to || ''),
            amountEth,
            usdValue,
            timestamp: timestampIso,
            tokenSymbol: 'ETH',
            isFailed: false,
            isInternalTx: true,
          };
        });

      // Cache valid result
      this.cache.set(cacheKey, { data: normalizedList, expiresAt: Date.now() + this.ttlMs });
      return normalizedList;
    } catch (err: any) {
      console.error(`[EthereumProvider] Failed to fetch Internal txs for ${normalizedAddr}:`, err.message);
      return [];
    }
  }
}

export * from './tracer';
export * from './treeTracer';

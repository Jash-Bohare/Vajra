/**
 * Blockchain Intelligence Service Engine
 * Architected behind a ChainProvider interface (Doc 03 Section 10)
 */

export interface RawTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError?: string;
  txreceipt_status?: string;
}

export interface NormalizedTx {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountEth: number;
  timestamp: string; // ISO 8601 UTC
}

export interface ChainProvider {
  isValidAddress(address: string): boolean;
  checksumAddress(address: string): string;
  getTransactions(address: string): Promise<NormalizedTx[]>;
}

/**
 * EIP-55 Checksum address validator stub
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Wei to ETH conversion helper (NUMERIC safe)
 */
export function weiToEth(weiString: string): number {
  try {
    const weiBigInt = BigInt(weiString);
    const ethWhole = weiBigInt / BigInt(10 ** 18);
    const ethFraction = weiBigInt % BigInt(10 ** 18);
    const fractionString = ethFraction.toString().padStart(18, '0').slice(0, 6);
    return parseFloat(`${ethWhole}.${fractionString}`);
  } catch {
    return 0;
  }
}

/**
 * EthereumProvider - Primary implementation backed by Etherscan API (Doc 03 Section 10)
 */
export class EthereumProvider implements ChainProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  public isValidAddress(address: string): boolean {
    return isValidEthereumAddress(address);
  }

  public checksumAddress(address: string): string {
    // Returns basic normalized address for v1 skeleton
    return address.toLowerCase();
  }

  public async getTransactions(address: string): Promise<NormalizedTx[]> {
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Ethereum address: ${address}`);
    }

    // Phase 2 will implement live Etherscan fetch & in-memory caching.
    // Returns skeleton response for Phase 1 health check.
    return [];
  }
}

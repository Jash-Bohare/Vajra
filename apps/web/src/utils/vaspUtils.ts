/**
 * VAJRA Multi-VASP Forensic Discovery & Legal Compliance Utilities
 * Real-time aggregation of all discovered exchange exit points and LEA contacts.
 */

export interface DiscoveredVasp {
  name: string;
  address: string;
  taintPercentage: number;
  trappedUsd: number;
  hopCount: number;
  branchId?: string;
  depositTxHash?: string;
  timestamp?: string;
}

export interface ExchangeLeaInfo {
  leaPortalUrl: string;
  leaEmail?: string;
  leaPortalName: string;
  responseTimeDays: string;
  jurisdiction: string;
  notes: string;
}

export const EXCHANGE_LEA_INFO: Record<string, ExchangeLeaInfo> = {
  Binance: {
    leaPortalUrl: 'https://www.binance.com/en/support/law-enforcement',
    leaPortalName: 'Binance LEA Portal (Kodex)',
    leaEmail: 'law_enforcement@binance.com',
    responseTimeDays: '3-7 business days',
    jurisdiction: 'Cayman Islands / Global',
    notes: 'Binance cooperates with INTERPOL, CBI, and state cyber cells. Submit formal preservation request first.',
  },
  Coinbase: {
    leaPortalUrl: 'https://www.coinbase.com/legal/law_enforcement',
    leaPortalName: 'Coinbase Law Enforcement Portal',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'United States (SEC regulated)',
    notes: 'Requires official government email and formal MLA or MLAT request for foreign agencies.',
  },
  Kraken: {
    leaPortalUrl: 'https://www.kraken.com/legal/law-enforcement',
    leaPortalName: 'Kraken Law Enforcement Portal',
    leaEmail: 'lawenforcement@kraken.com',
    responseTimeDays: '5-14 business days',
    jurisdiction: 'United States',
    notes: 'Submit signed court order or preservation letter. Kraken has dedicated LEA compliance team.',
  },
  OKX: {
    leaPortalUrl: 'https://www.okx.com/legal/law-enforcement',
    leaPortalName: 'OKX LEA Request Portal',
    leaEmail: 'compliance@okx.com',
    responseTimeDays: '7-14 business days',
    jurisdiction: 'Seychelles / Dubai',
    notes: 'OKX requires formal government request letter with case reference number.',
  },
  Bybit: {
    leaPortalUrl: 'https://www.bybit.com/en-US/help-center/article/Law-Enforcement-Requests',
    leaPortalName: 'Bybit Compliance Portal',
    leaEmail: 'compliance@bybit.com',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'Dubai',
    notes: 'Submit via official law enforcement portal. Include investigation ID and wallet address evidence.',
  },
  KuCoin: {
    leaPortalUrl: 'https://www.kucoin.com/legal/law-enforcement',
    leaPortalName: 'KuCoin LEA Portal',
    leaEmail: 'compliance@kucoin.com',
    responseTimeDays: '7-14 business days',
    jurisdiction: 'Seychelles',
    notes: 'Requires notarized official government request for account freeze.',
  },
  'Gate.io': {
    leaPortalUrl: 'https://www.gate.io/law-enforcement',
    leaPortalName: 'Gate.io Compliance Portal',
    leaEmail: 'compliance@gate.io',
    responseTimeDays: '7-21 business days',
    jurisdiction: 'Cayman Islands',
    notes: 'Submit via email with formal LEA letter. Gate.io has dedicated compliance team for law enforcement.',
  },
  Gate: {
    leaPortalUrl: 'https://www.gate.io/law-enforcement',
    leaPortalName: 'Gate.io Compliance Portal',
    leaEmail: 'compliance@gate.io',
    responseTimeDays: '7-21 business days',
    jurisdiction: 'Cayman Islands',
    notes: 'Submit via email with formal LEA letter. Gate.io has dedicated compliance team for law enforcement.',
  },
  WazirX: {
    leaPortalUrl: 'https://wazirx.com/legal',
    leaPortalName: 'WazirX Compliance Contact',
    leaEmail: 'compliance@wazirx.com',
    responseTimeDays: '2-5 business days',
    jurisdiction: 'India (registered entity)',
    notes: 'Indian jurisdiction. Fastest response for Indian LEA agencies. Integrates with SAHYOG platform.',
  },
  CoinDCX: {
    leaPortalUrl: 'https://coindcx.com/compliance',
    leaPortalName: 'CoinDCX Compliance Team',
    leaEmail: 'legal@coindcx.com',
    responseTimeDays: '2-5 business days',
    jurisdiction: 'India (registered entity)',
    notes: 'Indian jurisdiction. Cooperates directly with CBI, ED, and state cyber cells via SAHYOG.',
  },
  HTX: {
    leaPortalUrl: 'https://www.htx.com/legal/law-enforcement',
    leaPortalName: 'HTX Law Enforcement Portal',
    leaEmail: 'compliance@htx.com',
    responseTimeDays: '7-14 business days',
    jurisdiction: 'Seychelles',
    notes: 'Formerly Huobi. Submit preservation request before filing formal freeze order.',
  },
  Bitfinex: {
    leaPortalUrl: 'https://www.bitfinex.com/legal/law-enforcement',
    leaPortalName: 'Bitfinex Compliance Portal',
    leaEmail: 'legal@bitfinex.com',
    responseTimeDays: '7-21 business days',
    jurisdiction: 'British Virgin Islands',
    notes: 'Requires official government request with judicial authorization.',
  },
  Bitstamp: {
    leaPortalUrl: 'https://www.bitstamp.net/legal/law-enforcement',
    leaPortalName: 'Bitstamp LEA Portal',
    leaEmail: 'legal@bitstamp.net',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'Luxembourg (EU regulated)',
    notes: 'EU-regulated exchange. Fastest response for Europol and EU member LEA agencies.',
  },
  Gemini: {
    leaPortalUrl: 'https://www.gemini.com/legal/law-enforcement',
    leaPortalName: 'Gemini Law Enforcement Portal',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'United States (NYDFS licensed)',
    notes: 'Gemini is NYDFS-regulated. Submit formal preservation requests with court authorization.',
  },
  'Crypto.com': {
    leaPortalUrl: 'https://crypto.com/legal/law-enforcement',
    leaPortalName: 'Crypto.com LEA Portal',
    leaEmail: 'compliance@crypto.com',
    responseTimeDays: '5-14 business days',
    jurisdiction: 'Singapore / Malta',
    notes: 'Submit via LEA portal. Include suspect wallet, transaction evidence, and case reference.',
  },
  BingX: {
    leaPortalUrl: 'https://bingx.com/en-us/law-enforcement/',
    leaPortalName: 'BingX Law Enforcement Support',
    leaEmail: 'lawenforcement@bingx.com',
    responseTimeDays: '3-7 business days',
    jurisdiction: 'Singapore / Lithuania',
    notes: 'BingX provides dedicated point of contact for registered law enforcement agencies.',
  },
  MEXC: {
    leaPortalUrl: 'https://www.mexc.com/en-US/support/law-enforcement',
    leaPortalName: 'MEXC Compliance Gateway',
    leaEmail: 'compliance@mexc.com',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'Seychelles',
    notes: 'Submit Section 91 CrPC notice with transaction IDs and suspect deposit addresses.',
  },
  Bitget: {
    leaPortalUrl: 'https://www.bitget.com/support/articles/law-enforcement',
    leaPortalName: 'Bitget Legal & Compliance',
    leaEmail: 'compliance@bitget.com',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'Seychelles',
    notes: 'Submit through Kodex portal or direct email with official law enforcement credentials.',
  },
};

/**
 * Normalizes exchange name to standard canonical casing
 */
export function normalizeExchangeName(rawName?: string): string {
  if (!rawName) return 'Verified VASP';
  const clean = rawName.split('(')[0].trim();
  const lower = clean.toLowerCase();

  if (lower.includes('binance')) return 'Binance';
  if (lower.includes('coinbase')) return 'Coinbase';
  if (lower.includes('kraken')) return 'Kraken';
  if (lower.includes('gate')) return 'Gate.io';
  if (lower.includes('okx')) return 'OKX';
  if (lower.includes('bybit')) return 'Bybit';
  if (lower.includes('kucoin')) return 'KuCoin';
  if (lower.includes('wazirx')) return 'WazirX';
  if (lower.includes('coindcx')) return 'CoinDCX';
  if (lower.includes('htx') || lower.includes('huobi')) return 'HTX';
  if (lower.includes('bitfinex')) return 'Bitfinex';
  if (lower.includes('bitstamp')) return 'Bitstamp';
  if (lower.includes('gemini')) return 'Gemini';
  if (lower.includes('crypto.com')) return 'Crypto.com';
  if (lower.includes('bingx')) return 'BingX';
  if (lower.includes('mexc')) return 'MEXC';
  if (lower.includes('bitget')) return 'Bitget';

  return clean || 'Verified VASP';
}

/**
 * Dynamically extracts all discovered VASPs across tree branches, graph nodes, and hops.
 */
export function extractDiscoveredVasps(data: any): DiscoveredVasp[] {
  if (!data) return [];
  const vaspsMap = new Map<string, DiscoveredVasp>();

  const totalLossUsd =
    data.victimAmountUsd ||
    data.tree?.victimAmountUsd ||
    data.graph?.victimAmountUsd ||
    (data.hops && data.hops[0]?.usdValue) ||
    0;

  // 1. Extract from tree.branches
  const branches: any[] = data.tree?.branches || [];
  for (const b of branches) {
    if (b.terminalType === 'exchange' || Boolean(b.exchangeName)) {
      const canonicalName = normalizeExchangeName(b.exchangeName || data.terminalExchange);
      const addr = b.terminalAddress || '';
      const key = (addr || canonicalName).toLowerCase();
      const lastHop = b.hops && b.hops.length > 0 ? b.hops[b.hops.length - 1] : undefined;

      const taint =
        b.taintPercentage !== undefined
          ? Number(b.taintPercentage)
          : totalLossUsd > 0 && b.finalAmountUsd
          ? (Number(b.finalAmountUsd) / totalLossUsd) * 100
          : 0;

      const usd =
        b.finalAmountUsd !== undefined
          ? Number(b.finalAmountUsd)
          : totalLossUsd > 0
          ? totalLossUsd * (taint / 100)
          : 0;

      if (!vaspsMap.has(key)) {
        vaspsMap.set(key, {
          name: canonicalName,
          address: addr,
          taintPercentage: Math.round(taint * 10) / 10,
          trappedUsd: Math.round(usd * 100) / 100,
          hopCount: b.hopCount || (b.hops ? b.hops.length : 1),
          branchId: b.branchId,
          depositTxHash: lastHop?.txHash,
          timestamp: lastHop?.txTimestamp,
        });
      } else {
        const existing = vaspsMap.get(key)!;
        existing.taintPercentage = Math.round((existing.taintPercentage + taint) * 10) / 10;
        existing.trappedUsd = Math.round((existing.trappedUsd + usd) * 100) / 100;
        if (!existing.address && addr) existing.address = addr;
      }
    }
  }

  // 2. Extract from tree.nodes or graph.nodes
  const nodes: any[] = data.tree?.nodes || data.graph?.nodes || [];
  for (const n of nodes) {
    const rawLabel = n.label || '';
    const isEx =
      n.type === 'exchange' ||
      n.walletCategory === 'exchange' ||
      Boolean((n as any).isTerminalExchange) ||
      rawLabel.toLowerCase().includes('binance') ||
      rawLabel.toLowerCase().includes('gate') ||
      rawLabel.toLowerCase().includes('coinbase') ||
      rawLabel.toLowerCase().includes('okx') ||
      rawLabel.toLowerCase().includes('kraken') ||
      rawLabel.toLowerCase().includes('bybit') ||
      rawLabel.toLowerCase().includes('kucoin') ||
      rawLabel.toLowerCase().includes('bingx') ||
      rawLabel.toLowerCase().includes('mexc') ||
      rawLabel.toLowerCase().includes('bitget');

    if (isEx) {
      const canonicalName = normalizeExchangeName(rawLabel || n.label || data.terminalExchange);
      const addr = n.id || '';
      const key = (addr || canonicalName).toLowerCase();

      if (!vaspsMap.has(key)) {
        const taint =
          n.taintPercentage !== undefined
            ? Number(n.taintPercentage)
            : totalLossUsd > 0 && n.taintedAmountUsd
            ? (Number(n.taintedAmountUsd) / totalLossUsd) * 100
            : 0;

        const usd =
          n.taintedAmountUsd ||
          n.totalReceivedUsd ||
          (totalLossUsd > 0 ? totalLossUsd * (taint / 100) : 0);

        vaspsMap.set(key, {
          name: canonicalName,
          address: addr,
          taintPercentage: Math.round(taint * 10) / 10,
          trappedUsd: Math.round(usd * 100) / 100,
          hopCount: n.depth || 1,
        });
      }
    }
  }

  // 3. Fallback: If terminalExchange is set but no nodes matched yet
  if (vaspsMap.size === 0 && (data.terminalType === 'exchange' || data.terminalExchange)) {
    const canonicalName = normalizeExchangeName(data.terminalExchange);
    const lastHop = data.hops && data.hops.length > 0 ? data.hops[data.hops.length - 1] : undefined;
    const addr = lastHop?.toAddress || data.walletAddress || '';
    const key = (addr || canonicalName).toLowerCase();

    vaspsMap.set(key, {
      name: canonicalName,
      address: addr,
      taintPercentage: 100,
      trappedUsd: totalLossUsd,
      hopCount: data.hops ? data.hops.length : 1,
      depositTxHash: lastHop?.txHash,
      timestamp: lastHop?.txTimestamp,
    });
  }

  return Array.from(vaspsMap.values());
}

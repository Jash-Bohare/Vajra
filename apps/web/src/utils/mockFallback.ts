/**
 * Robust Client-Side Mock Fallback Dataset for Standalone Vercel Deployments
 * Allows judges and external evaluators to fully explore all features (DAG, Multi-VASP,
 * AI/ML Threat Intelligence, and Section 65B Subpoena) even without a local backend active.
 */

export const MOCK_INVESTIGATION_DOSSIER: any = {
  id: 'dfd6ee90-60cb-41c2-985f-5e67b3c6c32f',
  walletAddress: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
  chain: 'ethereum',
  targetAsset: 'ETH',
  victimAmountUsd: 15250.0,
  riskScore: 88.5,
  mlScore: 92.4,
  fraudProbability: 0.94,
  riskLevel: 'high',
  confidence: 'high',
  mlModelVersion: 'v1.0-xgb200',
  mlFallbackUsed: false,
  terminalType: 'exchange',
  terminalExchange: 'Binance',
  rootAddress: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
  ethPriceUsd: 2640.50,
  timestamp: new Date().toISOString(),

  featureImportance: [
    { feature: 'min_time_between_hops_sec', shap_value: 26.4, direction: 'increases_risk', value: '42s' },
    { feature: 'is_peeling_chain', shap_value: 21.2, direction: 'increases_risk', value: 'True' },
    { feature: 'total_fan_out_nodes', shap_value: 14.5, direction: 'increases_risk', value: '4 branches' },
    { feature: 'destination_wallet_prior_tx_count', shap_value: -8.1, direction: 'decreases_risk', value: '1,420 txs' },
  ],

  graphMetrics: {
    node_count: 11,
    edge_count: 10,
    is_linear_chain: false,
    is_star_topology: false,
    is_hourglass_topology: true,
    max_fan_out_degree: 3,
    max_fan_in_degree: 2,
    density: 0.18,
    clustering_coefficient: 0.0,
    min_hop_velocity_sec: 42.0,
    max_hop_velocity_sec: 310.0,
    total_usd_transacted: 15250.0,
    value_decay_ratio: 0.18,
    entropy: 1.48,
  },

  aiNarrative: `FORENSIC INVESTIGATIVE SUMMARY // CASE REF: MHA-I4C-2026-9909
  
PARAGRAPH 1: INCIDENT ORIGIN & DISPERSION
On-chain analysis of suspect wallet 0x0d694430b5e34d65aa04a23d38b74c9f4f60342b reveals an orchestrated multi-branch peeling syndicate origin involving $15,250.00 USDT across 4 sequential hop layers. Within 184 seconds of the primary siphoning event, funds were rapidly fractionated into 3 intermediate burner addresses.

PARAGRAPH 2: EXCHANGE ATTRIBUTION & VASP CLUSTERING
Terminal flow correlation successfully mapped 100% of trapped illicit assets across two major regulated Virtual Asset Service Providers (VASPs):
- Binance Global Cluster (Deposit Account: 0x88c94...e412): $8,120.00 USDT (53.2% retained taint)
- Gate.io Compliance Desk (Deposit Account: 0x3ab71...904b): $7,130.00 USDT (46.8% retained taint)

PARAGRAPH 3: STATUTORY DIRECTIVE & EVIDENCE CERTIFICATION
Under Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA) and Section 91 CrPC, immediate emergency lien-marking is recommended to prevent fiat liquidation. Cryptographic SHA-256 state digest: 8F2A-99B1-E491-CC40.`,

  narrativeGeneratedBy: 'gemini-2.0-flash',

  hops: [
    {
      hopIndex: 1,
      fromAddress: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
      toAddress: '0x2a3f89b1c7d24e9081a293847b56c012984f1a23',
      amountEth: 5.77,
      usdValue: 15250.0,
      tokenSymbol: 'ETH',
      txHash: '0x71c499a82e01b34f89d02c7b56a1938472901a83746b52c019283746b52a991b',
      txTimestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      hopIndex: 2,
      fromAddress: '0x2a3f89b1c7d24e9081a293847b56c012984f1a23',
      toAddress: '0x88c94e0192b83746b52c019283746b52a991e412',
      amountEth: 3.07,
      usdValue: 8120.0,
      tokenSymbol: 'ETH',
      txHash: '0x99b1c7d82e01b34f89d02c7b56a1938472901a83746b52c019283746b52a441a',
      txTimestamp: new Date(Date.now() - 3540000).toISOString(),
      isExchange: true,
      exchangeName: 'Binance',
    },
    {
      hopIndex: 2,
      fromAddress: '0x2a3f89b1c7d24e9081a293847b56c012984f1a23',
      toAddress: '0x3ab71904b82e01b34f89d02c7b56a1938472901a',
      amountEth: 2.70,
      usdValue: 7130.0,
      tokenSymbol: 'ETH',
      txHash: '0x44a1c7d82e01b34f89d02c7b56a1938472901a83746b52c019283746b52a881f',
      txTimestamp: new Date(Date.now() - 3500000).toISOString(),
      isExchange: true,
      exchangeName: 'Gate.io',
    }
  ],

  tree: {
    rootAddress: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
    totalNodes: 11,
    totalBranches: 3,
    exchangeBranches: 2,
    totalTrappedValuationUsd: 15250.0,
    targetAsset: 'ETH',
    nodes: [
      { id: 'node-root', address: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b', hop: 0, taintScore: 100, siphonValueUsd: 15250, taintValueUsd: 15250, label: 'Suspect Root (0x0d69...)' },
      { id: 'node-h1-1', address: '0x2a3f89b1c7d24e9081a293847b56c012984f1a23', hop: 1, taintScore: 100, siphonValueUsd: 15250, taintValueUsd: 15250, label: 'Splitter #1' },
      { id: 'node-h2-binance', address: '0x88c94e0192b83746b52c019283746b52a991e412', hop: 2, taintScore: 53.2, siphonValueUsd: 8120, taintValueUsd: 8120, isExchange: true, exchangeName: 'Binance', label: 'Binance Deposit' },
      { id: 'node-h2-gateio', address: '0x3ab71904b82e01b34f89d02c7b56a1938472901a', hop: 2, taintScore: 46.8, siphonValueUsd: 7130, taintValueUsd: 7130, isExchange: true, exchangeName: 'Gate.io', label: 'Gate.io Deposit' },
    ],
    edges: [
      { id: 'e1', source: 'node-root', target: 'node-h1-1', amountEth: 5.77, usdValue: 15250, taintedAmountUsd: 15250, txHash: '0x71c4...991b' },
      { id: 'e2', source: 'node-h1-1', target: 'node-h2-binance', amountEth: 3.07, usdValue: 8120, taintedAmountUsd: 8120, txHash: '0x99b1...441a' },
      { id: 'e3', source: 'node-h1-1', target: 'node-h2-gateio', amountEth: 2.70, usdValue: 7130, taintedAmountUsd: 7130, txHash: '0x44a1...881f' },
    ]
  }
};

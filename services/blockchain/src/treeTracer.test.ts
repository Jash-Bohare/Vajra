import { EthereumProvider, NormalizedTx } from './index';
import { traceWalletTree } from './treeTracer';

/**
 * Phase E2 Multi-Branch Tree Engine Automated Unit Test Suite
 */
async function runTreeTracerTests() {
  console.log('🧪 Running Phase E2 Multi-Branch Tree Engine Unit Tests...\n');

  class MockProvider extends EthereumProvider {
    private txMap = new Map<string, NormalizedTx[]>();

    constructor() {
      super('mock_api_key');
    }

    setTxs(address: string, txs: Partial<NormalizedTx>[]) {
      const fullTxs: NormalizedTx[] = txs.map((t) => ({
        fromAddress: t.fromAddress || '',
        toAddress: t.toAddress || '',
        amountEth: t.amountEth || 0,
        usdValue: t.usdValue || 0,
        txHash: t.txHash || '0xmock',
        timestamp: t.timestamp || '2026-08-25T10:00:00.000Z',
        isFailed: t.isFailed ?? false,
        tokenSymbol: t.tokenSymbol,
        tokenAmount: t.tokenAmount,
        tokenDecimals: t.tokenDecimals,
        isInternalTx: t.isInternalTx,
        contractAddress: t.contractAddress,
      }));
      this.txMap.set(address.toLowerCase(), fullTxs);
    }

    override async getTransactions(address: string): Promise<NormalizedTx[]> {
      return this.txMap.get(address.toLowerCase()) || [];
    }
    override async getTokenTransactions(address: string): Promise<NormalizedTx[]> {
      return this.txMap.get(address.toLowerCase()) || [];
    }
    override async getInternalTransactions(): Promise<NormalizedTx[]> {
      return [];
    }
  }

  const provider = new MockProvider();
  const mockVaspLookup = (addr: string) => {
    if (addr.toLowerCase() === '0xexchange00000000000000000000000000000001') return 'Binance';
    if (addr.toLowerCase() === '0xexchange00000000000000000000000000000002') return 'Coinbase';
    return undefined;
  };

  // Test 1: Fan-Out Splitting (1 root -> 2 branches)
  const root = '0xroot0000000000000000000000000000000000000';
  const child1 = '0xchild10000000000000000000000000000000000';
  const child2 = '0xchild20000000000000000000000000000000000';
  const ex1 = '0xexchange00000000000000000000000000000001';

  provider.setTxs(root, [
    {
      fromAddress: root,
      toAddress: child1,
      amountEth: 1.0,
      usdValue: 3000,
      txHash: '0xhash1',
      timestamp: '2026-08-25T10:00:00.000Z',
      tokenSymbol: 'ETH',
    },
    {
      fromAddress: root,
      toAddress: child2,
      amountEth: 2.0,
      usdValue: 6000,
      txHash: '0xhash2',
      timestamp: '2026-08-25T10:05:00.000Z',
      tokenSymbol: 'ETH',
    },
  ]);

  provider.setTxs(child1, [
    {
      fromAddress: child1,
      toAddress: ex1,
      amountEth: 1.0,
      usdValue: 3000,
      txHash: '0xhash3',
      timestamp: '2026-08-25T10:30:00.000Z',
      tokenSymbol: 'ETH',
    },
  ]);

  const res1 = await traceWalletTree(root, provider, mockVaspLookup, 5, 'ETH');

  console.log('Test 1: Fan-Out Multi-Branch Traversal');
  console.assert(res1.tree.totalBranches >= 2, `Expected >= 2 branches, got ${res1.tree.totalBranches}`);
  console.assert(res1.tree.exchangeBranches === 1, `Expected 1 exchange branch, got ${res1.tree.exchangeBranches}`);
  console.assert(res1.tree.totalFanOutNodes >= 1, `Expected >= 1 fan-out node, got ${res1.tree.totalFanOutNodes}`);
  console.assert(res1.terminalType === 'exchange', `Expected terminalType exchange, got ${res1.terminalType}`);
  console.assert(res1.terminalExchange === 'Binance', `Expected terminalExchange Binance, got ${res1.terminalExchange}`);
  console.log('✅ Test 1 Passed!\n');

  // Test 2: Fan-In Taint Accumulation (Convergence)
  const rootA = '0xrootA00000000000000000000000000000000000';
  const branchNode1 = '0xb100000000000000000000000000000000000000';
  const branchNode2 = '0xb200000000000000000000000000000000000000';
  const fanInHub = '0xfaninhub00000000000000000000000000000000';

  const provider2 = new MockProvider();
  provider2.setTxs(rootA, [
    {
      fromAddress: rootA,
      toAddress: branchNode1,
      amountEth: 1.0,
      usdValue: 3000,
      txHash: '0xhA1',
      timestamp: '2026-08-25T10:00:00.000Z',
      tokenSymbol: 'USDT',
    },
    {
      fromAddress: rootA,
      toAddress: branchNode2,
      amountEth: 2.0,
      usdValue: 6000,
      txHash: '0xhA2',
      timestamp: '2026-08-25T10:01:00.000Z',
      tokenSymbol: 'USDT',
    },
  ]);

  provider2.setTxs(branchNode1, [
    {
      fromAddress: branchNode1,
      toAddress: fanInHub,
      amountEth: 1.0,
      usdValue: 3000,
      txHash: '0xhB1',
      timestamp: '2026-08-25T10:15:00.000Z',
      tokenSymbol: 'USDT',
    },
  ]);

  provider2.setTxs(branchNode2, [
    {
      fromAddress: branchNode2,
      toAddress: fanInHub,
      amountEth: 2.0,
      usdValue: 6000,
      txHash: '0xhB2',
      timestamp: '2026-08-25T10:16:00.000Z',
      tokenSymbol: 'USDT',
    },
  ]);

  const res2 = await traceWalletTree(rootA, provider2, mockVaspLookup, 5, 'USDT');

  console.log('Test 2: Fan-In Taint Accumulation');
  const hubNode = res2.tree.nodes.find((n) => n.id.toLowerCase() === fanInHub.toLowerCase());
  console.assert(hubNode !== undefined, 'Fan-In Hub node should exist in graph');
  console.assert(hubNode?.isFanIn === true, 'Fan-In Hub node should have isFanIn = true');
  console.assert(hubNode?.taintedAmountUsd === 9000, `Expected accumulated taint $9000, got $${hubNode?.taintedAmountUsd}`);
  console.assert(res2.tree.totalFanInNodes === 1, `Expected 1 totalFanInNodes, got ${res2.tree.totalFanInNodes}`);
  console.log('✅ Test 2 Passed!\n');

  console.log('🎉 All Phase E2 Multi-Branch Tree Engine Unit Tests Passed Successfully!');
}

runTreeTracerTests().catch((err) => {
  console.error('❌ Tree tracer test failed:', err);
  process.exit(1);
});

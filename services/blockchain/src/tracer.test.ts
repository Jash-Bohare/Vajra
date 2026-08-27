import { TraceHop } from '@rt-cfas/types';
import { buildInvestigationGraph } from './index';

/**
 * Phase 3 Automated Graph & Attribution Test Suite
 */
function runTests() {
  console.log('🧪 Running Phase 3 Graph & Attribution Tests...\n');

  // Test Case 1: Exchange Matched Trace Graph
  const startWallet = '0x53ef6da5fc74cdef214367240b0d96c34231258d';
  const sampleHops: TraceHop[] = [
    {
      hopIndex: 1,
      fromAddress: '0x53ef6da5fc74cdef214367240b0d96c34231258d',
      toAddress: '0x321f2238b7448edc08d0e24777fa2e4a0eb31a2b',
      amountEth: 10.99,
      txHash: '0x3a6c477af6fd6c06b3fa5e294579e005623bf826ccbe90d4db4433dd7e4f3151',
      txTimestamp: '2024-07-25T01:46:35.000Z',
    },
    {
      hopIndex: 2,
      fromAddress: '0x321f2238b7448edc08d0e24777fa2e4a0eb31a2b',
      toAddress: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3',
      amountEth: 10.989853,
      txHash: '0xeb252bbd1ed76b605aab7e20d6aa7caf49dc86570333086736710a5d355e0b0c',
      txTimestamp: '2024-07-25T04:41:35.000Z',
    },
  ];

  const matchedGraph = buildInvestigationGraph(startWallet, sampleHops, 'exchange', 'Coinbase');

  console.log('Test 1: Exchange Matched Graph Structure');
  console.assert(matchedGraph.nodes.length === 3, `Expected 3 nodes, got ${matchedGraph.nodes.length}`);
  console.assert(matchedGraph.edges.length === 2, `Expected 2 edges, got ${matchedGraph.edges.length}`);
  console.assert(matchedGraph.terminal.type === 'exchange', `Expected terminal.type exchange, got ${matchedGraph.terminal.type}`);
  console.assert(matchedGraph.terminal.exchangeName === 'Coinbase', `Expected exchangeName Coinbase, got ${matchedGraph.terminal.exchangeName}`);
  console.assert(matchedGraph.nodes[2].type === 'exchange', `Expected destination node type exchange, got ${matchedGraph.nodes[2].type}`);
  console.assert(matchedGraph.nodes[2].label === 'Coinbase', `Expected destination node label Coinbase, got ${matchedGraph.nodes[2].label}`);
  console.log('✅ Test 1 Passed!\n');

  // Test Case 2: Inconclusive Trail Graph
  const inconclusiveGraph = buildInvestigationGraph(startWallet, [sampleHops[0]], 'inconclusive');

  console.log('Test 2: Inconclusive Trail Graph Structure');
  console.assert(inconclusiveGraph.nodes.length === 2, `Expected 2 nodes, got ${inconclusiveGraph.nodes.length}`);
  console.assert(inconclusiveGraph.edges.length === 1, `Expected 1 edge, got ${inconclusiveGraph.edges.length}`);
  console.assert(inconclusiveGraph.terminal.type === 'inconclusive', `Expected terminal.type inconclusive, got ${inconclusiveGraph.terminal.type}`);
  console.assert(inconclusiveGraph.nodes[1].type === 'wallet', `Expected destination node type wallet, got ${inconclusiveGraph.nodes[1].type}`);
  console.log('✅ Test 2 Passed!\n');

  // Test Case 3: Zero-Hop Single Node Graph
  const zeroHopGraph = buildInvestigationGraph(startWallet, [], 'inconclusive');

  console.log('Test 3: Zero-Hop Single Node Graph');
  console.assert(zeroHopGraph.nodes.length === 1, `Expected 1 node, got ${zeroHopGraph.nodes.length}`);
  console.assert(zeroHopGraph.edges.length === 0, `Expected 0 edges, got ${zeroHopGraph.edges.length}`);
  console.assert(zeroHopGraph.nodes[0].id === startWallet.toLowerCase(), `Expected root node id ${startWallet.toLowerCase()}, got ${zeroHopGraph.nodes[0].id}`);
  console.log('✅ Test 3 Passed!\n');

  console.log('🎉 All Phase 3 Graph & Attribution Tests Passed Successfully!');
}

runTests();

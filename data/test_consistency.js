const { EthereumProvider, traceWalletHops, scanWalletAssets } = require('@rt-cfas/blockchain');
require('dotenv').config();

async function runTest(wallet, label, targetAsset, victimTxHash) {
  console.log(`\n==================================================`);
  console.log(`Testing Wallet: ${label} (${wallet}) [Asset: ${targetAsset || 'Auto'}, VictimTx: ${victimTxHash ? victimTxHash.slice(0, 10) + '...' : 'None'}]`);
  console.log(`==================================================`);

  const p1 = new EthereumProvider(process.env.ETHERSCAN_API_KEY);
  const vaspLookup = (addr) => {
    const map = {
      '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
      '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
    };
    return map[addr.toLowerCase()];
  };

  // 1. Scan Assets
  const scannedAssets = await scanWalletAssets(wallet, p1);
  console.log(`Scanned Assets:`, scannedAssets.map(a => `${a.symbol} (${a.outgoingCount} txs, $${a.totalVolumeUsd})`).join(' | '));

  // 2. Cold Cache Trace
  console.log('RUN 1 (COLD CACHE)...');
  const res1 = await traceWalletHops(wallet, p1, vaspLookup, 5, targetAsset, victimTxHash);
  console.log(`RUN 1 Result: Terminal=${res1.terminalType} (${res1.terminalExchange || 'N/A'}), Hops=${res1.hops.length}, Asset=${res1.targetAsset || 'N/A'}`);

  // 3. Warm Cache Trace
  console.log('RUN 2 (WARM CACHE)...');
  const res2 = await traceWalletHops(wallet, p1, vaspLookup, 5, targetAsset, victimTxHash);
  console.log(`RUN 2 Result: Terminal=${res2.terminalType} (${res2.terminalExchange || 'N/A'}), Hops=${res2.hops.length}, Asset=${res2.targetAsset || 'N/A'}`);

  if (res1.terminalType === res2.terminalType && res1.hops.length === res2.hops.length) {
    console.log(`✅ 100% CONSISTENT MATCH: Run 1 and Run 2 are IDENTICAL!`);
  } else {
    console.error(`❌ INCONSISTENCY DETECTED! Run 1: ${res1.hops.length} hops, Run 2: ${res2.hops.length} hops`);
  }
}

async function main() {
  await runTest('0x53ef6da5fc74cdef214367240b0d96c34231258d', 'Coinbase Wallet', 'ETH');
  await runTest('0x6f2d8b347dbfa187d1313338e0ff0120ca26a829', 'Binance Wallet', 'ETH');
  await runTest('0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1', 'USDT Wallet', 'USDT');
}

main().catch(console.error);

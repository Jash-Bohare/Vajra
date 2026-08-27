const fs = require('fs');

let apiKey = '';
const env = fs.readFileSync('.env', 'utf-8');
env.split('\n').forEach(line => {
  if (line.startsWith('ETHERSCAN_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
});

async function main() {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&contractaddress=0xdac17f958d2ee523a2206206994597c13d831ec7&page=1&offset=50&sort=desc&apikey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  const candidates = Array.from(new Set(json.result.map(tx => tx.from))).filter(Boolean);

  console.log(`Checking ${candidates.length} candidates...`);

  for (const addr of candidates.slice(0, 10)) {
    const txUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${addr}&page=1&offset=100&sort=asc&apikey=${apiKey}`;
    const tokenUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&address=${addr}&page=1&offset=100&sort=asc&apikey=${apiKey}`;

    const [txRes, tokenRes] = await Promise.all([fetch(txUrl), fetch(tokenUrl)]);
    const txJson = await txRes.json();
    const tokenJson = await tokenRes.json();

    const ethCount = Array.isArray(txJson.result) ? txJson.result.length : 0;
    const tokenCount = Array.isArray(tokenJson.result) ? tokenJson.result.length : 0;

    if (ethCount > 0 && ethCount < 30 && tokenCount > 0 && tokenCount < 30) {
      console.log(`🎯 FOUND SUITABLE TEST WALLET: ${addr}`);
      console.log(`   ETH Txs: ${ethCount}, Token Txs: ${tokenCount}`);
      break;
    }
  }
}

main().catch(console.error);

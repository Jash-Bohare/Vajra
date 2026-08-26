/**
 * VASP Address Import Script
 * Imports data/vasp-addresses/seed.json into PostgreSQL known_exchange_addresses table
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../apps/api/.env') });

async function importVaspAddresses() {
  const seedPath = path.join(__dirname, 'seed.json');
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found at ${seedPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(seedPath, 'utf8');
  const addresses = JSON.parse(rawData);
  console.log(`[VASP Import] Loaded ${addresses.length} known exchange addresses from seed.json.`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[VASP Import] No DATABASE_URL set. Seed JSON validated successfully! Set DATABASE_URL to import into PostgreSQL.');
    return;
  }

  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString });
    await client.connect();

    console.log('[VASP Import] Connected to PostgreSQL. Seeding known_exchange_addresses...');

    let inserted = 0;
    for (const item of addresses) {
      await client.query(
        `INSERT INTO known_exchange_addresses (address, exchange_name, chain, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (address) DO UPDATE SET exchange_name = EXCLUDED.exchange_name;`,
        [item.address, item.exchangeName, item.chain || 'ethereum', item.source || 'Etherscan Labels']
      );
      inserted++;
    }

    console.log(`[VASP Import] Successfully imported/upserted ${inserted} addresses into PostgreSQL!`);
    await client.end();
  } catch (err) {
    console.error('[VASP Import] Database import error:', err.message);
    process.exit(1);
  }
}

importVaspAddresses();

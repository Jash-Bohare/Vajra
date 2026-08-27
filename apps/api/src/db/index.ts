import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { Investigation, TraceHop, KnownExchangeAddress } from '@rt-cfas/types';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
});

// Handle idle pool connection resets gracefully (Doc 03 Section 33)
pool.on('error', (err) => {
  console.warn('[DB Pool Warning] Unexpected idle client error:', err.message);
});

/**
 * Fetch all VASP known exchange addresses from PostgreSQL database
 */
export async function getVaspAddressMap(): Promise<Map<string, string>> {
  const vaspMap = new Map<string, string>();
  try {
    const res = await pool.query<KnownExchangeAddress>(
      'SELECT address, exchange_name FROM known_exchange_addresses'
    );
    for (const row of res.rows) {
      vaspMap.set(row.address.toLowerCase(), (row as any).exchange_name);
    }
  } catch (err: any) {
    console.warn('[DB] Could not query known_exchange_addresses table:', err.message);
  }
  return vaspMap;
}

/**
 * Save new investigation record
 */
export async function createInvestigationRecord(
  id: string,
  sessionId: string,
  walletAddress: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO investigations (id, session_id, wallet_address, status)
       VALUES ($1, $2, $3, 'running')`,
      [id, sessionId, walletAddress]
    );
  } catch (err: any) {
    console.warn('[DB] Could not insert investigation record:', err.message);
  }
}

/**
 * Update investigation after completion
 */
export async function updateInvestigationRecord(
  id: string,
  status: string,
  terminalType?: string,
  terminalExchange?: string,
  riskLevel?: string,
  riskReason?: string,
  hopDepthUsed?: number
): Promise<void> {
  try {
    await pool.query(
      `UPDATE investigations
       SET status = $2,
           terminal_type = $3,
           terminal_exchange = $4,
           risk_level = $5,
           risk_reason = $6,
           hop_depth_used = $7,
           completed_at = now()
       WHERE id = $1`,
      [id, status, terminalType, terminalExchange, riskLevel, riskReason, hopDepthUsed]
    );
  } catch (err: any) {
    console.warn('[DB] Could not update investigation record:', err.message);
  }
}

/**
 * Save trace hops in order
 */
export async function saveTraceHopRecords(investigationId: string, hops: TraceHop[]): Promise<void> {
  try {
    for (const hop of hops) {
      await pool.query(
        `INSERT INTO trace_hops (investigation_id, hop_index, from_address, to_address, amount_eth, tx_hash, tx_timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          investigationId,
          hop.hopIndex,
          hop.fromAddress,
          hop.toAddress,
          hop.amountEth,
          hop.txHash,
          hop.txTimestamp,
        ]
      );
    }
  } catch (err: any) {
    console.warn('[DB] Could not insert trace_hops records:', err.message);
  }
}

/**
 * Fetch full investigation by ID
 */
export async function getInvestigationRecord(id: string): Promise<any | null> {
  try {
    const invRes = await pool.query('SELECT * FROM investigations WHERE id = $1', [id]);
    if (invRes.rows.length === 0) return null;

    const inv = invRes.rows[0];
    const hopsRes = await pool.query(
      'SELECT * FROM trace_hops WHERE investigation_id = $1 ORDER BY hop_index ASC',
      [id]
    );

    return {
      id: inv.id,
      sessionId: inv.session_id,
      walletAddress: inv.wallet_address,
      chain: inv.chain,
      status: inv.status,
      terminalType: inv.terminal_type,
      terminalExchange: inv.terminal_exchange,
      riskLevel: inv.risk_level,
      riskReason: inv.risk_reason,
      hopDepthUsed: inv.hop_depth_used,
      createdAt: inv.created_at,
      completedAt: inv.completed_at,
      hops: hopsRes.rows.map((h) => ({
        hopIndex: h.hop_index,
        fromAddress: h.from_address,
        toAddress: h.to_address,
        amountEth: parseFloat(h.amount_eth),
        txHash: h.tx_hash,
        txTimestamp: h.tx_timestamp,
      })),
    };
  } catch (err: any) {
    console.warn('[DB] Could not fetch investigation by ID:', err.message);
    return null;
  }
}

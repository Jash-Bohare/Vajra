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

// Auto-migration: ensure immutable snapshot columns exist
(async function initSchemaMigrations() {
  try {
    await pool.query(`
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS tree_payload JSONB;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS graph_payload JSONB;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS eth_price_usd NUMERIC;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS target_asset TEXT;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS victim_tx_hash TEXT;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS victim_amount_usd NUMERIC;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS risk_score NUMERIC;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS risk_indicators JSONB;
      ALTER TABLE investigations ADD COLUMN IF NOT EXISTS assets_detected JSONB;
    `);
  } catch (err: any) {
    console.warn('[DB] Schema snapshot columns migration note:', err.message);
  }
})();

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
 * Update investigation after completion with full immutable snapshot payload
 */
export async function updateInvestigationRecord(
  id: string,
  status: string,
  terminalType?: string,
  terminalExchange?: string,
  riskLevel?: string,
  riskReason?: string,
  hopDepthUsed?: number,
  snapshotData?: {
    riskScore?: number;
    riskIndicators?: string[];
    assetsDetected?: string[];
    targetAsset?: string;
    victimTxHash?: string;
    victimAmountUsd?: number;
    ethPriceUsd?: number;
    tree?: any;
    graph?: any;
  }
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
           risk_score = $8,
           risk_indicators = $9,
           assets_detected = $10,
           target_asset = $11,
           victim_tx_hash = $12,
           victim_amount_usd = $13,
           eth_price_usd = $14,
           tree_payload = $15,
           graph_payload = $16,
           completed_at = now()
       WHERE id = $1`,
      [
        id,
        status,
        terminalType,
        terminalExchange,
        riskLevel,
        riskReason,
        hopDepthUsed,
        snapshotData?.riskScore || null,
        snapshotData?.riskIndicators ? JSON.stringify(snapshotData.riskIndicators) : null,
        snapshotData?.assetsDetected ? JSON.stringify(snapshotData.assetsDetected) : null,
        snapshotData?.targetAsset || null,
        snapshotData?.victimTxHash || null,
        snapshotData?.victimAmountUsd || null,
        snapshotData?.ethPriceUsd || null,
        snapshotData?.tree ? JSON.stringify(snapshotData.tree) : null,
        snapshotData?.graph ? JSON.stringify(snapshotData.graph) : null,
      ]
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
 * Fetch full immutable investigation by ID
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

    let parsedTree = null;
    let parsedGraph = null;
    let parsedIndicators = null;
    let parsedAssets = null;

    if (inv.tree_payload) {
      try { parsedTree = typeof inv.tree_payload === 'string' ? JSON.parse(inv.tree_payload) : inv.tree_payload; } catch {}
    }
    if (inv.graph_payload) {
      try { parsedGraph = typeof inv.graph_payload === 'string' ? JSON.parse(inv.graph_payload) : inv.graph_payload; } catch {}
    }
    if (inv.risk_indicators) {
      try { parsedIndicators = typeof inv.risk_indicators === 'string' ? JSON.parse(inv.risk_indicators) : inv.risk_indicators; } catch {}
    }
    if (inv.assets_detected) {
      try { parsedAssets = typeof inv.assets_detected === 'string' ? JSON.parse(inv.assets_detected) : inv.assets_detected; } catch {}
    }

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
      riskScore: inv.risk_score ? parseFloat(inv.risk_score) : undefined,
      riskIndicators: parsedIndicators || undefined,
      assetsDetected: parsedAssets || undefined,
      targetAsset: inv.target_asset || undefined,
      victimTxHash: inv.victim_tx_hash || undefined,
      victimAmountUsd: inv.victim_amount_usd ? parseFloat(inv.victim_amount_usd) : undefined,
      ethPriceUsd: inv.eth_price_usd ? parseFloat(inv.eth_price_usd) : undefined,
      hopDepthUsed: inv.hop_depth_used,
      tree: parsedTree,
      graph: parsedGraph,
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

/**
 * Fetch all investigation records for a session ordered by created_at DESC (Doc 03 Section 6 & Doc 04 Phase 3)
 */
export async function getInvestigationHistoryRecords(sessionId: string): Promise<any[]> {
  try {
    const res = await pool.query(
      `SELECT id, session_id, wallet_address, chain, status, terminal_type, terminal_exchange, risk_level, risk_reason, risk_score, eth_price_usd, target_asset, hop_depth_used, created_at, completed_at
       FROM investigations
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );

    return res.rows.map((inv) => ({
      id: inv.id,
      sessionId: inv.session_id,
      walletAddress: inv.wallet_address,
      chain: inv.chain,
      status: inv.status,
      terminalType: inv.terminal_type,
      terminalExchange: inv.terminal_exchange,
      riskLevel: inv.risk_level,
      riskReason: inv.risk_reason,
      riskScore: inv.risk_score ? parseFloat(inv.risk_score) : undefined,
      ethPriceUsd: inv.eth_price_usd ? parseFloat(inv.eth_price_usd) : undefined,
      targetAsset: inv.target_asset || 'ETH',
      hopDepthUsed: inv.hop_depth_used,
      createdAt: inv.created_at,
      completedAt: inv.completed_at,
    }));
  } catch (err: any) {
    console.warn('[DB] Could not query investigation history:', err.message);
    return [];
  }
}

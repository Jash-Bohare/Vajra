-- PostgreSQL Schema for RT-CFAS (Doc 03 Section 4)

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Investigations Table
CREATE TABLE IF NOT EXISTS investigations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         TEXT NOT NULL,
  wallet_address     TEXT NOT NULL,
  chain              TEXT NOT NULL DEFAULT 'ethereum',
  status             TEXT NOT NULL DEFAULT 'pending',
  terminal_type      TEXT,
  terminal_exchange  TEXT,
  risk_level         TEXT,
  risk_reason        TEXT,
  hop_depth_used     INTEGER,
  report_path        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at       TIMESTAMPTZ
);

-- 2. Trace Hops Table
CREATE TABLE IF NOT EXISTS trace_hops (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id   UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  hop_index          INTEGER NOT NULL,
  from_address       TEXT NOT NULL,
  to_address         TEXT NOT NULL,
  amount_eth         NUMERIC NOT NULL,
  tx_hash            TEXT NOT NULL,
  tx_timestamp       TIMESTAMPTZ NOT NULL
);

-- 3. Known Exchange / VASP Deposit Addresses Table
CREATE TABLE IF NOT EXISTS known_exchange_addresses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address            TEXT NOT NULL UNIQUE,
  exchange_name      TEXT NOT NULL,
  chain              TEXT NOT NULL DEFAULT 'ethereum',
  source             TEXT DEFAULT 'Etherscan Labels / Open Source',
  added_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_investigations_session_id ON investigations(session_id);
CREATE INDEX IF NOT EXISTS idx_trace_hops_investigation_id ON trace_hops(investigation_id);
CREATE INDEX IF NOT EXISTS idx_known_exchange_address ON known_exchange_addresses(address);

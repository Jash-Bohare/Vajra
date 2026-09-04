import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AssetSummary, AssetType } from '@rt-cfas/types';
import { TokenBadge } from '../components/TokenBadge';
import { 
  ShieldAlert, 
  Search, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  FolderLock
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [walletAddress, setWalletAddress] = useState('');
  const [targetAsset, setTargetAsset] = useState<AssetType | ''>('');
  const [victimTxHash, setVictimTxHash] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedAssets, setDetectedAssets] = useState<AssetSummary[] | null>(null);

  const navigate = useNavigate();
  const scanAbortRef = useRef<AbortController | null>(null);

  const presetWallets: { label: string; tag: string; address: string; asset: AssetType; victimTx?: string }[] = [
    { label: '11-Node Multi-Hop Trail (Binance Exit)', tag: 'PRIORITY-1', address: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b', asset: 'ETH' },
    { label: 'USDT Transfer Trail (999 USDT Siphon)', tag: 'FAST-TRACK', address: '0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1', asset: 'USDT' },
    { label: 'DEX Routing Obfuscation (Uniswap V3)', tag: 'DEFI-SWAP', address: '0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca', asset: 'ETH' },
    { label: 'Coinbase Deposit Trail (10.99 ETH Exit)', tag: 'EXCHANGE', address: '0x53ef6da5fc74cdef214367240b0d96c34231258d', asset: 'ETH' },
    { label: 'Binance Direct Trail (0.05 ETH)', tag: 'DIRECT', address: '0x6f2d8b347dbfa187d1313338e0ff0120ca26a829', asset: 'ETH' },
    { label: 'Multi-Branch Fan-Out Cascade (USDC)', tag: 'PEEL-CHAIN', address: '0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6', asset: 'USDC' },
    { label: 'Fan-In Hourglass Splitting (USDT)', tag: 'AGGREGATOR', address: '0x7b09fc3bdd9a1eb0059f0c9d391f5d684e0f9918', asset: 'USDT' },
  ];

  // Check URL search parameters
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && /^0x[a-fA-F0-9]{40}$/.test(q.trim())) {
      setWalletAddress(q.trim());
      executeScanAssets(q.trim());
    }
  }, [searchParams]);

  const executeScanAssets = async (addr: string, preferredAsset?: AssetType) => {
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setDetectedAssets(null);
      setScanning(false);
      return;
    }

    if (scanAbortRef.current) {
      scanAbortRef.current.abort();
    }
    const abortController = new AbortController();
    scanAbortRef.current = abortController;

    setScanning(true);
    setError('');

    try {
      const res = await fetch('/api/investigations/scan-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: addr }),
        signal: abortController.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan wallet assets.');
      }

      const assets: AssetSummary[] = data.assets || [];
      setDetectedAssets(assets);

      if (preferredAsset && assets.some((a) => a.symbol === preferredAsset)) {
        setTargetAsset(preferredAsset);
      } else if (assets.length > 0) {
        setTargetAsset(assets[0].symbol);
      } else {
        setTargetAsset('ETH');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error scanning wallet assets.');
        setDetectedAssets(null);
      }
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const trimmed = walletAddress.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      const timer = setTimeout(() => {
        executeScanAssets(trimmed, targetAsset || undefined);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setDetectedAssets(null);
      setScanning(false);
    }
  }, [walletAddress]);

  const handleStartInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = walletAddress.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError('Please enter a valid 42-character Ethereum wallet address starting with 0x.');
      return;
    }

    if (scanning) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: addr,
          targetAsset: targetAsset || undefined,
          victimTxHash: victimTxHash.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start investigation.');
      }

      navigate(`/investigations/${data.investigationId}/progress`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (item: { address: string; asset: AssetType; victimTx?: string }) => {
    setWalletAddress(item.address);
    setTargetAsset(item.asset);
    if (item.victimTx) {
      setVictimTxHash(item.victimTx);
    } else {
      setVictimTxHash('');
    }
    executeScanAssets(item.address, item.asset);
  };

  const isFormReady = !!(walletAddress.trim() && /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim()) && detectedAssets && !scanning);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Top Banner */}
      <div className="surface-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <h1 className="font-headline-lg" style={{ color: 'var(--text-main)' }}>
                Targeted Cyber Fraud Attribution Terminal
              </h1>
              <span className="badge-tactical badge-tactical-cyan">PHASE E2 ENGINE</span>
            </div>
            <p className="font-body-md" style={{ color: 'var(--text-muted)' }}>
              Automated blockchain forensic intelligence and VASP attribution platform for Law Enforcement Agencies.
              Scans on-chain assets, calculates decaying taint trails up to 5 hops, and prepares court-admissible electronic evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Test Cases Matrix */}
      <div className="surface-card">
        <div
          style={{
            padding: '0.65rem 1rem',
            backgroundColor: 'var(--bg-surface-low)',
            borderBottom: '1px solid var(--border-tactical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FolderLock size={14} style={{ color: 'var(--accent-cyan-bright)' }} />
            <span className="font-label-caps" style={{ color: 'var(--text-main)' }}>
              VERIFIED INVESTIGATION PRESETS (LAW ENFORCEMENT CATALOG)
            </span>
          </div>
          <span className="font-mono-data-xs" style={{ color: 'var(--text-dim)' }}>
            7 TEST TRAILS READY
          </span>
        </div>

        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '0.65rem' }}>
          {presetWallets.map((item) => {
            const isSelected = walletAddress === item.address;
            return (
              <button
                key={item.address}
                type="button"
                onClick={() => handleSelectPreset(item)}
                style={{
                  textAlign: 'left',
                  backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-low)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-tactical)',
                  borderRadius: '4px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 10px var(--border-cyan)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="font-headline-sm" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                    {item.label}
                  </span>
                  <span className="badge-tactical badge-tactical-cyan" style={{ fontSize: '0.55rem' }}>
                    {item.tag}
                  </span>
                </div>
                <div className="font-mono-data-xs" style={{ color: 'var(--accent-cyan)' }}>
                  {item.address.substring(0, 10)}...{item.address.substring(item.address.length - 8)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleStartInvestigation} className="surface-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: 'var(--danger-container)',
                border: '1px solid var(--danger-border)',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                color: 'var(--danger-crimson)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.85rem',
              }}
            >
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Suspect Wallet Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="font-label-caps" style={{ color: 'var(--text-main)' }}>
                SUSPECT WALLET ADDRESS (EVM MAINNET)
              </label>
              {scanning && (
                <span className="font-mono-data-xs" style={{ color: 'var(--accent-cyan-bright)' }}>
                  Scanning on-chain holdings...
                </span>
              )}
            </div>
            <input
              type="text"
              className="input-tactical"
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

          {/* Asset Detection Preview */}
          {detectedAssets && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-low)',
                border: '1px solid var(--border-tactical)',
                borderRadius: '4px',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span className="font-label-caps" style={{ color: 'var(--text-dim)' }}>
                  DETECTED CURRENCY HOLDINGS
                </span>
                <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                  Select Target Currency for Taint Propagation
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {detectedAssets.map((asset) => {
                  const isSelected = targetAsset === asset.symbol;
                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => setTargetAsset(asset.symbol)}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-tactical)',
                        borderRadius: '4px',
                        padding: '0.5rem 0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: isSelected ? '0 0 10px rgba(6, 182, 212, 0.25)' : 'none',
                      }}
                    >
                      <TokenBadge symbol={asset.symbol} />
                      <div style={{ textAlign: 'left' }}>
                        <span className="font-mono-data-xs" style={{ color: 'var(--text-main)', fontWeight: 600, display: 'block' }}>
                          {asset.totalVolumeToken.toFixed(3)} {asset.symbol}
                        </span>
                        {asset.totalVolumeUsd !== undefined && (
                          <span className="font-mono-data-xs" style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                            ${Math.round(asset.totalVolumeUsd).toLocaleString()} USD ({asset.outgoingCount} txs)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Victim FIR Hash Reference */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="font-label-caps" style={{ color: 'var(--text-main)' }}>
                VICTIM FIR TX HASH REFERENCE (TEMPORAL GATING ANCHOR)
              </label>
              <span className="font-mono-data-xs" style={{ color: 'var(--text-dim)' }}>
                Optional • Restricts graph to transfers post-theft
              </span>
            </div>
            <input
              type="text"
              className="input-tactical"
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
              value={victimTxHash}
              onChange={(e) => setVictimTxHash(e.target.value)}
              placeholder="0x... (e.g. Origin transaction of reported theft)"
            />
          </div>

          {/* Submit Trigger */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading || scanning}
              className="btn-tactical btn-tactical-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.85rem',
                opacity: loading || scanning ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span>Dispatching Heuristic Engine...</span>
              ) : (
                <>
                  <span>DISPATCH ON-CHAIN FORENSIC TRACE</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

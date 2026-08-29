import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetSummary, AssetType } from '@rt-cfas/types';
import { TokenBadge } from '../components/TokenBadge';

export const HomePage: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [targetAsset, setTargetAsset] = useState<AssetType | ''>('');
  const [victimTxHash, setVictimTxHash] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedAssets, setDetectedAssets] = useState<AssetSummary[] | null>(null);

  const navigate = useNavigate();

  const presetWallets: { label: string; address: string; asset: AssetType; victimTx?: string }[] = [
    { label: '11-Node Multi-Hop Trail (Binance)', address: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b', asset: 'ETH' },
    { label: 'USDT Transfer Trail (999 USDT)', address: '0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1', asset: 'USDT' },
    { label: 'DEX Routing Obfuscation (Uniswap)', address: '0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca', asset: 'ETH' },
    { label: 'Coinbase Deposit Trail (10.99 ETH)', address: '0x53ef6da5fc74cdef214367240b0d96c34231258d', asset: 'ETH' },
    { label: 'Binance Direct Trail (0.05 ETH)', address: '0x6f2d8b347dbfa187d1313338e0ff0120ca26a829', asset: 'ETH' },
    { label: 'Multi-Branch Fan-Out (USDC)', address: '0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6', asset: 'USDC' },
    { label: 'Fan-In Hourglass Splitting (USDT)', address: '0x7b09fc3bdd9a1eb0059f0c9d391f5d684e0f9918', asset: 'USDT' },
  ];

  const handleScanAssets = async (addressToScan?: string) => {
    const addr = (addressToScan || walletAddress).trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError('Please enter a valid 42-character Ethereum wallet address starting with 0x.');
      return;
    }

    setScanning(true);
    setError('');
    setDetectedAssets(null);

    try {
      const res = await fetch('/api/investigations/scan-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: addr }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan wallet assets.');
      }

      setDetectedAssets(data.assets || []);
      if (data.assets && data.assets.length > 0) {
        setTargetAsset(data.assets[0].symbol);
      }
    } catch (err: any) {
      setError(err.message || 'Error scanning wallet assets.');
    } finally {
      setScanning(false);
    }
  };

  const handleStartInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = walletAddress.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError('Please enter a valid 42-character Ethereum wallet address starting with 0x.');
      return;
    }

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
    if (item.victimTx) setVictimTxHash(item.victimTx);
    handleScanAssets(item.address);
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Start Targeted Cyber Fraud Investigation</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Enter a suspect wallet address. The engine pre-scans on-chain assets and applies temporal gating & decaying taint tracking to follow the exact stolen currency path.
      </p>

      {/* Preset Test Wallet Shortcuts */}
      <div style={{ marginBottom: '1.5rem', background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.6rem' }}>
          Quick Select Test Case Wallets:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {presetWallets.map((item) => (
            <button
              key={item.address}
              type="button"
              onClick={() => handleSelectPreset(item)}
              style={{
                background: walletAddress === item.address ? '#1e293b' : '#090d16',
                color: walletAddress === item.address ? '#38bdf8' : '#94a3b8',
                border: '1px solid #334155',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleStartInvestigation}>
        {/* Suspect Wallet Input */}
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Suspect Wallet Address (Ethereum Mainnet)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => {
                setWalletAddress(e.target.value);
                setDetectedAssets(null);
              }}
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: '#0f172a',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.95rem',
              }}
            />
            <button
              type="button"
              onClick={() => handleScanAssets()}
              disabled={scanning || !walletAddress.trim()}
              style={{
                background: '#1e293b',
                color: 'var(--accent-cyan)',
                border: '1px solid #334155',
                padding: '0.8rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: scanning ? 0.6 : 1,
              }}
            >
              {scanning ? 'Scanning Assets...' : 'Scan Assets'}
            </button>
          </div>
        </div>

        {/* Victim Transaction Reference (Optional Anchor Input) */}
        <div style={{ marginBottom: '1.2rem', background: '#090d16', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Victim Transaction Reference (Optional FIR Transfer Hash)
          </label>
          <input
            type="text"
            placeholder="0x... (Optional Transaction Hash of Victim's Deposit)"
            value={victimTxHash}
            onChange={(e) => setVictimTxHash(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              marginBottom: '0.4rem',
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            <em>Providing a victim transaction reference locks the tracer to post-crime transfers (`timestamp &gt; T_crime`) and tracks decaying tainted funds with 100% temporal accuracy.</em>
          </p>
        </div>

        {/* Step 2: Asset Selection Cards */}
        {detectedAssets && (
          <div style={{ marginBottom: '1.5rem', background: '#090d16', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 600, marginBottom: '0.8rem' }}>
              Select Currency Asset to Trace:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              {detectedAssets.map((asset) => {
                const isSelected = targetAsset === asset.symbol;
                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setTargetAsset(asset.symbol)}
                    style={{
                      background: isSelected ? '#1e293b' : '#0f172a',
                      border: `2px solid ${isSelected ? 'var(--accent-cyan)' : '#1e293b'}`,
                      borderRadius: '8px',
                      padding: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <TokenBadge symbol={asset.symbol} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.outgoingCount} txs</span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      ${asset.totalVolumeUsd.toLocaleString()} USD
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Total Volume: {asset.totalVolumeToken.toLocaleString()} {asset.symbol}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
            color: '#fff',
            border: 'none',
            padding: '0.85rem 1.8rem',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? 'Initializing Decaying Taint Tracing Engine...'
            : targetAsset
            ? `Run Targeted Investigation for ${targetAsset}`
            : 'Run Investigation'}
        </button>
      </form>
    </div>
  );
};

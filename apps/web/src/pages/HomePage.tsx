import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const presetWallets = [
    { label: 'Coinbase (2-Hop Uncataloged Trail)', address: '0x53ef6da5fc74cdef214367240b0d96c34231258d' },
    { label: 'Binance (1-Hop Deposit Trail)', address: '0x6f2d8b347dbfa187d1313338e0ff0120ca26a829' },
    { label: 'Binance Hot Wallet Withdrawal', address: '0x28C6c06298d514Db089934071355E5743bf21d60' },
  ];

  const handleStartInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim() || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
      setError('Please enter a valid 42-character Ethereum wallet address starting with 0x.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddress.trim() }),
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

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Start Automated Investigation</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Enter a suspect Ethereum wallet address reported by a victim to automatically trace fund flows to receiving VASP / exchange deposit addresses.
      </p>

      {/* Preset Test Wallet Shortcuts */}
      <div style={{ marginBottom: '1.5rem', background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.6rem' }}>
          ⚡ Preset Test Wallets (Quick Select):
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {presetWallets.map((item) => (
            <button
              key={item.address}
              type="button"
              onClick={() => setWalletAddress(item.address)}
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
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Victim-Reported Suspect Wallet Address (Ethereum Mainnet)
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: '#0f172a',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
            color: '#fff',
            border: 'none',
            padding: '0.8rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Initializing Tracing Engine...' : '🚀 Run Automated Investigation'}
        </button>
      </form>
    </div>
  );
};

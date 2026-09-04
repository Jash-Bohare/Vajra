import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ShieldAlert, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/investigations?sessionId=demo_session');
      if (!res.ok) {
        throw new Error('Failed to fetch session history.');
      }
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : data.value || []);
    } catch (err: any) {
      setError(err.message || 'Error loading history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getRiskBadge = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return <span className="badge-tactical badge-tactical-crimson">HIGH AML THREAT</span>;
      case 'medium':
        return <span className="badge-tactical badge-tactical-amber">MEDIUM SUSPICION</span>;
      case 'low':
        return <span className="badge-tactical badge-tactical-emerald">LOW RISK</span>;
      default:
        return <span className="badge-tactical badge-tactical-muted">PENDING AUDIT</span>;
    }
  };

  if (loading) {
    return (
      <div
        className="surface-card"
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          maxWidth: '680px',
          margin: '2rem auto',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid var(--border-highlight)',
            borderTopColor: 'var(--accent-cyan)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto',
          }}
        />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <h2 className="font-headline-md" style={{ color: 'var(--text-main)' }}>
          Retrieving Electronic Case Dossiers...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="surface-card"
        style={{
          padding: '2.5rem 2rem',
          maxWidth: '680px',
          margin: '2rem auto',
          border: '1px solid var(--danger-crimson)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <ShieldAlert size={24} style={{ color: 'var(--danger-crimson)' }} />
          <h2 className="font-headline-md" style={{ color: 'var(--text-main)' }}>
            Error Loading Case History
          </h2>
        </div>
        <p className="font-body-sm" style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          {error}
        </p>
        <button onClick={fetchHistory} className="btn-tactical btn-tactical-secondary">
          <RefreshCw size={14} />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div
        className="surface-card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <FileCheck size={20} style={{ color: 'var(--accent-cyan-bright)' }} />
            <h1 className="font-headline-md" style={{ color: 'var(--text-main)' }}>
              Session Investigation Dossiers & Section 65B Records
            </h1>
          </div>
          <p className="font-body-sm" style={{ color: 'var(--text-muted)' }}>
            Immutable on-chain forensic snapshot history persisted with cryptographic Merkle stamps.
          </p>
        </div>

        <Link to="/" className="btn-tactical btn-tactical-primary">
          + Start New Investigation
        </Link>
      </div>

      {/* History Table */}
      <div className="surface-card">
        {history.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-low)',
                    borderBottom: '1px solid var(--border-tactical)',
                  }}
                >
                  <th className="font-label-caps" style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>
                    SUSPECT WALLET
                  </th>
                  <th className="font-label-caps" style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>
                    RISK HEURISTICS
                  </th>
                  <th className="font-label-caps" style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>
                    VASP ATTRIBUTION
                  </th>
                  <th className="font-label-caps" style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>
                    DATE / TIME (UTC)
                  </th>
                  <th className="font-label-caps" style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-low)',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="code-badge">
                        {item.walletAddress.substring(0, 10)}...{item.walletAddress.substring(item.walletAddress.length - 8)}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getRiskBadge(item.riskLevel)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {item.terminalType === 'exchange' ? (
                        <span className="font-mono-data-sm" style={{ color: 'var(--success-emerald)', fontWeight: 600 }}>
                          {item.terminalExchange}
                        </span>
                      ) : (
                        <span className="font-mono-data-sm" style={{ color: 'var(--text-dim)' }}>
                          Inconclusive
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(item.createdAt).toUTCString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Link
                        to={`/investigations/${item.id}`}
                        className="btn-tactical btn-tactical-secondary"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                      >
                        <span>Inspect Dossier</span>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <p className="font-body-md" style={{ marginBottom: '1rem' }}>
              No recorded investigations found in this workspace session.
            </p>
            <Link to="/" className="btn-tactical btn-tactical-primary">
              Launch First Forensic Investigation →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

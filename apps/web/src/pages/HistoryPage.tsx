import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchHistory() {
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
    }

    fetchHistory();
  }, []);

  const getRiskBadgeStyle = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return { bg: '#451a1a', color: '#ef4444', border: '#7f1d1d' };
      case 'medium':
        return { bg: '#452a1a', color: '#f59e0b', border: '#78350f' };
      case 'low':
        return { bg: '#1a3a2a', color: '#10b981', border: '#064e3b' };
      default:
        return { bg: '#1e293b', color: '#94a3b8', border: '#334155' };
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Loading Session History...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ color: 'var(--danger)' }}>
        <h2>Error Loading History</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Session Investigation History</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Past automated wallet trace investigations for this session (persisted in PostgreSQL).
          </p>
        </div>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          + New Investigation
        </Link>
      </div>

      {history.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Suspect Wallet</th>
                <th style={{ padding: '0.75rem' }}>Risk Level</th>
                <th style={{ padding: '0.75rem' }}>VASP Attribution</th>
                <th style={{ padding: '0.75rem' }}>Date / Time (UTC)</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => {
                const badge = getRiskBadgeStyle(item.riskLevel);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      <span className="code-badge">
                        {item.walletAddress.substring(0, 10)}...{item.walletAddress.substring(34)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.riskLevel || 'UNKNOWN'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      {item.terminalType === 'exchange' ? (
                        <span style={{ color: '#10b981' }}>🎯 {item.terminalExchange}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Inconclusive</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Link
                        to={`/investigations/${item.id}`}
                        style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View Report →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p>No prior investigations found for this session.</p>
          <Link to="/" style={{ color: 'var(--accent-cyan)', marginTop: '1rem', display: 'inline-block' }}>
            Start your first investigation →
          </Link>
        </div>
      )}
    </div>
  );
};

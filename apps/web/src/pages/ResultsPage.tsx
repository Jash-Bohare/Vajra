import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchInvestigation() {
      try {
        setLoading(true);
        const res = await fetch(`/api/investigations/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load investigation details.');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error loading investigation.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchInvestigation();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Loading Live Investigation Data...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ color: 'var(--danger)' }}>
        <h2>Error Loading Investigation</h2>
        <p>{error || 'Investigation record not found.'}</p>
        <Link to="/" style={{ color: 'var(--accent-cyan)', marginTop: '1rem', display: 'inline-block' }}>
          ← Start New Investigation
        </Link>
      </div>
    );
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return { bg: '#451a1a', text: '#ef4444', border: '#7f1d1d' };
      case 'medium':
        return { bg: '#452a1a', text: '#f59e0b', border: '#78350f' };
      case 'low':
        return { bg: '#1a3a2a', text: '#10b981', border: '#064e3b' };
      default:
        return { bg: '#1e293b', text: '#94a3b8', border: '#334155' };
    }
  };

  const riskStyle = getRiskBadgeColor(data.riskLevel);

  return (
    <div>
      {/* Header Summary Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Investigation Summary</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Suspect Wallet: <span className="code-badge">{data.walletAddress}</span>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              ID: <span className="code-badge">{data.id}</span> | Chain: <span className="code-badge">Ethereum</span>
            </p>
          </div>

          {/* Risk Level Badge */}
          <div
            style={{
              background: riskStyle.bg,
              color: riskStyle.text,
              border: `1px solid ${riskStyle.border}`,
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
              Risk Assessment
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {data.riskLevel || 'UNKNOWN'} RISK
            </div>
          </div>
        </div>

        {/* Risk Explanation */}
        <div
          style={{
            marginTop: '1.2rem',
            padding: '0.8rem 1rem',
            background: '#0f172a',
            borderRadius: '6px',
            borderLeft: `4px solid ${riskStyle.text}`,
            fontSize: '0.9rem',
          }}
        >
          <strong>Reasoning:</strong> {data.riskReason || 'No risk evaluation available.'}
        </div>
      </div>

      {/* VASP Destination Attribution Card */}
      <div className="card">
        <h2>VASP Exchange Attribution Result</h2>
        {data.terminalType === 'exchange' ? (
          <div style={{ background: '#1a3a2a', padding: '1rem', borderRadius: '8px', border: '1px solid #064e3b' }}>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>
              🎯 MATCHED VASP: {data.terminalExchange}
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Direct fund transfer path terminates at a verified deposit wallet belonging to <strong>{data.terminalExchange}</strong>. Actionable for freezing requests.
            </p>
          </div>
        ) : (
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
              ⚠️ INCONCLUSIVE (No Known VASP Match Within 5 Hops)
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Funds passed through intermediary wallets without reaching a cataloged exchange deposit address.
            </p>
          </div>
        )}
      </div>

      {/* Trace Hops Table */}
      <div className="card">
        <h2>Traced On-Chain Hops ({data.hops?.length || 0})</h2>
        {data.hops && data.hops.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Hop #</th>
                  <th style={{ padding: '0.75rem' }}>Sender (From)</th>
                  <th style={{ padding: '0.75rem' }}>Recipient (To)</th>
                  <th style={{ padding: '0.75rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem' }}>Timestamp (UTC)</th>
                  <th style={{ padding: '0.75rem' }}>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {data.hops.map((hop: any) => (
                  <tr key={hop.hopIndex} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>Hop #{hop.hopIndex}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {hop.fromAddress.substring(0, 8)}...{hop.fromAddress.substring(36)}
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {hop.toAddress.substring(0, 8)}...{hop.toAddress.substring(36)}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {hop.amountEth} ETH
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(hop.txTimestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <a
                        href={`https://etherscan.io/tx/${hop.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                      >
                        View Tx ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No outgoing transactions found for this wallet address.
          </p>
        )}
      </div>

      {/* Graph Visualizer Placeholder Notice */}
      <div className="card" style={{ borderStyle: 'dashed' }}>
        <h2 style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Fund Flow Graph Visualization (Cytoscape.js)</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Interactive node & edge graph canvas will render here in Phase 5. Graph data is ready: <span className="code-badge">{data.graph?.nodes?.length || 0} Nodes, {data.graph?.edges?.length || 0} Edges</span>.
        </p>
      </div>
    </div>
  );
};

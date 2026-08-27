import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GraphVisualizer } from '../components/GraphVisualizer';
import { RiskIndicatorCard } from '../components/RiskIndicatorCard';
import { exportInvestigationPdf } from '../utils/PdfExporter';

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
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.8rem' }}>Fetching Live Investigation & Tracing Data...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Retrieving on-chain transaction hops and risk metrics from backend database.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ color: 'var(--danger)', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Error Loading Investigation</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error || 'Investigation record not found.'}</p>
        <Link to="/" style={{ color: 'var(--accent-cyan)', marginTop: '1rem', display: 'inline-block' }}>
          ← Start New Investigation
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Action Header Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>Investigation Summary</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Suspect Wallet: <span className="code-badge">{data.walletAddress}</span>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            ID: <span className="code-badge">{data.id}</span> | Chain: <span className="code-badge">Ethereum</span>
          </p>
        </div>

        <button
          onClick={() => exportInvestigationPdf(data)}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
            color: '#fff',
            border: 'none',
            padding: '0.7rem 1.2rem',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          📄 Download Legal PDF Report
        </button>
      </div>

      {/* Expandable Risk Assessment Card */}
      <RiskIndicatorCard
        riskLevel={data.riskLevel}
        riskReason={data.riskReason}
        score={data.riskScore || (data.riskLevel === 'high' ? 85 : data.riskLevel === 'medium' ? 55 : 15)}
        indicators={data.riskIndicators || (data.riskLevel === 'high' ? ['burner_wallet', 'rapid_forwarding'] : ['direct_vasp_deposit'])}
      />

      {/* VASP Destination Attribution Card */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>VASP Exchange Attribution Result</h2>
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

      {/* Interactive Cytoscape.js Fund Flow Graph Canvas */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>Interactive Fund Flow Graph Canvas (Cytoscape.js)</h2>
        {data.graph ? (
          <GraphVisualizer graph={data.graph} rootWalletAddress={data.walletAddress} />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Graph visualization data unavailable.</p>
        )}
      </div>

      {/* Trace Hops Table */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>Traced On-Chain Hops ({data.hops?.length || 0})</h2>
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
    </div>
  );
};

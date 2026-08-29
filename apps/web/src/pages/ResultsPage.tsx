import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GraphVisualizer } from '../components/GraphVisualizer';
import { RiskIndicatorCard } from '../components/RiskIndicatorCard';
import { BranchSummaryCard } from '../components/BranchSummaryCard';
import { TokenBadge } from '../components/TokenBadge';
import { InvestigatorActionCard } from '../components/InvestigatorActionCard';
import { exportInvestigationPdf } from '../utils/PdfExporter';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

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
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.8rem' }}>Loading Investigation Snapshot...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Retrieving immutable on-chain forensic evidence and graph state as recorded at investigation time.
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

  const assetsDetected = data.assetsDetected || ['ETH'];
  const targetAsset = data.targetAsset || assetsDetected[0] || 'ETH';
  const ethRate = data.ethPriceUsd || data.tree?.ethPriceUsd || data.graph?.ethPriceUsd;
  // P1-C: derive risk score for alert banner
  const riskScore: number = data.riskScore || (data.riskLevel === 'high' ? 85 : data.riskLevel === 'medium' ? 55 : 15);
  const isCriticalRisk = riskScore >= 80;

  return (
    <div>
      {/* Action Header Card */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>Investigation Forensic Snapshot</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Suspect Wallet: <span className="code-badge">{data.walletAddress}</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>ID: <span className="code-badge">{data.id.substring(0, 8)}...</span></span>
            <span>Recorded: <span className="code-badge">{new Date(data.createdAt).toLocaleString()}</span></span>
            {ethRate && (
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                ETH Rate at Snapshot: ${Number(ethRate).toLocaleString()} USD
              </span>
            )}
          </div>

          {/* Victim Reference Badge */}
          {data.victimTxHash && (
            <div style={{ marginTop: '0.6rem', background: '#090d16', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid #1e293b', display: 'inline-block' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                Victim Tx Reference: <span className="code-badge">{data.victimTxHash.substring(0, 10)}...{data.victimTxHash.substring(58)}</span>
              </span>
              {data.victimAmountUsd && (
                <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: '0.8rem', fontWeight: 600 }}>
                  (Tainted Balance: ${data.victimAmountUsd.toLocaleString()} USD)
                </span>
              )}
            </div>
          )}

          {/* Target Asset Pill */}
          <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Targeted Asset:</span>
            <TokenBadge symbol={targetAsset} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>All Wallet Assets:</span>
            {assetsDetected.map((asset: string) => (
              <TokenBadge key={asset} symbol={asset} />
            ))}
          </div>
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
          Download Legal PDF Report
        </button>
      </div>

      {/* Expandable Risk Assessment Card */}
      <RiskIndicatorCard
        riskLevel={data.riskLevel}
        riskReason={data.riskReason}
        score={riskScore}
        indicators={data.riskIndicators || (data.riskLevel === 'high' ? ['burner_wallet', 'rapid_forwarding'] : ['direct_vasp_deposit'])}
      />

      {/* VASP Destination Attribution Card */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>VASP Exchange Attribution Result</h2>
        {data.terminalType === 'exchange' ? (
          <div style={{ background: '#1a3a2a', padding: '1rem', borderRadius: '8px', border: '1px solid #064e3b' }}>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>
              MATCHED VASP: {data.terminalExchange}
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Direct fund transfer path terminates at a verified deposit wallet belonging to <strong>{data.terminalExchange}</strong>. Actionable for freezing requests.
            </p>
          </div>
        ) : (
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
              INCONCLUSIVE (No Known VASP Match Within 5 Hops)
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Funds passed through intermediary wallets without reaching a cataloged exchange deposit address.
            </p>
          </div>
        )}
      </div>

      {/* P1-C: Critical Alert Banner — shown when risk score >= 80 */}
      {isCriticalRisk && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '2px solid #ef4444',
            background: 'linear-gradient(135deg, #1c0606 0%, #2d0a0a 100%)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.8rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ef4444', marginBottom: '0.3rem' }}>
              CRITICAL RISK ALERT — Suspected Active Laundering Operation
            </div>
            <div style={{ fontSize: '0.85rem', color: '#fca5a5', lineHeight: '1.6' }}>
              Risk Score: <strong style={{ color: '#ef4444' }}>{riskScore}/100</strong>
              {' · '}{data.riskReason || 'High-confidence laundering pattern detected across multiple hops.'}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#f87171' }}>
              Immediate action recommended: Submit preservation request to identified exchange before evidence is moved or obscured.
            </div>
          </div>
        </div>
      )}

      {/* P1-B: Investigator Action Card — shown only when exchange is identified */}
      {data.terminalType === 'exchange' && data.terminalExchange && (
        <InvestigatorActionCard
          exchangeName={data.terminalExchange}
          walletAddress={data.walletAddress}
          victimTxHash={data.victimTxHash}
        />
      )}

      {/* Multi-Branch Tree Topology Card (Spec 09) */}
      {(data.tree || data.graph?.tree) && (
        <BranchSummaryCard
          tree={data.tree || data.graph?.tree}
          selectedBranchId={selectedBranch?.branchId}
          onSelectBranch={(b) => setSelectedBranch(selectedBranch?.branchId === b.branchId ? null : b)}
        />
      )}

      {/* Interactive Cytoscape.js Fund Flow Graph Canvas */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>Interactive Fund Flow Graph Canvas (Cytoscape.js)</h2>
        {data.graph ? (
          <GraphVisualizer
            graph={data.graph}
            rootWalletAddress={data.walletAddress}
            selectedBranchId={selectedBranch?.branchId}
            selectedBranch={selectedBranch}
            onClearBranchSelection={() => setSelectedBranch(null)}
          />
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Graph visualization data unavailable.</p>
        )}
      </div>

      {/* Multi-Asset Traced Hops Table (Spec 08 + TLFT Architecture) */}
      {(() => {
        const displayedHops = selectedBranch ? selectedBranch.hops : (data.hops || []);
        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
                Traced On-Chain Hops ({displayedHops.length})
                {selectedBranch && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginLeft: '0.6rem', fontWeight: 500 }}>
                    (Filtered by {selectedBranch.branchId})
                  </span>
                )}
              </h2>

              {selectedBranch && (
                <button
                  onClick={() => setSelectedBranch(null)}
                  style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Show All Branches
                </button>
              )}
            </div>

            {displayedHops.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem' }}>Hop #</th>
                      <th style={{ padding: '0.75rem' }}>Sender (From)</th>
                      <th style={{ padding: '0.75rem' }}>Recipient (To)</th>
                      <th style={{ padding: '0.75rem' }}>Asset</th>
                      <th style={{ padding: '0.75rem' }}>Transfer Amount</th>
                      <th style={{ padding: '0.75rem' }}>~USD Value</th>
                      <th style={{ padding: '0.75rem' }}>Confidence</th>
                      <th style={{ padding: '0.75rem' }}>Timestamp (UTC)</th>
                      <th style={{ padding: '0.75rem' }}>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHops.map((hop: any, idx: number) => {
                      const symbol = hop.tokenSymbol || 'ETH';
                      const displayAmount = hop.tokenAmount !== undefined ? `${hop.tokenAmount} ${symbol}` : `${hop.amountEth} ETH`;
                      const usdValStr = hop.usdValue !== undefined && hop.usdValue > 0
                        ? `$${hop.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : '$0.00';
                      const conf = hop.confidence || 'high';

                      return (
                        <tr key={hop.txHash + '_' + idx} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>Hop #{hop.hopIndex}</td>
                          <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                            {hop.fromAddress.substring(0, 8)}...{hop.fromAddress.substring(36)}
                          </td>
                          <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                            {hop.toAddress.substring(0, 8)}...{hop.toAddress.substring(36)}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <TokenBadge symbol={symbol} isInternalTx={hop.isInternalTx} />
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            {displayAmount}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                            {usdValStr}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                background: conf === 'high' ? '#065f46' : conf === 'medium' ? '#92400e' : '#7f1d1d',
                                color: conf === 'high' ? '#6ee7b7' : conf === 'medium' ? '#fcd34d' : '#fca5a5',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              {conf.toUpperCase()}
                            </span>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No outgoing transactions found for this branch.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
};

import React, { useState } from 'react';

interface RiskIndicatorCardProps {
  riskLevel: string;
  riskReason: string;
  score?: number;
  indicators?: string[];
}

export const RiskIndicatorCard: React.FC<RiskIndicatorCardProps> = ({
  riskLevel,
  riskReason,
  score,
  indicators = [],
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const getStyle = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return { bg: '#451a1a', text: '#ef4444', border: '#7f1d1d', fill: '#dc2626' };
      case 'medium':
        return { bg: '#452a1a', text: '#f59e0b', border: '#78350f', fill: '#d97706' };
      case 'low':
        return { bg: '#1a3a2a', text: '#10b981', border: '#064e3b', fill: '#059669' };
      default:
        return { bg: '#1e293b', text: '#94a3b8', border: '#334155', fill: '#64748b' };
    }
  };

  const style = getStyle(riskLevel);
  const displayScore = score !== undefined ? score : riskLevel === 'high' ? 85 : riskLevel === 'medium' ? 55 : 15;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Automated Risk Assessment</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Explainable AI/ML rule engine evaluation based on on-chain hop velocity and recipient history.
          </p>
        </div>

        {/* Risk Level & Numeric Score Badge */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Numeric Meter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: style.text }}>
              {displayScore.toFixed(0)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Risk Index
            </div>
          </div>

          {/* Level Badge */}
          <div
            style={{
              background: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
              Assessment
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {riskLevel || 'UNKNOWN'} RISK
            </div>
          </div>
        </div>
      </div>

      {/* Triggered Indicator Tags */}
      {indicators && indicators.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {indicators.map((ind) => (
            <span
              key={ind}
              style={{
                background: '#0f172a',
                color: 'var(--accent-cyan)',
                border: '1px solid #334155',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              🏷️ {ind}
            </span>
          ))}
        </div>
      )}

      {/* Primary Reasoning Accordion */}
      <div
        style={{
          marginTop: '1rem',
          padding: '0.8rem 1rem',
          background: '#0f172a',
          borderRadius: '6px',
          borderLeft: `4px solid ${style.text}`,
          fontSize: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <strong>Primary Rule Reasoning:</strong> {riskReason}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {expanded ? 'Hide Logic ▲' : 'Expand Rule Logic ▼'}
          </button>
        </div>

        {expanded && (
          <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid #1e293b', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <p><strong style={{ color: '#f1f5f9' }}>On-Chain Intelligence Explainability Breakdown:</strong></p>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
              <li><strong>Hop Velocity:</strong> Evaluates transfer timestamp diffs between consecutive transfers.</li>
              <li><strong>Recipient Prior History:</strong> Checks target deposit address transaction counts on Etherscan.</li>
              <li><strong>Value Structuring:</strong> Detects peeling chain behavior (&gt; 20% ETH value drop between hops).</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

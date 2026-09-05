import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [expanded, setExpanded] = useState<boolean>(false);

  const getStyle = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return isLight
          ? { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', fill: '#dc2626' }
          : { bg: '#451a1a', text: '#ef4444', border: '#7f1d1d', fill: '#dc2626' };
      case 'medium':
        return isLight
          ? { bg: '#fef3c7', text: '#b45309', border: '#fde68a', fill: '#d97706' }
          : { bg: '#452a1a', text: '#f59e0b', border: '#78350f', fill: '#d97706' };
      case 'low':
        return isLight
          ? { bg: '#d1fae5', text: '#047857', border: '#a7f3d0', fill: '#059669' }
          : { bg: '#1a3a2a', text: '#10b981', border: '#064e3b', fill: '#059669' };
      default:
        return isLight
          ? { bg: '#eff4ff', text: '#334155', border: '#cbd5e1', fill: '#64748b' }
          : { bg: '#1e293b', text: '#94a3b8', border: '#334155', fill: '#64748b' };
    }
  };

  const style = getStyle(riskLevel);
  const displayScore = score !== undefined ? score : riskLevel === 'high' ? 85 : riskLevel === 'medium' ? 55 : 15;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>Automated Risk Assessment</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Explainable AI/ML rule engine evaluation based on on-chain hop velocity and recipient history.
          </p>
        </div>

        {/* Risk Level & Numeric Score Badge */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Numeric Meter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
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
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
            }}
          >
            {riskLevel?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      </div>

      {/* Progress Score Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'var(--bg-surface-low)',
          borderRadius: '3px',
          marginTop: '1.2rem',
          overflow: 'hidden',
          border: '1px solid var(--border-tactical)',
        }}
      >
        <div
          style={{
            width: `${displayScore}%`,
            height: '100%',
            background: style.fill,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Flagged Indicators List */}
      {indicators && indicators.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {indicators.map((ind, idx) => (
            <span
              key={idx}
              style={{
                background: 'var(--bg-surface-low)',
                border: '1px solid var(--border-tactical)',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {ind}
            </span>
          ))}
        </div>
      )}

      {/* Primary Reasoning Accordion */}
      <div
        style={{
          marginTop: '1rem',
          padding: '0.8rem 1rem',
          background: 'var(--bg-surface-low)',
          borderRadius: '6px',
          border: '1px solid var(--border-tactical)',
          borderLeft: `4px solid ${style.fill}`,
          fontSize: '0.9rem',
          color: 'var(--text-main)',
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
              color: 'var(--accent-cyan)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {expanded ? 'Hide Logic ▲' : 'Expand Rule Logic ▼'}
          </button>
        </div>

        {expanded && (
          <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border-tactical)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <p><strong style={{ color: 'var(--text-main)' }}>On-Chain Intelligence Explainability Breakdown:</strong></p>
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

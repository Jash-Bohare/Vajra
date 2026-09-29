import React from 'react';
import { ShieldAlert, Cpu, CheckCircle, HelpCircle, BarChart3 } from 'lucide-react';
import { FeatureImportanceItem } from '@rt-cfas/types';

interface MLRiskScoreCardProps {
  score?: number;
  mlScore?: number;
  fraudProbability?: number;
  riskLevel?: string;
  confidence?: 'high' | 'medium' | 'low' | string;
  featureImportance?: FeatureImportanceItem[];
  mlModelVersion?: string;
  mlFallbackUsed?: boolean;
}

export const MLRiskScoreCard: React.FC<MLRiskScoreCardProps> = ({
  score = 20,
  mlScore,
  fraudProbability,
  riskLevel = 'low',
  confidence = 'medium',
  featureImportance = [],
  mlModelVersion = 'vajra_fraud_classifier_v1',
  mlFallbackUsed = false,
}) => {
  const displayScore = mlScore !== undefined ? mlScore : score;
  const level = riskLevel?.toLowerCase() || 'low';

  // Determine color theme based on risk level
  const getColor = () => {
    if (level === 'critical' || level === 'high') {
      return {
        stroke: 'var(--danger-crimson, #ef4444)',
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.3)',
        text: 'var(--danger-crimson, #ef4444)',
        badge: 'badge-tactical-crimson',
      };
    }
    if (level === 'medium') {
      return {
        stroke: 'var(--warning-amber, #f59e0b)',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: 'var(--warning-amber, #f59e0b)',
        badge: 'badge-tactical-amber',
      };
    }
    return {
      stroke: 'var(--success-emerald, #10b981)',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
      text: 'var(--success-emerald, #10b981)',
      badge: 'badge-tactical-emerald',
    };
  };

  const colors = getColor();

  // SVG Gauge calculations
  const radius = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  // Arc calculation for semi-circle gauge (180 deg)
  const progress = Math.min(Math.max(displayScore / 100, 0), 1);
  const strokeDashoffset = circumference - progress * (circumference * 0.75);

  return (
    <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div
        style={{
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--bg-surface-low)',
          borderBottom: '1px solid var(--border-tactical)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: '1 1 auto' }}>
          <Cpu size={14} style={{ color: 'var(--accent-cyan-bright)', flexShrink: 0 }} />
          <span className="font-label-caps" style={{ color: 'var(--text-main)', letterSpacing: '0.05em', wordBreak: 'break-word' }}>
            ML RISK CLASSIFIER & SHAP EXPLAINABILITY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span className="badge-tactical badge-tactical-cyan">
            {mlFallbackUsed ? 'FALLBACK: RULES' : 'XGBOOST v1'}
          </span>
        </div>
      </div>

      <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
        {/* Main Gauge & Score Block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            backgroundColor: 'var(--bg-surface-low)',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid var(--border-tactical)',
            flexWrap: 'wrap',
            gap: '1rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Circular Score Gauge */}
          <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-135deg)' }}>
              {/* Background track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="var(--bg-surface-elevated, #334155)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                strokeLinecap="round"
              />
              {/* Active filled arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={colors.stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>

            {/* Centered Score Label */}
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {displayScore.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                / 100 RISK
              </div>
            </div>
          </div>

          {/* Model Verdict & Meta Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '140px', flex: '1 1 auto' }}>
            <div>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                PREDICTED THREAT TIER
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '3px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  {level.toUpperCase()}
                </span>
                <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                  P(fraud): {fraudProbability !== undefined ? `${(fraudProbability * 100).toFixed(1)}%` : `${displayScore.toFixed(0)}%`}
                </span>
              </div>
            </div>

            <div>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                CONFIDENCE & ENGINE
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                <span className="badge-tactical badge-tactical-muted" style={{ textTransform: 'uppercase' }}>
                  CONFIDENCE: {confidence}
                </span>
                <span className="badge-tactical badge-tactical-cyan" style={{ fontSize: '0.65rem' }}>
                  28 FEATURES
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SHAP Feature Importance Decomposition */}
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
              <BarChart3 size={13} style={{ color: 'var(--accent-cyan-bright)', flexShrink: 0 }} />
              <span className="font-label-caps" style={{ color: 'var(--text-main)', fontSize: '0.7rem', wordBreak: 'break-word' }}>
                SHAP IMPACT BREAKDOWN (TOP DECISION SIGNALS)
              </span>
            </div>
            <span className="font-mono-data-xs" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', flexShrink: 0 }}>
              Court-Admissible Attribution
            </span>
          </div>

          {featureImportance && featureImportance.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
              {featureImportance.slice(0, 5).map((item, idx) => {
                const numShap = typeof item.shapValue === 'number' ? item.shapValue : (typeof (item as any).shap_value === 'number' ? (item as any).shap_value : 0);
                const rawVal = item.rawValue !== undefined ? item.rawValue : ((item as any).raw_value !== undefined ? (item as any).raw_value : (item as any).value ?? 0);
                const isRiskInc = item.direction === 'increases_risk' || numShap > 0;
                const barColor = isRiskInc ? 'var(--danger-crimson, #ef4444)' : 'var(--success-emerald, #10b981)';
                const barWidth = Math.min(Math.abs(numShap) * 4 + 10, 100);

                const formattedRaw = typeof rawVal === 'number' ? rawVal.toLocaleString() : String(rawVal);

                return (
                  <div
                    key={(item.feature || 'feat') + '_' + idx}
                    style={{
                      backgroundColor: 'var(--bg-surface-low)',
                      padding: '0.45rem 0.6rem',
                      borderRadius: '3px',
                      border: '1px solid var(--border-tactical)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span className="font-mono-data-xs" style={{ color: 'var(--text-main)', fontWeight: 600, wordBreak: 'break-word', minWidth: '120px', flex: '1 1 auto' }}>
                        {(item.feature || '').replace(/_/g, ' ')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                          val: {formattedRaw}
                        </span>
                        <span
                          className="font-mono-data-xs"
                          style={{
                            color: barColor,
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        >
                          {isRiskInc ? `+${numShap.toFixed(2)}` : `${numShap.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Visual Impact Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: '4px',
                        backgroundColor: 'var(--bg-surface-elevated, #1e293b)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          backgroundColor: barColor,
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-low)',
                padding: '0.75rem',
                borderRadius: '3px',
                border: '1px solid var(--border-tactical)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                textAlign: 'center',
              }}
            >
              Standard heuristic rule scoring applied across all 28 topological features.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

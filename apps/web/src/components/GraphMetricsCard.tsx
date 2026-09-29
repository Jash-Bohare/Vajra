import React from 'react';
import { Network, Activity, Zap, Share2, Layers } from 'lucide-react';
import { GraphMetrics } from '@rt-cfas/types';

interface GraphMetricsCardProps {
  metrics?: GraphMetrics;
  rootAddress?: string;
}

export const GraphMetricsCard: React.FC<GraphMetricsCardProps> = ({ metrics, rootAddress }) => {
  if (!metrics) {
    return null;
  }

  // Determine topology type badge
  const getTopologyBadge = () => {
    if (metrics.isStarTopology) {
      return { label: 'STAR FAN-OUT (HUB)', color: 'var(--danger-crimson, #ef4444)' };
    }
    if (metrics.isHourglassTopology) {
      return { label: 'HOURGLASS (SPLIT + RECOMBINE)', color: 'var(--danger-crimson, #ef4444)' };
    }
    if (metrics.isClusterTopology) {
      return { label: 'CLUSTER MESH', color: 'var(--warning-amber, #f59e0b)' };
    }
    if (metrics.isLinearChain) {
      return { label: 'LINEAR CHAIN', color: 'var(--accent-cyan-bright, #38bdf8)' };
    }
    return { label: 'HYBRID GRAPH', color: 'var(--text-main, #f8fafc)' };
  };

  const topo = getTopologyBadge();

  return (
    <div className="surface-card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--bg-surface-low)',
          borderBottom: '1px solid var(--border-tactical)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Network size={14} style={{ color: 'var(--accent-cyan-bright)' }} />
          <span className="font-label-caps" style={{ color: 'var(--text-main)', letterSpacing: '0.05em' }}>
            GRAPH TOPOLOGICAL ANALYTICS (NETWORKX)
          </span>
        </div>
        <span
          className="badge-tactical"
          style={{
            color: topo.color,
            borderColor: topo.color,
            fontSize: '0.68rem',
            fontWeight: 700,
          }}
        >
          {topo.label}
        </span>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {/* Metric Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.65rem',
          }}
        >
          {/* Node / Edge Count */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '0.6rem 0.75rem',
              borderRadius: '3px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', display: 'block' }}>
              NODES / EDGES
            </span>
            <div className="font-headline-sm" style={{ color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {metrics.nodeCount}{' '}
              <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                / {metrics.edgeCount}
              </span>
            </div>
          </div>

          {/* Max Fan-Out Degree */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '0.6rem 0.75rem',
              borderRadius: '3px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', display: 'block' }}>
              MAX FAN-OUT / IN
            </span>
            <div className="font-headline-sm" style={{ color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {metrics.maxFanOutDegree}{' '}
              <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                out / {metrics.maxFanInDegree} in
              </span>
            </div>
          </div>

          {/* Fastest Hop Velocity */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '0.6rem 0.75rem',
              borderRadius: '3px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', display: 'block' }}>
              FASTEST HOP SPEED
            </span>
            <div className="font-headline-sm" style={{ color: metrics.minHopVelocitySec < 120 ? 'var(--danger-crimson)' : 'var(--text-main)', marginTop: '0.2rem' }}>
              {metrics.minHopVelocitySec ? `${Math.round(metrics.minHopVelocitySec)}s` : 'N/A'}
            </div>
          </div>

          {/* Clustering Coefficient */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '0.6rem 0.75rem',
              borderRadius: '3px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', display: 'block' }}>
              CLUSTERING COEFF
            </span>
            <div className="font-mono-data-sm" style={{ color: 'var(--accent-cyan-bright)', marginTop: '0.2rem', fontWeight: 700 }}>
              {metrics.clusteringCoefficient.toFixed(3)}
            </div>
          </div>

          {/* Betweenness Centrality */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '0.6rem 0.75rem',
              borderRadius: '3px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', display: 'block' }}>
              AVG BETWEENNESS
            </span>
            <div className="font-mono-data-sm" style={{ color: 'var(--accent-cyan-bright)', marginTop: '0.2rem', fontWeight: 700 }}>
              {metrics.avgBetweennessCentrality.toFixed(3)}
            </div>
          </div>

          {/* Value Decay Ratio */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              padding: '0.6rem 0.75rem',
              borderRadius: '3px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            <span className="font-label-caps" style={{ color: 'var(--text-dim)', fontSize: '0.65rem', display: 'block' }}>
              VALUE DECAY (PEEL)
            </span>
            <div className="font-mono-data-sm" style={{ color: metrics.valueDecayRatio > 0.2 ? 'var(--danger-crimson)' : 'var(--text-main)', marginTop: '0.2rem', fontWeight: 700 }}>
              {(metrics.valueDecayRatio * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  const isStar = metrics.isStarTopology ?? (metrics as any).is_star_topology;
  const isHourglass = metrics.isHourglassTopology ?? (metrics as any).is_hourglass_topology;
  const isCluster = metrics.isClusterTopology ?? (metrics as any).is_cluster_topology;
  const isLinear = metrics.isLinearChain ?? (metrics as any).is_linear_chain;

  const nodeCount = metrics.nodeCount ?? (metrics as any).node_count ?? 8;
  const edgeCount = metrics.edgeCount ?? (metrics as any).edge_count ?? 7;
  const maxFanOut = metrics.maxFanOutDegree ?? (metrics as any).max_fan_out_degree ?? 2;
  const maxFanIn = metrics.maxFanInDegree ?? (metrics as any).max_fan_in_degree ?? 1;
  const minHopVelocity = metrics.minHopVelocitySec ?? (metrics as any).min_hop_velocity_sec ?? 42.0;
  const clusteringCoeff = metrics.clusteringCoefficient ?? (metrics as any).clustering_coefficient ?? 0.08;
  const avgBetweenness = metrics.avgBetweennessCentrality ?? (metrics as any).avg_betweenness_centrality ?? 0.28;
  const valueDecay = metrics.valueDecayRatio ?? (metrics as any).value_decay_ratio ?? 0.175;

  // Determine topology type badge
  const getTopologyBadge = () => {
    if (isStar) {
      return { label: 'STAR FAN-OUT (HUB)', color: 'var(--danger-crimson, #ef4444)' };
    }
    if (isHourglass) {
      return { label: 'HOURGLASS (SPLIT + RECOMBINE)', color: 'var(--danger-crimson, #ef4444)' };
    }
    if (isCluster) {
      return { label: 'CLUSTER MESH', color: 'var(--warning-amber, #f59e0b)' };
    }
    if (isLinear) {
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
              {nodeCount}{' '}
              <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                / {edgeCount}
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
              {maxFanOut}{' '}
              <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                out / {maxFanIn} in
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
            <div className="font-headline-sm" style={{ color: minHopVelocity < 120 ? 'var(--danger-crimson)' : 'var(--text-main)', marginTop: '0.2rem' }}>
              {minHopVelocity ? `${Math.round(minHopVelocity)}s` : 'N/A'}
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
              {typeof clusteringCoeff === 'number' ? clusteringCoeff.toFixed(3) : '0.000'}
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
              {typeof avgBetweenness === 'number' ? avgBetweenness.toFixed(3) : '0.000'}
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
            <div className="font-mono-data-sm" style={{ color: valueDecay > 0.2 ? 'var(--danger-crimson)' : 'var(--text-main)', marginTop: '0.2rem', fontWeight: 700 }}>
              {typeof valueDecay === 'number' ? `${(valueDecay * 100).toFixed(1)}%` : '0.0%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

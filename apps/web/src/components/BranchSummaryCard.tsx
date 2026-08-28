import React from 'react';
import { InvestigationTree, BranchSummary } from '@rt-cfas/types';

interface BranchSummaryCardProps {
  tree: InvestigationTree;
  onSelectBranch?: (branch: BranchSummary) => void;
  selectedBranchId?: string;
}

export const BranchSummaryCard: React.FC<BranchSummaryCardProps> = ({
  tree,
  onSelectBranch,
  selectedBranchId,
}) => {
  if (!tree || !tree.branches || tree.branches.length === 0) {
    return null;
  }

  const getTerminalBadge = (type: string, exchangeName?: string) => {
    if (type === 'exchange') {
      return (
        <span
          style={{
            background: '#451a1a',
            color: '#ef4444',
            border: '1px solid #7f1d1d',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          🏛️ {exchangeName || 'Known Exchange'}
        </span>
      );
    }
    if (type === 'peeling_leaf') {
      return (
        <span
          style={{
            background: '#1a3a2a',
            color: '#10b981',
            border: '1px solid #064e3b',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
          }}
        >
          🍃 Peeling Leaf (&lt; $5 USD)
        </span>
      );
    }
    if (type === 'max_depth_reached') {
      return (
        <span
          style={{
            background: '#452a1a',
            color: '#f59e0b',
            border: '1px solid #78350f',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
          }}
        >
          🛑 Max Depth (5 Hops)
        </span>
      );
    }
    return (
      <span
        style={{
          background: '#1e293b',
          color: '#94a3b8',
          border: '1px solid #334155',
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
        }}
      >
        🔍 Uncataloged Wallet
      </span>
    );
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🌳 Multi-Branch Tree Topology</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Fund flow breakdown across {tree.totalBranches} independent branches ({tree.exchangeBranches} terminating at cataloged exchanges).
          </p>
        </div>

        {/* Topology Summary Indicators */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {tree.totalFanOutNodes > 0 && (
            <span
              style={{
                background: '#3b0764',
                color: '#d8b4fe',
                border: '1px solid #6b21a8',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              🌿 Fan-Out Splitting ({tree.totalFanOutNodes} nodes)
            </span>
          )}
          {tree.totalFanInNodes > 0 && (
            <span
              style={{
                background: '#1e1b4b',
                color: '#818cf8',
                border: '1px solid #3730a3',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ⌛ Fan-In Convergence ({tree.totalFanInNodes} nodes)
            </span>
          )}
          {tree.isCapped && (
            <span
              style={{
                background: '#452a1a',
                color: '#f59e0b',
                border: '1px solid #78350f',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ⚡ Tree Capped @ 25 Nodes
            </span>
          )}
        </div>
      </div>

      {/* Taint Coverage Progress Bar */}
      <div style={{ marginBottom: '1.2rem', background: '#0f172a', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Investigative Taint Coverage:</span>
          <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {tree.taintCoveragePercent}% accounted for
          </span>
        </div>
        <div style={{ background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              width: `${Math.min(tree.taintCoveragePercent, 100)}%`,
              height: '100%',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Branch Breakdown Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.6rem 0.8rem' }}>Branch</th>
              <th style={{ padding: '0.6rem 0.8rem' }}>Hops</th>
              <th style={{ padding: '0.6rem 0.8rem' }}>Terminal Address</th>
              <th style={{ padding: '0.6rem 0.8rem' }}>Endpoint Status</th>
              <th style={{ padding: '0.6rem 0.8rem' }}>Taint Share</th>
              <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tree.branches.map((b) => {
              const isSelected = selectedBranchId === b.branchId;
              return (
                <tr
                  key={b.branchId}
                  style={{
                    borderBottom: '1px solid #1e293b',
                    background: isSelected ? '#1e293b' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {b.branchId}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem' }}>{b.hopCount} hops</td>
                  <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)' }}>
                    {b.terminalAddress.slice(0, 8)}...{b.terminalAddress.slice(-6)}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem' }}>
                    {getTerminalBadge(b.terminalType, b.exchangeName)}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ background: '#1e293b', width: '60px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            background: b.terminalType === 'exchange' ? '#ef4444' : '#3b82f6',
                            width: `${Math.min(b.taintPercentage, 100)}%`,
                            height: '100%',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{b.taintPercentage}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>
                    <button
                      onClick={() => onSelectBranch && onSelectBranch(b)}
                      style={{
                        background: isSelected ? '#0284c7' : '#1e293b',
                        color: '#fff',
                        border: '1px solid ' + (isSelected ? '#38bdf8' : '#334155'),
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {isSelected ? 'Focused ✓' : '🔍 Focus Branch'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

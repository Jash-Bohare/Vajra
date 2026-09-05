import React from 'react';
import { InvestigationTree, BranchSummary } from '@rt-cfas/types';
import { useTheme } from '../context/ThemeContext';

interface BranchSummaryCardProps {
  tree: InvestigationTree;
  onSelectBranch?: (branch: BranchSummary | null) => void;
  selectedBranchId?: string | null;
}

export const BranchSummaryCard: React.FC<BranchSummaryCardProps> = ({
  tree,
  onSelectBranch,
  selectedBranchId,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!tree || !tree.branches || tree.branches.length === 0) {
    return null;
  }

  const getTerminalBadge = (type: string, exchangeName?: string) => {
    if (type === 'exchange') {
      return (
        <span
          style={{
            backgroundColor: isLight ? '#d1fae5' : '#064e3b',
            color: isLight ? '#047857' : '#34d399',
            border: `1px solid ${isLight ? '#a7f3d0' : '#059669'}`,
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>account_balance</span>
          <span>{exchangeName || 'VASP Exchange Exit'}</span>
        </span>
      );
    }
    if (type === 'peeling_leaf') {
      return (
        <span
          style={{
            backgroundColor: 'var(--bg-surface-low)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-tactical)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>spa</span>
          <span>Peeling Leaf (&lt; $5 USD)</span>
        </span>
      );
    }
    if (type === 'max_depth_reached') {
      return (
        <span
          style={{
            backgroundColor: isLight ? '#fef3c7' : '#451a03',
            color: isLight ? '#b45309' : '#fbbf24',
            border: `1px solid ${isLight ? '#fde68a' : '#78350f'}`,
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>explore_off</span>
          <span>Max Depth Reached</span>
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: 'var(--bg-surface-low)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-tactical)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>account_balance_wallet</span>
        <span>Uncataloged Wallet</span>
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-tactical)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--bg-surface-low)',
          borderBottom: '1px solid var(--border-tactical)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-cyan)' }}>
            fork_right
          </span>
          <div>
            <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', margin: 0 }}>
              Multi-Branch Tree Topology & Branch Focus
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0 0' }}>
              Fund flow breakdown across {tree.totalBranches} independent branches ({tree.exchangeBranches} terminating at verified exchanges)
            </p>
          </div>
        </div>

        {/* Badges / Indicators */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {tree.totalFanOutNodes > 0 && (
            <span
              style={{
                backgroundColor: isLight ? '#f3e8ff' : 'rgba(147, 51, 234, 0.2)',
                color: isLight ? '#6b21a8' : '#e9d5ff',
                border: `1px solid ${isLight ? '#d8b4fe' : '#9333ea'}`,
                padding: '3px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>call_split</span>
              <span>Fan-Out: {tree.totalFanOutNodes}</span>
            </span>
          )}
          {tree.totalFanInNodes > 0 && (
            <span
              style={{
                backgroundColor: isLight ? '#e0e7ff' : 'rgba(99, 102, 241, 0.2)',
                color: isLight ? '#3730a3' : '#c7d2fe',
                border: `1px solid ${isLight ? '#c7d2fe' : '#6366f1'}`,
                padding: '3px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>call_merge</span>
              <span>Fan-In: {tree.totalFanInNodes}</span>
            </span>
          )}
          {tree.isCapped && (
            <span
              style={{
                backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                color: isLight ? '#92400e' : '#fde68a',
                border: `1px solid ${isLight ? '#fde68a' : '#d97706'}`,
                padding: '3px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            >
              Capped @ 25 Nodes
            </span>
          )}
        </div>
      </div>

      {/* Taint Coverage Progress Bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-tactical)', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            FORENSIC TAINT COVERAGE:
          </span>
          <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {tree.taintCoveragePercent}% Accounted For
          </span>
        </div>
        <div style={{ background: 'var(--bg-surface-low)', height: '6px', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, var(--accent-cyan), #8b5cf6)',
              width: `${Math.min(tree.taintCoveragePercent, 100)}%`,
              height: '100%',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Branch Breakdown Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-low)', borderBottom: '1px solid var(--border-tactical)' }}>
              <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>BRANCH ID</th>
              <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>HOPS</th>
              <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>TERMINAL ADDRESS</th>
              <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>ENDPOINT STATUS</th>
              <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>TAINT SHARE</th>
              <th style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700, textAlign: 'right' }}>GRAPH ACTION</th>
            </tr>
          </thead>
          <tbody>
            {tree.branches.map((b, idx) => {
              const isSelected = selectedBranchId === b.branchId;
              return (
                <tr
                  key={b.branchId}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: isSelected
                      ? (isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(2, 132, 199, 0.2)')
                      : 'var(--bg-surface)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>
                        {isSelected ? 'radio_button_checked' : 'alt_route'}
                      </span>
                      <span>{b.branchId}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-main)' }}>
                    {b.hopCount} hop{b.hopCount > 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    <a
                      href={`https://etherscan.io/address/${b.terminalAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--text-main)', textDecoration: 'none' }}
                      title={b.terminalAddress}
                    >
                      {b.terminalAddress.slice(0, 8)}...{b.terminalAddress.slice(-6)}
                    </a>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getTerminalBadge(b.terminalType, b.exchangeName)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: 'var(--bg-surface-high)', width: '64px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            background: b.terminalType === 'exchange' ? 'var(--success-emerald)' : 'var(--accent-cyan)',
                            width: `${Math.min(b.taintPercentage, 100)}%`,
                            height: '100%',
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {b.taintPercentage}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBranch) {
                          onSelectBranch(isSelected ? null : b);
                        }
                      }}
                      style={{
                        padding: '5px 12px',
                        backgroundColor: isSelected ? 'var(--accent-cyan)' : 'var(--bg-surface-low)',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                        borderRadius: '4px',
                        fontFamily: 'var(--font-headline)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {isSelected ? 'visibility' : 'filter_center_focus'}
                      </span>
                      <span>{isSelected ? 'Focused' : 'Focus Branch'}</span>
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

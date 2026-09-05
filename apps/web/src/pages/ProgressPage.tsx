import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Cpu, Activity, RefreshCw } from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically navigate to live results page once trace initiates
    const timer = setTimeout(() => {
      navigate(`/investigations/${id}`);
    }, 1200);

    return () => clearTimeout(timer);
  }, [id, navigate]);

  return (
    <div
      className="surface-card"
      style={{
        textAlign: 'center',
        padding: '5rem 2rem',
        margin: '2rem auto',
        maxWidth: '680px',
        border: '1px solid var(--border-cyan)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '3px solid var(--border-highlight)',
          borderTopColor: 'var(--accent-cyan)',
          borderRightColor: 'var(--accent-cyan-bright)',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1.5rem auto',
        }}
      />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h2 className="font-headline-md" style={{ color: 'var(--text-main)' }}>
          Executing Decaying Taint BFS Tracing Engine
        </h2>
        <span className="badge-tactical badge-tactical-cyan">LIVE QUEUE</span>
      </div>

      <p className="font-body-sm" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Target Dossier ID: <span className="code-badge">{id}</span>
      </p>

      <div
        style={{
          backgroundColor: 'var(--bg-surface-low)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '4px',
          padding: '1rem',
          maxWidth: '480px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={14} style={{ color: 'var(--accent-cyan-bright)' }} />
          <span className="font-mono-data-xs" style={{ color: 'var(--text-main)' }}>
            Stage 1: Polling Ethereum Mainnet archive nodes & Etherscan V2...
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={14} style={{ color: 'var(--warning-amber)' }} />
          <span className="font-mono-data-xs" style={{ color: 'var(--text-main)' }}>
            Stage 2: Evaluating MLAT compliance catalog & VASP deposit signatures...
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={14} style={{ color: 'var(--success-emerald)' }} />
          <span className="font-mono-data-xs" style={{ color: 'var(--text-main)' }}>
            Stage 3: Computing FIFO taint shares and Section 65B audit stamps...
          </span>
        </div>
      </div>
    </div>
  );
};

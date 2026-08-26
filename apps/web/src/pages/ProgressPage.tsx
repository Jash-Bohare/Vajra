import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const ProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="card">
      <h2>Tracing Investigation Pipeline</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Investigation ID: <span className="code-badge">{id}</span>
      </p>

      <div style={{ padding: '2rem 0', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          Tracing on-chain transaction hops and matching against known VASP deposit addresses...
        </p>
        <Link
          to={`/investigations/${id}`}
          style={{
            background: 'var(--accent-primary)',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          View Live Results Placeholder
        </Link>
      </div>
    </div>
  );
};

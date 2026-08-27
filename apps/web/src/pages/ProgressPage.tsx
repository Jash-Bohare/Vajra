import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export const ProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically navigate to live results page
    const timer = setTimeout(() => {
      navigate(`/investigations/${id}`);
    }, 1200);

    return () => clearTimeout(timer);
  }, [id, navigate]);

  return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
      <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Tracing Investigation Pipeline</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Investigation ID: <span className="code-badge">{id}</span>
      </p>

      <div style={{ display: 'inline-block', margin: '1rem 0' }}>
        <p style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>
          Fetching on-chain Etherscan V2 transactions & evaluating Python risk rules...
        </p>
      </div>
    </div>
  );
};

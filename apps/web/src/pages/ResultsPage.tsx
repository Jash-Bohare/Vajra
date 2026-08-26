import React from 'react';
import { useParams } from 'react-router-dom';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="card">
        <h2>Investigation Summary</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          ID: <span className="code-badge">{id}</span> | Chain: <span className="code-badge">Ethereum</span>
        </p>
      </div>

      <div className="card">
        <h2>Fund Flow Graph Visualization</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Visual fund flow graph rendering (Cytoscape.js) will populate here in Phase 5.
        </p>
      </div>
    </div>
  );
};

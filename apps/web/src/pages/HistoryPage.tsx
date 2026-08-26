import React from 'react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="card">
      <h2>Session History</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        No prior investigations in this browser session.
      </p>
    </div>
  );
};

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AttributionTerminal } from './pages/AttributionTerminal';
import { HistoryPage } from './pages/HistoryPage';
import { TacticalHeader } from './components/layout/TacticalHeader';
import { TacticalSidebar } from './components/layout/TacticalSidebar';

export const App: React.FC = () => {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9ff', color: '#0b1c30' }}>
        <TacticalHeader />

        <div style={{ display: 'flex', paddingTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
          <TacticalSidebar />

          <main style={{ flex: 1, marginLeft: '256px', padding: '16px 24px', minWidth: 0 }}>
            <Routes>
              <Route path="/" element={<AttributionTerminal />} />
              <Route path="/investigations/:id/progress" element={<AttributionTerminal />} />
              <Route path="/investigations/:id" element={<AttributionTerminal />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/dossier" element={<HistoryPage />} />
              <Route path="/vasp-registry" element={<HistoryPage />} />
              <Route path="/ledger" element={<HistoryPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

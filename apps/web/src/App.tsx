import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AttributionTerminal } from './pages/AttributionTerminal';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { TacticalHeader } from './components/layout/TacticalHeader';
import { TacticalSidebar } from './components/layout/TacticalSidebar';

const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Root route renders the Sovereign Landing & Command Portal
  if (location.pathname === '/') {
    return <LandingPage />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme === 'dark' ? '#080b10' : '#f8f9ff',
        color: theme === 'dark' ? '#f1f5f9' : '#0b1c30',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <TacticalHeader
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={mobileSidebarOpen}
      />

      <div style={{ display: 'flex', paddingTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
        <TacticalSidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main
          className="app-main-layout"
          style={{
            flex: 1,
            marginLeft: '256px',
            padding: '16px 24px',
            minWidth: 0,
            backgroundColor: theme === 'dark' ? '#080b10' : '#f8f9ff',
          }}
        >
          <Routes>
            <Route path="/terminal" element={<HomePage />} />
            <Route path="/intake" element={<HomePage />} />
            <Route path="/investigations/:id" element={<AttributionTerminal />} />
            <Route path="/investigations/:id/progress" element={<AttributionTerminal />} />
            <Route path="/history" element={<HistoryPage />} />
            {/* Redirect legacy redundant routes to /history */}
            <Route path="/dossier" element={<Navigate to="/history" replace />} />
            <Route path="/vasp-registry" element={<Navigate to="/history" replace />} />
            <Route path="/ledger" element={<Navigate to="/history" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
      </Router>
    </ThemeProvider>
  );
};



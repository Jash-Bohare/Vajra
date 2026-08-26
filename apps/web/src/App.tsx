import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ProgressPage } from './pages/ProgressPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <header>
          <h1>RT-CFAS</h1>
          <nav>
            <NavLink to="/" end>New Investigation</NavLink>
            <NavLink to="/history">Session History</NavLink>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/investigations/:id/progress" element={<ProgressPage />} />
            <Route path="/investigations/:id" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

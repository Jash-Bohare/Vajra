import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export const TacticalBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isIntakeActive = location.pathname === '/intake' || location.pathname === '/terminal';
  const isHistoryActive = location.pathname === '/history' || location.pathname.startsWith('/investigations');
  const isHomeActive = location.pathname === '/';

  return (
    <nav
      className="tactical-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-tactical)',
        display: 'none', // Controlled by CSS media query (.tactical-bottom-nav)
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(12px)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* 1. Portal Home */}
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: isHomeActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          home
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: isHomeActive ? 700 : 500 }}>
          Portal
        </span>
      </button>

      {/* 2. Intake */}
      <NavLink
        to="/intake"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          textDecoration: 'none',
          color: isIntakeActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: isIntakeActive ? 'var(--bg-surface-high)' : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          radar
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: isIntakeActive ? 700 : 500 }}>
          Intake
        </span>
      </NavLink>

      {/* 3. Investigation History / Results */}
      <NavLink
        to="/history"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          textDecoration: 'none',
          color: isHistoryActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: isHistoryActive ? 'var(--bg-surface-high)' : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          folder_open
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: isHistoryActive ? 700 : 500 }}>
          History
        </span>
      </NavLink>

      {/* 4. Theme Switcher */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          background: 'none',
          border: 'none',
          color: theme === 'dark' ? '#f59e0b' : 'var(--accent-cyan)',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          {theme === 'dark' ? 'dark_mode' : 'light_mode'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600 }}>
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </button>
    </nav>
  );
};

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export const TacticalSidebar: React.FC = () => {
  const location = useLocation();
  const { theme } = useTheme();

  const navItems = [
    {
      label: 'New Investigation Intake',
      path: '/',
      exact: true,
    },
    {
      label: 'Fund Flow Attribution',
      path: '/terminal',
      isTerminal: true,
    },
    {
      label: 'Investigation History',
      path: '/history',
    },
  ];

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: '64px',
        bottom: 0,
        width: '256px',
        backgroundColor: theme === 'dark' ? '#0e131c' : '#ffffff',
        borderRight: theme === 'dark' ? '1px solid #1e293b' : '1px solid #c6c6cd',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 0',
        zIndex: 40,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* 1. Navigation Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '0 16px 4px 16px' }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '10px',
              fontWeight: 700,
              color: theme === 'dark' ? '#94a3b8' : '#76777d',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Forensic Workspaces
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
          {navItems.map((item) => {
            const isActive = item.isTerminal
              ? location.pathname === '/terminal' || location.pathname.startsWith('/investigations/')
              : item.exact
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.label}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: isActive
                    ? (theme === 'dark' ? '#f1f5f9' : '#0b1c30')
                    : (theme === 'dark' ? '#94a3b8' : '#45464d'),
                  backgroundColor: isActive
                    ? (theme === 'dark' ? '#1c2738' : '#dce9ff')
                    : 'transparent',
                  borderLeft: isActive
                    ? (theme === 'dark' ? '3px solid #38bdf8' : '3px solid #006780')
                    : '3px solid transparent',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 2. Bottom Station Telemetry */}
      <div
        style={{
          padding: '16px',
          borderTop: theme === 'dark' ? '1px solid #1e293b' : '1px solid #c6c6cd',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: theme === 'dark' ? '#94a3b8' : '#76777d' }}>
            STATION STATUS
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: theme === 'dark' ? '#38bdf8' : '#006780' }}>
            ONLINE
          </span>
        </div>

        <div
          style={{
            padding: '6px',
            backgroundColor: theme === 'dark' ? '#161f2e' : '#eff4ff',
            border: theme === 'dark' ? '1px solid #203657' : '1px solid #c6c6cd',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: theme === 'dark' ? '#94a3b8' : '#45464d' }}>
            TERMINAL ID: LEA-DL-994
          </span>
        </div>
      </div>
    </aside>
  );
};

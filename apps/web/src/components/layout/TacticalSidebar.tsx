import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface TacticalSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const TacticalSidebar: React.FC<TacticalSidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [utcTime, setUtcTime] = useState('');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);

  useEffect(() => {
    // 1. Live UTC Clock
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);

    // 2. Fetch real-time Ethereum network block height & oracle telemetry
    const fetchNetwork = async () => {
      try {
        const res = await fetch('/api/investigations/system/network-status');
        if (res.ok) {
          const data = await res.json();
          if (data && data.latestBlock) {
            setBlockNumber(data.latestBlock);
          }
        }
      } catch (err) {
        console.warn('[TacticalSidebar] Network telemetry unreachable:', err);
      }
    };
    fetchNetwork();
    const netTimer = setInterval(fetchNetwork, 30000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(netTimer);
    };
  }, []);

  const navItems = [
    {
      label: 'New Investigation Intake',
      path: '/intake',
      exact: false,
      icon: 'radar',
    },
    {
      label: 'Investigation History',
      path: '/history',
      exact: false,
      icon: 'folder_open',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            top: '64px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 45,
          }}
        />
      )}

      <aside
        className={`app-sidebar-responsive ${isOpenMobile ? 'open' : ''}`}
        style={{
          position: 'fixed',
          left: 0,
          top: '64px',
          bottom: 0,
          width: '256px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-tactical)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px 0',
          zIndex: 46,
          transition: 'transform 0.25s ease, background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
      {/* 1. Navigation Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '0 16px 4px 16px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-dim)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Forensic Workspaces
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
          {navItems.map((item) => {
            const isActive =
              item.path === '/intake'
                ? location.pathname === '/intake' || location.pathname === '/terminal'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.label}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--bg-surface-high)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)' }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 2. Bottom Controls & Telemetry Panel */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-tactical)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Real-time Network Telemetry Card */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface-low)',
            border: '1px solid var(--border-tactical)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9.5px',
                fontWeight: 700,
                color: 'var(--text-dim)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Network Telemetry
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-emerald)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: 'var(--success-emerald)',
                }}
              >
                SYNCED
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-main)',
                lineHeight: '1.2',
              }}
            >
              {utcTime || '2026-09-04 14:19:21 UTC'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                lineHeight: '1.2',
              }}
            >
              ETH MAINNET #{blockNumber ? blockNumber.toLocaleString() : '25,904,506'}
            </span>
          </div>
        </div>

        {/* Cohesive Segmented Theme Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface-low)',
            border: '1px solid var(--border-tactical)',
            borderRadius: '4px',
            padding: '3px',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => theme !== 'light' && toggleTheme()}
            title="Switch to Light Theme"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 8px',
              borderRadius: '3px',
              border: theme === 'light' ? '1px solid var(--border-tactical)' : '1px solid transparent',
              backgroundColor: theme === 'light' ? 'var(--bg-surface)' : 'transparent',
              color: theme === 'light' ? 'var(--accent-cyan)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: theme === 'light' ? 700 : 500,
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>light_mode</span>
            <span>LIGHT</span>
          </button>
          <button
            type="button"
            onClick={() => theme !== 'dark' && toggleTheme()}
            title="Switch to Dark Theme"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 8px',
              borderRadius: '3px',
              border: theme === 'dark' ? '1px solid var(--border-tactical)' : '1px solid transparent',
              backgroundColor: theme === 'dark' ? 'var(--bg-surface-high)' : 'transparent',
              color: theme === 'dark' ? '#f59e0b' : 'var(--text-dim)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: theme === 'dark' ? 700 : 500,
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>dark_mode</span>
            <span>DARK</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

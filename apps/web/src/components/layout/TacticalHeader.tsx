import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface TacticalHeaderProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <header
      className="tactical-header-responsive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        zIndex: 50,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-tactical)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger Drawer Trigger */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            className="tactical-mobile-menu-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle Navigation Menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: isMobileSidebarOpen ? 'var(--bg-surface-high)' : 'var(--bg-surface-low)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '4px',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {isMobileSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>
        )}

        {/* 1. Brand Logo, Name, Restricted Badge & Tagline */}
        <div
          onClick={() => navigate('/')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '17px',
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
              }}
            >
              VAJRA
            </span>
            <span
              style={{
                padding: '2px 7px',
                backgroundColor: 'var(--bg-surface-low)',
                border: '1px solid var(--border-tactical)',
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                letterSpacing: '0.04em',
              }}
            >
              GOVT LEA
            </span>
          </div>
          <span
            className="brand-tagline-mobile"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Cyber Forensic Suite
          </span>
        </div>
      </div>

      {/* 2. Investigator ID Profile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-main)',
              lineHeight: '1.2',
            }}
          >
            INV-7809
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-dim)',
              lineHeight: '1.2',
            }}
          >
            NCB-DELHI
          </span>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface-low)',
            border: '1px solid var(--border-tactical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)',
            transition: 'all 0.2s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { AssetType } from '@rt-cfas/types';
import { useTheme } from '../context/ThemeContext';

interface TokenBadgeProps {
  symbol?: AssetType | string;
  isInternalTx?: boolean;
}

export const TokenBadge: React.FC<TokenBadgeProps> = ({ symbol = 'ETH', isInternalTx }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (isInternalTx) {
    return (
      <span
        style={{
          background: isLight ? '#fee2e2' : '#451a1a',
          color: isLight ? '#b91c1c' : '#f87171',
          border: `1px solid ${isLight ? '#fca5a5' : '#7f1d1d'}`,
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        Contract
      </span>
    );
  }

  const getStyle = (sym: string) => {
    switch (sym.toUpperCase()) {
      case 'USDT':
        return isLight
          ? { bg: '#d1fae5', color: '#047857', border: '#a7f3d0' }
          : { bg: '#064e3b', color: '#34d399', border: '#047857' };
      case 'USDC':
        return isLight
          ? { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' }
          : { bg: '#1e3a8a', color: '#60a5fa', border: '#1d4ed8' };
      case 'DAI':
        return isLight
          ? { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
          : { bg: '#713f12', color: '#facc15', border: '#a16207' };
      case 'WETH':
        return isLight
          ? { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' }
          : { bg: '#4c1d95', color: '#c084fc', border: '#6d28d9' };
      case 'ETH':
      default:
        return isLight
          ? { bg: '#eff4ff', color: '#0284c7', border: '#bae6fd' }
          : { bg: '#0c2847', color: '#38bdf8', border: '#0284c7' };
    }
  };

  const style = getStyle(symbol);

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: '0.2rem 0.6rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {symbol.toUpperCase()}
    </span>
  );
};

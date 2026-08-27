import React from 'react';
import { AssetType } from '@rt-cfas/types';

interface TokenBadgeProps {
  symbol?: AssetType | string;
  isInternalTx?: boolean;
}

export const TokenBadge: React.FC<TokenBadgeProps> = ({ symbol = 'ETH', isInternalTx }) => {
  if (isInternalTx) {
    return (
      <span
        style={{
          background: '#451a1a',
          color: '#f97316',
          border: '1px solid #7c2d12',
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
      >
        ⚙️ Contract
      </span>
    );
  }

  const getStyle = (sym: string) => {
    switch (sym.toUpperCase()) {
      case 'USDT':
        return { bg: '#064e3b', color: '#10b981', border: '#047857', icon: '🟢' };
      case 'USDC':
        return { bg: '#1e3a8a', color: '#60a5fa', border: '#1d4ed8', icon: '🔵' };
      case 'DAI':
        return { bg: '#713f12', color: '#facc15', border: '#a16207', icon: '🟡' };
      case 'WETH':
        return { bg: '#4c1d95', color: '#c084fc', border: '#6d28d9', icon: '🟣' };
      case 'ETH':
      default:
        return { bg: '#3b0764', color: '#a855f7', border: '#7e22ce', icon: '🟣' };
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
        gap: '0.3rem',
      }}
    >
      {style.icon} {symbol.toUpperCase()}
    </span>
  );
};

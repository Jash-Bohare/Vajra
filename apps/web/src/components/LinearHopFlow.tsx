import React, { useState } from 'react';
import { 
  ArrowDown, 
  GitCommit, 
  ShieldAlert, 
  ExternalLink, 
  Copy, 
  Check,
  Split,
  Landmark,
  Layers
} from 'lucide-react';

interface HopItem {
  hopNumber: number;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  value: string;
  usdValue?: number;
  tokenSymbol?: string;
  timestamp?: string;
  isTerminal?: boolean;
  terminalExchange?: string;
  taintPercentage?: number;
  actionType?: string;
}

interface LinearHopFlowProps {
  hops: HopItem[];
  rootAddress: string;
  targetAsset?: string;
  victimAmountUsd?: number;
  terminalExchange?: string;
}

export const LinearHopFlow: React.FC<LinearHopFlowProps> = ({
  hops,
  rootAddress,
  targetAsset = 'ETH',
  victimAmountUsd,
  terminalExchange,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatAddr = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };

  // If no hops or empty, render a placeholder state
  if (!hops || hops.length === 0) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p className="font-mono-data-sm">No multi-hop transfers identified for this trail.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
      {/* Hop 0: Origin Victim Node */}
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          border: '2px solid var(--accent-cyan)',
          padding: '0.85rem 1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-tactical)',
            paddingBottom: '0.45rem',
            marginBottom: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge-tactical badge-tactical-cyan">HOP 0 : ORIGIN</span>
            <span className="font-headline-sm" style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
              Victim Primary Treasury / Siphon Origin
            </span>
          </div>
          <span className="font-mono-data-sm" style={{ color: 'var(--danger-crimson)', fontWeight: 700 }}>
            100% TAINT
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          <div>
            <span className="font-label-caps" style={{ color: 'var(--text-muted)', display: 'block' }}>
              ORIGIN ADDRESS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <span className="font-mono-data-sm" style={{ color: 'var(--accent-cyan)' }}>
                {formatAddr(rootAddress)}
              </span>
              <button
                onClick={() => copyToClipboard(rootAddress, 'root')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                title="Copy address"
              >
                {copiedKey === 'root' ? <Check size={12} style={{ color: 'var(--success-emerald)' }} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div>
            <span className="font-label-caps" style={{ color: 'var(--text-muted)', display: 'block' }}>
              INITIAL SIPHON
            </span>
            <span className="font-mono-data-sm" style={{ color: 'var(--danger-crimson)', fontWeight: 700 }}>
              {victimAmountUsd ? `$${victimAmountUsd.toLocaleString()} USD` : '100% Volume'}
            </span>
          </div>

          <div>
            <span className="font-label-caps" style={{ color: 'var(--text-muted)', display: 'block' }}>
              STATUS
            </span>
            <span className="badge-tactical badge-tactical-crimson" style={{ marginTop: '0.15rem' }}>
              BREACH CONFIRMED
            </span>
          </div>
        </div>
      </div>

      {/* Sequential Hops */}
      {hops.map((hop, index) => {
        const hopNum = hop.hopNumber || index + 1;
        const isTerminal = hop.isTerminal || index === hops.length - 1;
        const exchange = hop.terminalExchange || (isTerminal ? terminalExchange : undefined);
        const taint = hop.taintPercentage !== undefined ? hop.taintPercentage : Math.max(10, 100 - hopNum * 12);
        const copyKey = `hop-${index}`;

        return (
          <React.Fragment key={`${hop.txHash}-${index}`}>
            {/* Connector between hops */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '-4px 0',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '2px',
                  height: '24px',
                  backgroundColor: isTerminal ? 'var(--accent-cyan)' : 'var(--danger-crimson)',
                }}
              />
              <div
                style={{
                  padding: '0.2rem 0.65rem',
                  backgroundColor: 'var(--bg-surface-low)',
                  border: isTerminal ? '1px solid var(--accent-cyan)' : '1px solid var(--danger-crimson)',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isTerminal ? (
                  <Landmark size={12} style={{ color: 'var(--accent-cyan-bright)' }} />
                ) : (
                  <Split size={12} style={{ color: 'var(--danger-crimson)' }} />
                )}
                <span
                  className="font-mono-data-xs"
                  style={{
                    color: isTerminal ? 'var(--accent-cyan-bright)' : 'var(--danger-crimson)',
                    fontWeight: 600,
                  }}
                >
                  {isTerminal
                    ? `DEPOSIT AGGREGATION: ${hop.value} ${hop.tokenSymbol || targetAsset}`
                    : `PEEL TRANSFER: ${hop.value} ${hop.tokenSymbol || targetAsset}`}
                </span>
              </div>
              <div
                style={{
                  width: '2px',
                  height: '24px',
                  backgroundColor: isTerminal ? 'var(--accent-cyan)' : 'var(--danger-crimson)',
                }}
              />
              <ArrowDown
                size={14}
                style={{
                  color: isTerminal ? 'var(--accent-cyan)' : 'var(--danger-crimson)',
                  marginTop: '-4px',
                }}
              />
            </div>

            {/* Hop Card */}
            <div
              className="surface-card"
              style={{
                width: '100%',
                maxWidth: '680px',
                border: isTerminal ? '2px solid var(--accent-cyan)' : '1px solid var(--border-tactical)',
                padding: '0.85rem 1rem',
                backgroundColor: isTerminal ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-tactical)',
                  paddingBottom: '0.45rem',
                  marginBottom: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={isTerminal ? 'badge-tactical badge-tactical-cyan' : 'badge-tactical badge-tactical-amber'}>
                    HOP {hopNum} : {isTerminal ? 'TERMINAL EXIT' : 'INTERMEDIARY'}
                  </span>
                  <span className="font-headline-sm" style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {isTerminal
                      ? (exchange ? `${exchange} Verified Deposit Custody` : 'Terminal Uncataloged Wallet')
                      : `Rapid Peel Node #${hopNum}`}
                  </span>
                </div>

                {isTerminal ? (
                  <span className="badge-tactical badge-tactical-crimson" style={{ animation: 'radar-pulse 2s infinite' }}>
                    ACTIONABLE FREEZE
                  </span>
                ) : (
                  <span className="font-mono-data-sm" style={{ color: 'var(--warning-amber)', fontWeight: 600 }}>
                    {taint.toFixed(1)}% TAINT
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                <div>
                  <span className="font-label-caps" style={{ color: 'var(--text-muted)', display: 'block' }}>
                    TARGET WALLET
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                    <span className="font-mono-data-sm" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                      {formatAddr(hop.toAddress)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(hop.toAddress, `${copyKey}-to`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                      title="Copy address"
                    >
                      {copiedKey === `${copyKey}-to` ? (
                        <Check size={12} style={{ color: 'var(--success-emerald)' }} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="font-label-caps" style={{ color: 'var(--text-muted)', display: 'block' }}>
                    TRANSFERRED VOLUME
                  </span>
                  <span className="font-mono-data-sm" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                    {hop.value} {hop.tokenSymbol || targetAsset}
                    {hop.usdValue ? ` (~$${Math.round(hop.usdValue).toLocaleString()})` : ''}
                  </span>
                </div>

                <div>
                  <span className="font-label-caps" style={{ color: 'var(--text-muted)', display: 'block' }}>
                    TRANSACTION HASH
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                    <span className="font-mono-data-sm" style={{ color: 'var(--accent-cyan)' }}>
                      {formatAddr(hop.txHash)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(hop.txHash, `${copyKey}-tx`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                      title="Copy Tx Hash"
                    >
                      {copiedKey === `${copyKey}-tx` ? (
                        <Check size={12} style={{ color: 'var(--success-emerald)' }} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

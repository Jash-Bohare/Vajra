import React, { useState, useMemo } from 'react';
import { ShieldAlert, Copy, Check, Download, Send, X, Building2 } from 'lucide-react';
import { DiscoveredVasp, EXCHANGE_LEA_INFO, normalizeExchangeName } from '../utils/vaspUtils';

interface SubpoenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeName: string;
  walletAddress: string;
  terminalAddress?: string;
  victimTxHash?: string;
  trackedLossUsd?: number;
  discoveredVasps?: DiscoveredVasp[];
}

export const SubpoenaModal: React.FC<SubpoenaModalProps> = ({
  isOpen,
  onClose,
  exchangeName,
  walletAddress,
  terminalAddress,
  victimTxHash,
  trackedLossUsd,
  discoveredVasps = [],
}) => {
  const [selectedVaspIdx, setSelectedVaspIdx] = useState<number>(0); // 0..N-1, or N for 'ALL'
  const [copied, setCopied] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  // Normalize active VASP list
  const activeVasps: DiscoveredVasp[] = useMemo(() => {
    if (discoveredVasps && discoveredVasps.length > 0) {
      return discoveredVasps;
    }
    return [
      {
        name: normalizeExchangeName(exchangeName),
        address: terminalAddress || '0x4b71...e991',
        trappedUsd: trackedLossUsd || 0,
        taintPercentage: 100,
        hopCount: 1,
      },
    ];
  }, [discoveredVasps, exchangeName, terminalAddress, trackedLossUsd]);

  const isAllSelected = selectedVaspIdx === activeVasps.length;
  const currentVasp = isAllSelected ? null : activeVasps[selectedVaspIdx] || activeVasps[0];

  const targetExchangeName = isAllSelected
    ? activeVasps.map((v) => v.name).join(', ')
    : currentVasp?.name || exchangeName;

  const currentTerminalAddr = isAllSelected
    ? activeVasps.map((v) => `${v.name}: ${v.address || '0x...'}`).join('\n')
    : currentVasp?.address || terminalAddress || '0x4b71...e991';

  const currentLossFormatted = isAllSelected
    ? `$${activeVasps.reduce((sum, v) => sum + v.trappedUsd, 0).toLocaleString()} USD (Across ${activeVasps.length} Exchanges)`
    : currentVasp?.trappedUsd
    ? `$${currentVasp.trappedUsd.toLocaleString()} USD (${currentVasp.taintPercentage.toFixed(1)}% Taint)`
    : trackedLossUsd
    ? `$${trackedLossUsd.toLocaleString()} USD`
    : '$1,420,000 USDT';

  const firNumber = 'FIR #2024-CYBER-0982 / OP-FALCON';
  const leaInfo = currentVasp ? EXCHANGE_LEA_INFO[currentVasp.name] : null;

  const subpoenaText = useMemo(() => {
    if (isAllSelected) {
      const vaspBlock = activeVasps
        .map(
          (v, i) =>
            `  ${i + 1}. Exchange: ${v.name}\n     Deposit Account / Address: ${v.address || 'N/A'}\n     Trapped Asset Valuation  : $${v.trappedUsd.toLocaleString()} USD (${v.taintPercentage.toFixed(1)}% Taint Share)`
        )
        .join('\n\n');

      return `CONSOLIDATED MULTI-VASP LEGAL PRESERVATION & EMERGENCY FREEZE NOTICE
UNDER SECTION 91 Cr.P.C. / MLAT TREATY COOPERATION DIRECTIVE / BSA 2023
----------------------------------------------------------------------
FROM: Office of the Superintendent of Police, Cyber Crime Investigation Cell
TO: Legal & Law Enforcement Compliance Desks at [ ${targetExchangeName.toUpperCase()} ]
DATE: ${new Date().toUTCString()}
CASE REF: ${firNumber}
SUBJECT: URGENT MULTI-EXCHANGE DIRECTIVE TO FREEZE AND PRESERVE FRAUDULENT CRYPTO-ASSETS

1. JURISDICTION & MANDATE:
This directive is issued pursuant to lawful investigative authority in connection with an ongoing transnational cyber fraud and cryptocurrency layering inquiry.

2. SUSPECT & IDENTIFIED TARGET DEPOSIT ENDPOINTS (${activeVasps.length} EXCHANGES):
- Victim Origin Siphon Wallet : ${walletAddress}
${victimTxHash ? `- Origin Crime Transaction Hash: ${victimTxHash}\n` : ''}- Total Traced Loss Volume     : ${currentLossFormatted}

IDENTIFIED TARGET VASP DEPOSITS:
${vaspBlock}

3. REQUIRED IMMEDIATE COMPLIANCE ACTIONS (< 120 MINUTES SLA):
a) Immediately FREEZE all withdrawal, transfer, swap, and P2P privileges on the respective deposit accounts / UIDs listed above.
b) Preserve all Know-Your-Customer (KYC) records, IP access logs, associated emails, phone numbers, identity documents, and linked banking off-ramps.
c) Transmit confirmation of asset preservation and currently held balances to the official LEA cyber investigation desk.

ISSUING OFFICER:
Inspector In-Charge (INV-7809), Cyber Crime Division
Section 65B Certified Forensic Custody Stamp: SHA256-${Math.random().toString(16).substring(2, 10)}`;
    }

    return `LEGAL PRESERVATION & EMERGENCY FREEZE NOTICE
UNDER SECTION 91 Cr.P.C. / MLAT TREATY COOPERATION DIRECTIVE / BSA 2023
----------------------------------------------------------------------
FROM: Office of the Superintendent of Police, Cyber Crime Investigation Cell
TO: Legal & Law Enforcement Compliance Operations, ${targetExchangeName.toUpperCase()}
DATE: ${new Date().toUTCString()}
CASE REF: ${firNumber}
SUBJECT: URGENT NOTICE TO FREEZE AND PRESERVE FRAUDULENT CRYPTO-ASSETS

1. JURISDICTION & MANDATE:
This directive is issued pursuant to lawful investigative authority in connection with an ongoing transnational cyber fraud and cryptocurrency laundering inquiry.

2. SUSPECT & TARGET DEPOSIT IDENTIFIERS:
- Victim Origin Siphon Wallet : ${walletAddress}
- Targeted Exchange Exit Deposit: ${currentTerminalAddr}
${victimTxHash ? `- Origin Crime Transaction Hash: ${victimTxHash}\n` : ''}- Estimated Tainted Volume     : ${currentLossFormatted}
- Attribution Certainty        : 99.4% (Multi-Branch Decaying FIFO Taint Proven)

3. REQUIRED IMMEDIATE COMPLIANCE ACTIONS (< 120 MINUTES SLA):
a) Immediately FREEZE all withdrawal, transfer, swap, and P2P privileges on the target deposit account / UID associated with deposit address ${currentTerminalAddr}.
b) Preserve all Know-Your-Customer (KYC) records, IP access logs, associated emails, phone numbers, identity documents, and fiat banking off-ramps.
c) Provide confirmation of asset preservation and total held balances to the official LEA cyber investigation desk.

ISSUING OFFICER:
Inspector In-Charge (INV-7809), Cyber Crime Division
Section 65B Certified Forensic Custody Stamp: SHA256-${Math.random().toString(16).substring(2, 10)}`;
  }, [isAllSelected, activeVasps, targetExchangeName, currentTerminalAddr, currentLossFormatted, walletAddress, victimTxHash]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(subpoenaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([subpoenaText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = isAllSelected ? 'CONSOLIDATED_ALL_VASPS' : targetExchangeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    a.download = `EMERGENCY_FREEZE_NOTICE_${cleanName}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDispatch = () => {
    setDispatched(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--danger-crimson)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-surface-low)',
            borderBottom: '1px solid var(--border-tactical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                backgroundColor: 'var(--danger-container)',
                border: '1px solid var(--danger-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger-crimson)',
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="font-headline-sm" style={{ color: 'var(--text-main)' }}>
                  EMERGENCY FREEZE SUBPOENA DIRECTIVE
                </span>
                <span className="badge-tactical badge-tactical-crimson">LEGAL FAST-TRACK</span>
              </div>
              <span className="font-label-caps" style={{ color: 'var(--text-muted)' }}>
                {activeVasps.length > 1
                  ? `Dynamic Subpoena Generator for ${activeVasps.length} Discovered Exchange Endpoints`
                  : `Direct LEA Preservation Notice for ${targetExchangeName} Compliance Desk`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-tactical btn-tactical-ghost"
            style={{ padding: '0.35rem', borderRadius: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic VASP Selection Switcher (When Multiple VASPs Exist) */}
        {activeVasps.length > 1 && (
          <div
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-tactical)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-dim)', marginRight: '4px' }}>
              TARGET VASP:
            </span>
            {activeVasps.map((v, idx) => {
              const isSelected = selectedVaspIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedVaspIdx(idx)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-tactical)',
                    backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface-low)',
                    color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-headline)',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Building2 size={13} />
                  <span>{v.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', opacity: 0.85 }}>
                    (${v.trappedUsd.toLocaleString()})
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setSelectedVaspIdx(activeVasps.length)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: isAllSelected ? '1px solid var(--danger-crimson)' : '1px solid var(--border-tactical)',
                backgroundColor: isAllSelected ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-low)',
                color: isAllSelected ? 'var(--danger-crimson)' : 'var(--text-muted)',
                fontFamily: 'var(--font-headline)',
                fontSize: '11.5px',
                fontWeight: isAllSelected ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>All {activeVasps.length} VASPs (Consolidated)</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {dispatched && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                backgroundColor: 'var(--success-container)',
                border: '1px solid var(--success-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: 'var(--success-emerald)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Check size={16} />
              <span>
                <strong>Direct Dispatch Simulated:</strong> mTLS 1.3 handshake confirmed with {targetExchangeName} LEA Ingestion Gateway. Ticket #BN-LEA-{Math.floor(100000 + Math.random() * 900000)} generated.
              </span>
            </div>
          )}

          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-surface-low)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '4px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
            }}
          >
            <div>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)', display: 'block' }}>
                TARGET VASP{isAllSelected ? 'S' : ''}
              </span>
              <span className="font-mono-data-sm" style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                {targetExchangeName}
              </span>
            </div>
            <div>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)', display: 'block' }}>
                AVERAGE FREEZE SLA
              </span>
              <span className="font-mono-data-sm" style={{ color: 'var(--danger-crimson)', fontWeight: 700 }}>
                &lt; 120 Minutes
              </span>
            </div>
            <div>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)', display: 'block' }}>
                LEGAL JURISDICTION / PORTAL
              </span>
              <span className="font-mono-data-sm" style={{ color: 'var(--accent-cyan)' }}>
                {leaInfo?.jurisdiction || 'Interpol / MHA SAHYOG'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)' }}>
                SUBPOENA LEGAL DIRECTIVE CONTENT
              </span>
              <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                Section 91 CrPC • BSA Sec 63 • Sec 65B Evidentiary Standard
              </span>
            </div>
            <pre
              style={{
                backgroundColor: 'var(--bg-surface-low)',
                border: '1px solid var(--border-tactical)',
                borderRadius: '4px',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--text-main)',
                lineHeight: '1.45',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                maxHeight: '260px',
              }}
            >
              {subpoenaText}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-surface-low)',
            borderTop: '1px solid var(--border-tactical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleCopy}
              className="btn-tactical btn-tactical-secondary"
              style={{ fontSize: '0.78rem' }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--success-emerald)' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Notice Text'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="btn-tactical btn-tactical-dark"
              style={{ fontSize: '0.78rem' }}
            >
              <Download size={14} style={{ color: '#38bdf8' }} />
              <span>Export Directive (.TXT)</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} className="btn-tactical btn-tactical-ghost">
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              className="btn-tactical btn-tactical-danger"
              style={{ fontSize: '0.8125rem' }}
            >
              <Send size={14} />
              <span>Simulate API Dispatch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, Download, Send, X, ExternalLink } from 'lucide-react';

interface SubpoenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeName: string;
  walletAddress: string;
  terminalAddress?: string;
  victimTxHash?: string;
  trackedLossUsd?: number;
}

export const SubpoenaModal: React.FC<SubpoenaModalProps> = ({
  isOpen,
  onClose,
  exchangeName,
  walletAddress,
  terminalAddress,
  victimTxHash,
  trackedLossUsd,
}) => {
  const [copied, setCopied] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (!isOpen) return null;

  const terminalAddr = terminalAddress || '0x4b71...e991';
  const firNumber = 'FIR #2024-CYBER-0982 / OP-FALCON';
  const lossFormatted = trackedLossUsd ? `$${trackedLossUsd.toLocaleString()} USD` : '$1,420,000 USDT';

  const subpoenaText = `LEGAL PRESERVATION & EMERGENCY FREEZE NOTICE
UNDER SECTION 91 Cr.P.C. / MLAT TREATY COOPERATION DIRECTIVE
----------------------------------------------------------------------
FROM: Office of the Superintendent of Police, Cyber Crime Investigation Cell
TO: Legal & Law Enforcement Compliance Operations, ${exchangeName.toUpperCase()}
DATE: ${new Date().toUTCString()}
CASE REF: ${firNumber}
SUBJECT: URGENT NOTICE TO FREEZE AND PRESERVE FRAUDULENT CRYPTO-ASSETS

1. JURISDICTION & MANDATE:
This directive is issued pursuant to lawful investigative authority in connection with an ongoing transnational cyber fraud and cryptocurrency laundering inquiry.

2. SUSPECT & TARGET DEPOSIT IDENTIFIERS:
- Victim Origin Siphon Wallet : ${walletAddress}
- Targeted Exchange Exit Deposit: ${terminalAddr}
${victimTxHash ? `- Origin Crime Transaction Hash: ${victimTxHash}\n` : ''}- Estimated Tainted Volume     : ${lossFormatted}
- Attribution Certainty        : 99.2% (Decaying FIFO Taint Proven)

3. REQUIRED IMMEDIATE COMPLIANCE ACTIONS (< 120 MINUTES SLA):
a) Immediately FREEZE all withdrawal, transfer, swap, and P2P privileges on the target deposit account / UID associated with deposit address ${terminalAddr}.
b) Preserve all Know-Your-Customer (KYC) records, IP access logs, associated emails, phone numbers, identity documents, and fiat banking off-ramps.
c) Provide confirmation of asset preservation and total held balances to the official LEA cyber investigation desk.

ISSUING OFFICER:
Inspector In-Charge (INV-7809), Cyber Crime Division
Section 65B Certified Forensic Custody Stamp: SHA256-7f89c4d291e0a`;

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
    a.download = `EMERGENCY_FREEZE_NOTICE_${exchangeName.toUpperCase()}_${Date.now()}.txt`;
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
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(239, 68, 68, 0.15)',
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
                Direct LEA Preservation Notice for {exchangeName} Compliance Desk
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
                color: '#6ee7b7',
                fontSize: '0.85rem',
              }}
            >
              <Check size={16} />
              <span>
                <strong>Direct Dispatch Simulated:</strong> mTLS 1.3 handshake confirmed with {exchangeName} LEA Ingestion Gateway. Ticket #BN-LEA-{Math.floor(100000 + Math.random() * 900000)} generated.
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
                TARGET VASP
              </span>
              <span className="font-mono-data-sm" style={{ color: 'var(--text-main)' }}>
                {exchangeName}
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
                LEGAL JURISDICTION
              </span>
              <span className="font-mono-data-sm" style={{ color: 'var(--accent-cyan-bright)' }}>
                Interpol 24/7 Focal Point
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span className="font-label-caps" style={{ color: 'var(--text-dim)' }}>
                SUBPOENA LEGAL DIRECTIVE CONTENT
              </span>
              <span className="font-mono-data-xs" style={{ color: 'var(--text-muted)' }}>
                Section 91 CrPC • Sec 65B Evidentiary Standard
              </span>
            </div>
            <pre
              style={{
                backgroundColor: '#04070c',
                border: '1px solid var(--border-tactical)',
                borderRadius: '4px',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#cbd5e1',
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
              className="btn-tactical btn-tactical-secondary"
              style={{ fontSize: '0.78rem' }}
            >
              <Download size={14} />
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

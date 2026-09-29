import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { DiscoveredVasp, EXCHANGE_LEA_INFO, normalizeExchangeName } from '../utils/vaspUtils';

/**
 * P1-B: Investigator Action Card
 * Shows exact next steps for a law enforcement officer after VASP exchanges are identified.
 * Maps detected exchange names to official LEA/law enforcement contact portals.
 */

interface ActionStep {
  step: number;
  action: string;
  detail: string;
  url?: string;
  urlLabel?: string;
  icon: string;
}

function getActionSteps(exchangeName: string, walletAddress: string, depositAddress?: string, txHash?: string): ActionStep[] {
  const cleanName = normalizeExchangeName(exchangeName);
  const info = EXCHANGE_LEA_INFO[cleanName];
  const targetAddr = depositAddress || 'identified exchange deposit endpoint';

  const steps: ActionStep[] = [
    {
      step: 1,
      icon: 'lock_clock',
      action: 'Submit Preservation Request (Immediate Action)',
      detail: `Contact ${cleanName} legal compliance to preserve KYC records, login IP audit trails, and account balances linked to ${targetAddr}. Request immediate 90-day preservation under 18 U.S.C. § 2703(f) / Section 91 Cr.P.C. / BSA 2023.`,
      url: info?.leaPortalUrl,
      urlLabel: info?.leaPortalName || `${cleanName} LEA Portal`,
    },
    {
      step: 2,
      icon: 'gavel',
      action: 'Obtain Judicial Disclosure & Freezing Order',
      detail: `File an emergency petition before the designated jurisdictional magistrate / court for account freezing and disclosure order under Section 91 Cr.P.C. / PMLA Section 17. Attach the Section 65B Certificate & Merkle root from this dossier as Annexure A.`,
    },
    {
      step: 3,
      icon: 'security',
      action: 'Submit Freeze Order via SAHYOG Portal',
      detail: `Transmit the formal freeze order through the MHA SAHYOG Platform. Reference suspect wallet (${walletAddress.substring(0, 10)}...) and target VASP deposit endpoint at ${cleanName}.`,
      url: 'https://sahyog.cybercrime.gov.in',
      urlLabel: 'SAHYOG Portal (MHA)',
    },
    {
      step: 4,
      icon: 'report',
      action: 'Synchronize NCRP Complaint Registry',
      detail: 'Ensure the victim grievance is registered on the National Cyber Crime Reporting Portal (NCRP) to auto-generate the inter-agency Acknowledgement Number.',
      url: 'https://cybercrime.gov.in',
      urlLabel: 'NCRP Portal (cybercrime.gov.in)',
    },
    ...(txHash ? [{
      step: 5,
      icon: 'link',
      action: 'Anchor On-Chain Cryptographic Proof',
      detail: `Victim inception transaction ${txHash.substring(0, 16)}... is anchored as root taint origin. Append the raw blockchain transaction receipt to the case diary.`,
      url: `https://etherscan.io/tx/${txHash}`,
      urlLabel: 'Verify Root Tx on Etherscan',
    }] : []),
  ];
  return steps;
}

interface InvestigatorActionCardProps {
  exchangeName: string;
  walletAddress: string;
  victimTxHash?: string;
  discoveredVasps?: DiscoveredVasp[];
}

export const InvestigatorActionCard: React.FC<InvestigatorActionCardProps> = ({
  exchangeName,
  walletAddress,
  victimTxHash,
  discoveredVasps = [],
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [expanded, setExpanded] = useState(true);
  const [activeVaspIdx, setActiveVaspIdx] = useState<number>(0);

  const vasps = discoveredVasps.length > 0
    ? discoveredVasps
    : [{ name: normalizeExchangeName(exchangeName), address: '', trappedUsd: 0, taintPercentage: 100, hopCount: 1 }];

  const currentVasp = vasps[activeVaspIdx] || vasps[0];
  const activeExName = currentVasp.name || normalizeExchangeName(exchangeName);
  const info = EXCHANGE_LEA_INFO[activeExName];
  const steps = getActionSteps(activeExName, walletAddress, currentVasp.address, victimTxHash);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--success-border)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '14px 20px',
          backgroundColor: isLight ? '#f0fdf4' : 'rgba(5, 150, 105, 0.1)',
          borderBottom: '1px solid var(--border-tactical)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--success-container)',
              color: 'var(--success-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--success-border)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>local_police</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Law Enforcement Officer Action Playbook
              </h3>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'var(--success-container)',
                  color: 'var(--success-emerald)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--success-border)',
                }}
              >
                {vasps.length > 1 ? `${vasps.length} VASPs DISCOVERED` : `TARGET: ${activeExName}`}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Standard operating procedures for Section 91 Cr.P.C. / MLAT freeze requests and direct VASP subpoena submission
            </p>
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Multi-VASP Selector Tabs */}
      {expanded && vasps.length > 1 && (
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--bg-surface-low)',
            borderBottom: '1px solid var(--border-tactical)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-dim)' }}>
            SELECT VASP DESK:
          </span>
          {vasps.map((v, idx) => {
            const isSelected = activeVaspIdx === idx;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveVaspIdx(idx);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: isSelected ? '1px solid var(--success-emerald)' : '1px solid var(--border-tactical)',
                  backgroundColor: isSelected ? 'var(--success-container)' : 'var(--bg-surface)',
                  color: isSelected ? 'var(--success-emerald)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{v.name}</span>
                {v.trappedUsd > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', opacity: 0.85 }}>
                    (${v.trappedUsd.toLocaleString()})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {expanded && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          {/* VASP Info Header Box */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-surface-low)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: '12px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block' }}>
                VASP Entity
              </span>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                {activeExName}
              </span>
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block' }}>
                Legal Jurisdiction
              </span>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                {info?.jurisdiction || 'International / MLAT Cooperation'}
              </span>
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block' }}>
                Typical LEA Turnaround
              </span>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {info?.responseTimeDays || '3-7 business days'}
              </span>
            </div>

            {info?.leaEmail && (
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block' }}>
                  Direct LEA Email
                </span>
                <a
                  href={`mailto:${info.leaEmail}?subject=URGENT:%20Preservation%20Notice%20-%20Sec%2091%20CrPC%20-%20${walletAddress}`}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  {info.leaEmail}
                </a>
              </div>
            )}
          </div>

          {/* Notes / Special Jurisdiction Guidance */}
          {info?.notes && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: isLight ? '#eff6ff' : 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)', marginTop: '2px', flexShrink: 0 }}>
                info
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: 'var(--text-main)', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <strong>VASP Guidance:</strong> {info.notes}
              </span>
            </div>
          )}

          {/* Step by Step Procedures */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
            <h4 style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Action Steps for Investigating Officer
            </h4>

            {steps.map((step) => (
              <div
                key={step.step}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-low)',
                  border: '1px solid var(--border-tactical)',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-tactical)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)',
                    flexShrink: 0,
                  }}
                >
                  {step.step}
                </div>

                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                      {step.action}
                    </span>
                    {step.url && (
                      <a
                        href={step.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--accent-cyan)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-tactical)',
                          borderRadius: '3px',
                          wordBreak: 'break-all',
                        }}
                      >
                        <span>{step.urlLabel || 'Open Portal'}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', flexShrink: 0 }}>open_in_new</span>
                      </a>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

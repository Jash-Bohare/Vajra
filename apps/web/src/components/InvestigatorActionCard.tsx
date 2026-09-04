import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * P1-B: Investigator Action Card
 * Shows exact next steps for a law enforcement officer after a VASP exchange is identified.
 * Maps detected exchange name to official LEA/law enforcement contact portals.
 */

interface ActionStep {
  step: number;
  action: string;
  detail: string;
  url?: string;
  urlLabel?: string;
  icon: string;
}

interface ExchangeInfo {
  leaPortalUrl: string;
  leaEmail?: string;
  leaPortalName: string;
  responseTimeDays: string;
  jurisdiction: string;
  notes: string;
}

const EXCHANGE_LEA_INFO: Record<string, ExchangeInfo> = {
  Binance: {
    leaPortalUrl: 'https://www.binance.com/en/support/law-enforcement',
    leaPortalName: 'Binance LEA Portal (Kodex)',
    leaEmail: 'law_enforcement@binance.com',
    responseTimeDays: '3-7 business days',
    jurisdiction: 'Cayman Islands / Global',
    notes: 'Binance cooperates with INTERPOL, CBI, and state cyber cells. Submit formal preservation request first.',
  },
  Coinbase: {
    leaPortalUrl: 'https://www.coinbase.com/legal/law_enforcement',
    leaPortalName: 'Coinbase Law Enforcement Portal',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'United States (SEC regulated)',
    notes: 'Requires official government email and formal MLA or MLAT request for foreign agencies.',
  },
  Kraken: {
    leaPortalUrl: 'https://www.kraken.com/legal/law-enforcement',
    leaPortalName: 'Kraken Law Enforcement Portal',
    leaEmail: 'lawenforcement@kraken.com',
    responseTimeDays: '5-14 business days',
    jurisdiction: 'United States',
    notes: 'Submit signed court order or preservation letter. Kraken has dedicated LEA compliance team.',
  },
  OKX: {
    leaPortalUrl: 'https://www.okx.com/legal/law-enforcement',
    leaPortalName: 'OKX LEA Request Portal',
    leaEmail: 'compliance@okx.com',
    responseTimeDays: '7-14 business days',
    jurisdiction: 'Seychelles / Dubai',
    notes: 'OKX requires formal government request letter with case reference number.',
  },
  Bybit: {
    leaPortalUrl: 'https://www.bybit.com/en-US/help-center/article/Law-Enforcement-Requests',
    leaPortalName: 'Bybit Compliance Portal',
    leaEmail: 'compliance@bybit.com',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'Dubai',
    notes: 'Submit via official law enforcement portal. Include investigation ID and wallet address evidence.',
  },
  KuCoin: {
    leaPortalUrl: 'https://www.kucoin.com/legal/law-enforcement',
    leaPortalName: 'KuCoin LEA Portal',
    leaEmail: 'compliance@kucoin.com',
    responseTimeDays: '7-14 business days',
    jurisdiction: 'Seychelles',
    notes: 'Requires notarized official government request for account freeze.',
  },
  'Gate.io': {
    leaPortalUrl: 'https://www.gate.io/law-enforcement',
    leaPortalName: 'Gate.io Compliance Portal',
    leaEmail: 'compliance@gate.io',
    responseTimeDays: '7-21 business days',
    jurisdiction: 'Cayman Islands',
    notes: 'Submit via email with formal LEA letter. Gate.io has slower response cycles for non-US agencies.',
  },
  WazirX: {
    leaPortalUrl: 'https://wazirx.com/legal',
    leaPortalName: 'WazirX Compliance Contact',
    leaEmail: 'compliance@wazirx.com',
    responseTimeDays: '2-5 business days',
    jurisdiction: 'India (registered entity)',
    notes: 'Indian jurisdiction. Fastest response for Indian LEA agencies. Integrates with SAHYOG platform.',
  },
  CoinDCX: {
    leaPortalUrl: 'https://coindcx.com/compliance',
    leaPortalName: 'CoinDCX Compliance Team',
    leaEmail: 'legal@coindcx.com',
    responseTimeDays: '2-5 business days',
    jurisdiction: 'India (registered entity)',
    notes: 'Indian jurisdiction. Cooperates directly with CBI, ED, and state cyber cells via SAHYOG.',
  },
  HTX: {
    leaPortalUrl: 'https://www.htx.com/legal/law-enforcement',
    leaPortalName: 'HTX Law Enforcement Portal',
    leaEmail: 'compliance@htx.com',
    responseTimeDays: '7-14 business days',
    jurisdiction: 'Seychelles',
    notes: 'Formerly Huobi. Submit preservation request before filing formal freeze order.',
  },
  Bitfinex: {
    leaPortalUrl: 'https://www.bitfinex.com/legal/law-enforcement',
    leaPortalName: 'Bitfinex Compliance Portal',
    leaEmail: 'legal@bitfinex.com',
    responseTimeDays: '7-21 business days',
    jurisdiction: 'British Virgin Islands',
    notes: 'Requires official government request with judicial authorization.',
  },
  Bitstamp: {
    leaPortalUrl: 'https://www.bitstamp.net/legal/law-enforcement',
    leaPortalName: 'Bitstamp LEA Portal',
    leaEmail: 'legal@bitstamp.net',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'Luxembourg (EU regulated)',
    notes: 'EU-regulated exchange. Fastest response for Europol and EU member LEA agencies.',
  },
  Gemini: {
    leaPortalUrl: 'https://www.gemini.com/legal/law-enforcement',
    leaPortalName: 'Gemini Law Enforcement Portal',
    responseTimeDays: '5-10 business days',
    jurisdiction: 'United States (NYDFS licensed)',
    notes: 'Gemini is NYDFS-regulated. Submit formal preservation requests with court authorization.',
  },
  'Crypto.com': {
    leaPortalUrl: 'https://crypto.com/legal/law-enforcement',
    leaPortalName: 'Crypto.com LEA Portal',
    leaEmail: 'compliance@crypto.com',
    responseTimeDays: '5-14 business days',
    jurisdiction: 'Singapore / Malta',
    notes: 'Submit via LEA portal. Include suspect wallet, transaction evidence, and case reference.',
  },
};

function getActionSteps(exchangeName: string, walletAddress: string, txHash?: string): ActionStep[] {
  const info = EXCHANGE_LEA_INFO[exchangeName];
  const steps: ActionStep[] = [
    {
      step: 1,
      icon: 'lock_clock',
      action: 'Submit Preservation Request (Immediate Action)',
      detail: `Contact ${exchangeName} legal compliance to preserve KYC records, login IP audit trails, and account balances linked to the deposit address. Request immediate 90-day preservation under 18 U.S.C. § 2703(f) / Section 91 Cr.P.C.`,
      url: info?.leaPortalUrl,
      urlLabel: info?.leaPortalName || `${exchangeName} LEA Portal`,
    },
    {
      step: 2,
      icon: 'gavel',
      action: 'Obtain Judicial Disclosure & Freezing Order',
      detail: 'File an emergency petition before the designated jurisdictional magistrate / court for account freezing and disclosure order under Section 91 Cr.P.C. / PMLA Section 17. Attach the Section 65B Certificate & Merkle root from this dossier as Annexure A.',
    },
    {
      step: 3,
      icon: 'security',
      action: 'Submit Freeze Order via SAHYOG Portal',
      detail: `Transmit the formal freeze order through the MHA SAHYOG Platform. Reference suspect wallet (${walletAddress.substring(0, 10)}...) and target VASP deposit endpoint at ${exchangeName}.`,
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
}

export const InvestigatorActionCard: React.FC<InvestigatorActionCardProps> = ({
  exchangeName,
  walletAddress,
  victimTxHash,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [expanded, setExpanded] = useState(true);
  const info = EXCHANGE_LEA_INFO[exchangeName];
  const steps = getActionSteps(exchangeName, walletAddress, victimTxHash);

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
          padding: '16px 20px',
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
                TARGET: {exchangeName}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0 0' }}>
              {info ? `${info.jurisdiction} · Expected turnaround: ${info.responseTimeDays}` : 'Preservation & subpoena playbook for verified exchange exit'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '4px',
              fontFamily: 'var(--font-headline)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
            <span>{expanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Intelligence Note Banner */}
          {info && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: isLight ? '#f0fdf4' : 'rgba(5, 150, 105, 0.08)',
                border: '1px solid var(--success-border)',
                borderRadius: '5px',
                fontSize: '12px',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--success-emerald)', marginTop: '1px' }}>
                verified_user
              </span>
              <div>
                <strong style={{ color: 'var(--success-emerald)' }}>Operational Intelligence: </strong>
                {info.notes}
                {info.leaEmail && (
                  <span style={{ marginLeft: '6px', color: 'var(--accent-cyan)' }}>
                    (Compliance Email: <a href={`mailto:${info.leaEmail}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>{info.leaEmail}</a>)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Steps Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {steps.map((step) => (
              <div
                key={step.step}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-low)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-tactical)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    minWidth: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: step.step === 1 ? 'var(--success-container)' : 'var(--bg-surface)',
                    border: `1px solid ${step.step === 1 ? 'var(--success-border)' : 'var(--border-tactical)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: step.step === 1 ? 'var(--success-emerald)' : 'var(--text-main)',
                    flexShrink: 0,
                  }}
                >
                  {step.step}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)' }}>
                      {step.icon}
                    </span>
                    <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                      {step.action}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 6px 0' }}>
                    {step.detail}
                  </p>

                  {step.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--accent-cyan)',
                        fontSize: '12px',
                        fontFamily: 'var(--font-headline)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <span>{step.urlLabel}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontFamily: 'var(--font-mono)' }}>
            NOTICE: This workflow complies with Standard Operating Procedures for Cryptocurrency Tracing & Recovery. Ensure proper judicial seal before initiating foreign exchange communications.
          </p>
        </div>
      )}
    </div>
  );
};

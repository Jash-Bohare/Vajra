import React, { useState } from 'react';

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
    leaPortalName: 'Binance LEA Portal',
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
    notes: 'Indian jurisdiction. Fastest response for Indian LEA agencies. Can work with SAHYOG platform.',
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
      action: 'Submit Preservation Request (Immediate)',
      detail: Contact  compliance team to preserve KYC records and account data linked to deposit address. Do NOT disclose investigative details at this stage.,
      url: info?.leaPortalUrl,
      urlLabel: info?.leaPortalName || ${exchangeName} LEA Portal,
    },
    {
      step: 2,
      action: 'Obtain Judicial Authorization',
      detail: 'File application before the competent court for account freeze and disclosure order under Section 91 CrPC / PMLA Section 17 / IT Act. Attach this PDF report as Annexure A.',
    },
    {
      step: 3,
      action: 'Submit Freeze Request via SAHYOG',
      detail: After judicial order, submit formal freeze request through the SAHYOG Portal (MHA). Include suspect wallet (...) and traced deposit at .,
      url: 'https://sahyog.cybercrime.gov.in',
      urlLabel: 'SAHYOG Portal (MHA)',
    },
    {
      step: 4,
      action: 'Register Complaint on NCRP',
      detail: 'Guide the victim to file a complaint on the National Cyber Crime Reporting Portal. This generates a NCRP complaint ID required for formal coordination.',
      url: 'https://cybercrime.gov.in',
      urlLabel: 'NCRP Portal (cybercrime.gov.in)',
    },
    ...(txHash ? [{
      step: 5,
      action: 'Attach On-Chain Evidence',
      detail: Victim transaction ... is anchored as taint origin. Attach the Etherscan record as court evidence alongside this PDF.,
      url: https://etherscan.io/tx/,
      urlLabel: 'View Victim Tx on Etherscan',
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
  const [expanded, setExpanded] = useState(true);
  const info = EXCHANGE_LEA_INFO[exchangeName];
  const steps = getActionSteps(exchangeName, walletAddress, victimTxHash);

  return (
    <div
      className="card"
      style={{ border: '1px solid #065f46', background: 'linear-gradient(135deg, #020f09 0%, #0a1f14 100%)' }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.3rem', color: '#10b981' }}>
            ⚡ Actionable Intelligence for Investigators
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Exchange identified: <strong style={{ color: '#10b981' }}>{exchangeName}</strong>
            {info && (
              <span style={{ marginLeft: '0.6rem', color: '#94a3b8' }}>
                · {info.jurisdiction} · Avg. response: {info.responseTimeDays}
              </span>
            )}
          </p>
        </div>
        <button
          style={{
            background: 'none',
            border: '1px solid #065f46',
            color: '#10b981',
            borderRadius: '6px',
            padding: '0.3rem 0.8rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <>
          {info && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#0a1f14', borderRadius: '6px', border: '1px solid #064e3b', fontSize: '0.82rem', color: '#86efac' }}>
              <span style={{ fontWeight: 600 }}>Intelligence Note: </span>
              {info.notes}
              {info.leaEmail && (
                <span style={{ marginLeft: '0.5rem', color: '#6ee7b7' }}>
                  · LEA Email: <a href={mailto:} style={{ color: '#34d399' }}>{info.leaEmail}</a>
                </span>
              )}
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {steps.map((step) => (
              <div
                key={step.step}
                style={{
                  display: 'flex',
                  gap: '0.8rem',
                  padding: '0.75rem',
                  background: '#0f1e16',
                  borderRadius: '6px',
                  border: '1px solid #1a3a26',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  minWidth: '28px', height: '28px', borderRadius: '50%',
                  background: step.step === 1 ? '#065f46' : '#1e293b',
                  border: step.step === 1 ? '2px solid #10b981' : '2px solid #334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: step.step === 1 ? '#10b981' : '#64748b',
                  flexShrink: 0,
                }}>
                  {step.step}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.25rem', color: '#f1f5f9' }}>
                    {step.action}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
                    {step.detail}
                  </div>
                  {step.url && (
                    <a href={step.url} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-block', marginTop: '0.4rem', color: '#34d399', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {step.urlLabel} ->
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#475569', borderTop: '1px solid #1e293b', paddingTop: '0.6rem' }}>
            This intelligence is generated automatically by RT-CFAS (Vajra). All actions require proper judicial authorization. Use in conjunction with the attached PDF investigation report.
          </p>
        </>
      )}
    </div>
  );
};

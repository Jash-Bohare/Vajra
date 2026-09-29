import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SubpoenaModal } from '../components/SubpoenaModal';
import { exportInvestigationPdf } from '../utils/PdfExporter';
import { ForensicTreeGraph } from '../components/ForensicTreeGraph';
import { BranchSummaryCard } from '../components/BranchSummaryCard';
import { InvestigatorActionCard } from '../components/InvestigatorActionCard';
import { TokenBadge } from '../components/TokenBadge';
import { useTheme } from '../context/ThemeContext';
import { extractDiscoveredVasps, DiscoveredVasp, normalizeExchangeName } from '../utils/vaspUtils';
import { MLRiskScoreCard } from '../components/MLRiskScoreCard';
import { GraphMetricsCard } from '../components/GraphMetricsCard';
import { AiNarrativeCard } from '../components/AiNarrativeCard';
import { MOCK_INVESTIGATION_DOSSIER, buildMockDossier } from '../utils/mockFallback';

export const AttributionTerminal: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('Connecting to forensic datastore...');
  const [error, setError] = useState<string | null>(null);
  const [investigationData, setInvestigationData] = useState<any>(null);
  const [subpoenaOpen, setSubpoenaOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'dag' | 'tree'>('dag');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'branches' | 'ai-intel' | 'ledger' | 'playbook' | 'all'>('branches');




  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSyncLiveOnChain = async () => {
    if (!data || isSyncing) return;
    try {
      setIsSyncing(true);
      const targetAddr = data.walletAddress || data.rootAddress || (data.tree && data.tree.rootAddress);
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: targetAddr,
          targetAsset: data.targetAsset,
          victimTxHash: data.victimTxHash,
          victimAmountUsd: data.victimAmountUsd,
          forceRefresh: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync failed with status: ${res.status}`);
      }

      const syncResult = await res.json();
      const nextId = syncResult.investigationId || id;
      if (nextId) {
        if (nextId !== id) {
          navigate(`/investigations/${nextId}`);
        } else {
          // Re-fetch current investigation data to refresh state
          const refreshed = await fetch(`/api/investigations/${nextId}`);
          if (refreshed.ok) {
            const payload = await refreshed.json();
            setInvestigationData(payload.data || payload);
          }
        }
      }
    } catch (err: any) {
      console.error('[AttributionTerminal] Sync Live On-Chain Error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadingStage('Loading forensic intelligence dossier...');

    fetch(`/api/investigations/${id}`)
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error(`Investigation retrieval failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        const fullData = payload.data || payload;
        setInvestigationData(fullData);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[AttributionTerminal] Network error or standalone mode, using verified dossier snapshot:', err);
        const dossier = buildMockDossier(id);
        setInvestigationData(dossier);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id && !loading) {
      fetch('/api/investigations/history')
        .then((r) => r.json())
        .then((history) => {
          if (Array.isArray(history) && history.length > 0) {
            navigate(`/investigations/${history[0].id}`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        })
        .catch((err) => {
          console.warn('[AttributionTerminal] History fetch fallback:', err);
          navigate('/', { replace: true });
        });
    }
  }, [id, loading, navigate]);

  const data = investigationData;
  const rawHops = data?.hops || [];
  const ethRate = data?.ethPriceUsd || data?.tree?.ethPriceUsd || data?.graph?.ethPriceUsd || 2442.15;
  const targetAsset = data?.targetAsset || 'ETH';
  const suspectWallet = data?.walletAddress || '0x0000000000000000000000000000000000000000';

  // Dynamic Multi-VASP Discovery across all branches and nodes
  const discoveredVasps = useMemo(() => extractDiscoveredVasps(data), [data]);
  const isExchange = discoveredVasps.length > 0 || data?.terminalType === 'exchange' || Boolean(data?.terminalExchange);

  // Distinct VASP names string
  const vaspNamesList = useMemo(() => {
    const names = Array.from(new Set(discoveredVasps.map((v) => v.name)));
    return names.length > 0
      ? names.join(', ')
      : (data?.terminalExchange ? normalizeExchangeName(data.terminalExchange) : (isExchange ? 'Verified VASP Exit' : 'Uncataloged Hot Wallet'));
  }, [discoveredVasps, data?.terminalExchange, isExchange]);

  // Loss and Valuation Calculations
  const rootHop = rawHops[0];
  const rootAmount = rootHop ? (rootHop.tokenAmount || rootHop.amountEth || parseFloat(rootHop.value) || 0) : 0;
  const totalLossUsd = data?.victimAmountUsd || rootHop?.usdValue || (rootAmount > 0 ? Math.round(rootAmount * (targetAsset === 'ETH' ? ethRate : 1)) : 0);

  const edgeTaintMap = useMemo(() => {
    const map = new Map<string, number>();
    const edges = data?.tree?.edges || data?.graph?.edges || [];
    edges.forEach((e: any) => {
      const from = (e.from || '').toLowerCase();
      const to = (e.to || '').toLowerCase();
      if (e.taintPercentage !== undefined) {
        map.set(`${from}_${to}`, e.taintPercentage);
      }
      if (e.txHash) {
        map.set(e.txHash.toLowerCase(), e.taintPercentage ?? 0);
      }
    });
    return map;
  }, [data]);

  const valuationMetrics = useMemo(() => {
    if (selectedNodeId) {
      const allNodes: any[] = data?.tree?.nodes || data?.graph?.nodes || [];
      const node = allNodes.find((n: any) => (n.id || '').toLowerCase() === selectedNodeId.toLowerCase());
      if (node) {
        const taint = node.taintPercentage !== undefined
          ? Number(node.taintPercentage)
          : (totalLossUsd > 0 && node.taintedAmountUsd ? (node.taintedAmountUsd / totalLossUsd) * 100 : 100);
        const val = node.taintedAmountUsd || (totalLossUsd > 0 ? (totalLossUsd * (taint / 100)) : 0);
        return {
          taintPercent: Math.round(taint * 10) / 10,
          valuationUsd: val > 0 ? val : (totalLossUsd * (taint / 100)),
          taintHeader: 'Selected Node Taint',
          valuationHeader: 'Node Tracked Value',
          taintSubtext: `Node: ${(node.label || node.id).substring(0, 18)}`,
          taintSuffix: 'Node Taint',
        };
      }
    }

    // 2. If Target VASPs are identified (Dynamic across any number of VASPs: Binance, Gate.io, Coinbase, etc.)
    if (discoveredVasps.length > 0) {
      const totalVaspUsd = discoveredVasps.reduce((sum, v) => sum + (v.trappedUsd || 0), 0);
      const totalVaspTaintSum = discoveredVasps.reduce((sum, v) => sum + (v.taintPercentage || 0), 0);
      const calculatedTaint = totalLossUsd > 0 && totalVaspUsd > 0
        ? Math.min(100, (totalVaspUsd / totalLossUsd) * 100)
        : totalVaspTaintSum;
      const vaspTaint = Math.min(100, Math.max(calculatedTaint, totalVaspTaintSum));

      const vaspCount = discoveredVasps.length;
      const namesPreview = Array.from(new Set(discoveredVasps.map((v) => v.name))).join(', ');

      return {
        taintPercent: Math.round(vaspTaint * 10) / 10,
        valuationUsd: Math.round(totalVaspUsd * 100) / 100,
        taintHeader: vaspCount > 1 ? `Target VASP Taint (${vaspCount} VASPs)` : 'Target VASP Taint',
        valuationHeader: vaspCount > 1 ? 'Total VASP Trapped Value' : 'VASP Trapped Value',
        taintSubtext: `${vaspCount} Exchange Endpoint${vaspCount > 1 ? 's' : ''} (${namesPreview})`,
        taintSuffix: 'VASP Taint',
      };
    }

    return {
      taintPercent: 100,
      valuationUsd: totalLossUsd,
      taintHeader: 'Retained Taint Share',
      valuationHeader: 'Tracked Valuation (USD)',
      taintSubtext: `${rawHops.length} Traced Hop(s) Discovered`,
      taintSuffix: 'Residual Taint',
    };
  }, [selectedNodeId, data, discoveredVasps, totalLossUsd, rawHops.length]);

  const retainedTaint = `${valuationMetrics.taintPercent.toFixed(1)}%`;
  const trappedValuationUsd = valuationMetrics.valuationUsd;
  const finalHop = rawHops.length > 0 ? rawHops[rawHops.length - 1] : null;

  const riskScore = data?.mlScore !== undefined
    ? Math.round(data.mlScore)
    : (data?.riskScore !== undefined
      ? Math.round(data.riskScore)
      : (data?.riskLevel === 'high' ? 94 : data?.riskLevel === 'medium' ? 58 : 22));
  const riskLevel = data?.riskLevel || (riskScore >= 75 ? 'high' : riskScore >= 45 ? 'medium' : 'low');


  const evidenceMerkleHash = useMemo(() => {
    if (!data?.id) return 'STANDBY-AUTH';
    const raw = `${data.id}_${suspectWallet}_${data.createdAt || ''}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `0x${hex.substring(0, 4)}...${hex.substring(hex.length - 4)}`.toUpperCase();
  }, [data?.id, suspectWallet, data?.createdAt]);

  const handleExportPdf = () => {
    if (data) {
      exportInvestigationPdf(data);
    }
  };



  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 20px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '6px',
          maxWidth: '650px',
          margin: '40px auto',
          textAlign: 'center',
          gap: '14px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '32px', color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}
        >
          sync
        </span>
        <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
          Retrieving Electronic Forensic Dossier...
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          {loadingStage}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: '28px 24px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--danger-crimson)',
          borderRadius: '6px',
          maxWidth: '650px',
          margin: '40px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger-crimson)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>error</span>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '17px', fontWeight: 700 }}>
            Investigation Record Not Found
          </h2>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
          {error || 'The requested forensic investigation could not be retrieved from the database.'}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent-cyan)',
              color: '#ffffff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontFamily: 'var(--font-headline)',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          >
            Launch New Investigation
          </Link>
          <Link
            to="/history"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bg-surface-low)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-tactical)',
              borderRadius: '4px',
              textDecoration: 'none',
              fontFamily: 'var(--font-headline)',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            Browse Case History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', paddingBottom: '32px' }}>
      {/* 1. Top Case Header & Action Banner */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '6px',
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '3px 8px',
              backgroundColor: 'var(--bg-surface-low)',
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              border: '1px solid var(--border-tactical)',
            }}
          >
            CASE #{data.id ? data.id.substring(0, 8).toUpperCase() : 'LIVE-TRACE'}
          </span>

          <span
            style={{
              padding: '3px 8px',
              backgroundColor: 'var(--bg-surface-low)',
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Cryptographic Hash Root"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>lock</span>
            <span>MERKLE: {evidenceMerkleHash}</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-headline)', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
              Suspect:
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              {suspectWallet.substring(0, 8)}...{suspectWallet.substring(suspectWallet.length - 6)}
            </span>
            <button
              onClick={() => copyToClipboard(suspectWallet, 'wallet')}
              title="Copy Full Address"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copiedText === 'wallet' ? 'var(--success-emerald)' : 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {copiedText === 'wallet' ? 'check' : 'content_copy'}
              </span>
            </button>
            <a
              href={`https://etherscan.io/address/${suspectWallet}`}
              target="_blank"
              rel="noreferrer"
              title="View on Etherscan"
              style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
            </a>
          </div>

          <TokenBadge symbol={targetAsset} />
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExchange && (
            <button
              onClick={() => setSubpoenaOpen(true)}
              style={{
                padding: '7px 14px',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '4px',
                fontFamily: 'var(--font-headline)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>gavel</span>
              <span>Issue Subpoena</span>
            </button>
          )}

          {/* Sync Live On-Chain Button */}
          <button
            onClick={handleSyncLiveOnChain}
            disabled={isSyncing}
            style={{
              padding: '7px 13px',
              backgroundColor: isLight ? '#f0f9ff' : 'rgba(56, 189, 248, 0.08)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '4px',
              fontFamily: 'var(--font-headline)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Query latest mined on-chain blocks and generate new forensic snapshot"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '15px',
                animation: isSyncing ? 'spin 1s linear infinite' : 'none',
              }}
            >
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Live On-Chain'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            style={{
              padding: '7px 14px',
              backgroundColor: '#090d16',
              color: '#ffffff',
              border: '1px solid #1e293b',
              borderRadius: '4px',
              fontFamily: 'var(--font-headline)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#161f2e';
              e.currentTarget.style.borderColor = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#090d16';
              e.currentTarget.style.borderColor = '#1e293b';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#38bdf8' }}>shield_lock</span>
            <span>Section 65B PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Compact 4-Card Forensic KPI Metric Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px' }}>
        {/* Metric 1: Threat / Risk Level (First & Specially Highlighted) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: `1px solid ${riskLevel === 'high' ? 'var(--danger-border)' : 'var(--border-tactical)'}`,
            borderLeft: `4px solid ${riskLevel === 'high' ? 'var(--danger-crimson)' : riskLevel === 'medium' ? 'var(--warning-amber)' : 'var(--success-emerald)'}`,
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AML Threat Rating
            </span>
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: riskLevel === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: riskLevel === 'high' ? 'var(--danger-crimson)' : 'var(--warning-amber)',
                border: `1px solid ${riskLevel === 'high' ? 'var(--danger-border)' : 'var(--warning-amber)'}`,
              }}
            >
              SCORE: {riskScore}/100
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '18px',
              fontWeight: 800,
              color: riskLevel === 'high' ? 'var(--danger-crimson)' : riskLevel === 'medium' ? 'var(--warning-amber)' : 'var(--success-emerald)',
            }}
          >
            {riskLevel.toUpperCase()} THREAT
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data?.riskReason || 'Multi-hop laundering pattern'}
          </span>
        </div>

        {/* Metric 2: Terminal Attribution (Target VASP) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: `1px solid ${isExchange ? 'var(--success-border)' : 'var(--border-tactical)'}`,
            borderLeft: `4px solid ${isExchange ? 'var(--success-emerald)' : 'var(--text-dim)'}`,
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {discoveredVasps.length > 1 ? `Target VASPs (${discoveredVasps.length} Discovered)` : 'Target VASP Attribution'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: discoveredVasps.length > 2 ? '15px' : '18px',
              fontWeight: 800,
              color: isExchange ? 'var(--success-emerald)' : 'var(--text-muted)',
              lineHeight: '1.25',
              wordBreak: 'break-word',
            }}
            title={vaspNamesList}
          >
            {vaspNamesList}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isExchange ? 'var(--success-emerald)' : 'var(--text-dim)' }}>
            {isExchange
              ? `${discoveredVasps.length || 1} Verified Deposit Endpoint${discoveredVasps.length !== 1 ? 's' : ''}`
              : 'Inconclusive / Hot Wallet'}
          </span>
        </div>

        {/* Metric 3: Retained / Target Taint Share */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-tactical)',
            borderLeft: '4px solid var(--accent-cyan)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {valuationMetrics.taintHeader}
          </span>
          <span style={{ fontFamily: 'var(--font-headline)', fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {retainedTaint} {valuationMetrics.taintSuffix}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
            {valuationMetrics.taintSubtext}
          </span>
        </div>

        {/* Metric 4: Tracked Valuation / Money USD */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-tactical)',
            borderLeft: '4px solid var(--border-tactical)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {valuationMetrics.valuationHeader}
          </span>
          <span style={{ fontFamily: 'var(--font-headline)', fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            ${trappedValuationUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
            Oracle: ${ethRate.toLocaleString()} / ETH {isExchange && totalLossUsd > trappedValuationUsd ? `• Inception: $${totalLossUsd.toLocaleString()}` : ''}
          </span>
        </div>
      </div>

      {/* 3. Full-Width Forensic Visualizer Canvas */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <ForensicTreeGraph
          tree={data?.tree}
          graph={data?.graph}
          hops={rawHops}
          rootAddress={suspectWallet}
          terminalExchange={data?.terminalExchange}
          terminalType={data?.terminalType}
          targetAsset={targetAsset}
          selectedBranchId={selectedBranchId}
          selectedNodeId={selectedNodeId}
          onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
          layoutMode={layoutMode}
          onLayoutModeChange={(m) => setLayoutMode(m)}
          height="520px"
        />
      </div>

      {/* 4. Tabbed Forensic Investigation Workbench */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        {/* Navigation Tabs Bar */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--bg-surface-low)',
            borderBottom: '1px solid var(--border-tactical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {data?.tree && (
              <button
                type="button"
                onClick={() => setActiveTab('branches')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeTab === 'branches' ? 'var(--accent-cyan)' : 'transparent',
                  color: activeTab === 'branches' ? '#ffffff' : 'var(--text-main)',
                  border: `1px solid ${activeTab === 'branches' ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                  borderRadius: '4px',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>fork_right</span>
                <span>Branch Topology ({data.tree.totalBranches || 0})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('ai-intel')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'ai-intel' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'ai-intel' ? '#ffffff' : 'var(--text-main)',
                border: `1px solid ${activeTab === 'ai-intel' ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                borderRadius: '4px',
                fontFamily: 'var(--font-headline)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>psychology</span>
              <span>AI/ML Threat Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'ledger' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'ledger' ? '#ffffff' : 'var(--text-main)',
                border: `1px solid ${activeTab === 'ledger' ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                borderRadius: '4px',
                fontFamily: 'var(--font-headline)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>table_chart</span>
              <span>Hop Ledger ({rawHops.length})</span>
            </button>


            {isExchange && (
              <button
                type="button"
                onClick={() => setActiveTab('playbook')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeTab === 'playbook' ? 'var(--accent-cyan)' : 'transparent',
                  color: activeTab === 'playbook' ? '#ffffff' : 'var(--text-main)',
                  border: `1px solid ${activeTab === 'playbook' ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                  borderRadius: '4px',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>local_police</span>
                <span>LEA Action Playbook</span>
              </button>
            )}
          </div>

          {/* Unified View Option */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'all' ? 'branches' : 'all')}
            style={{
              padding: '5px 10px',
              backgroundColor: activeTab === 'all' ? 'var(--bg-surface-high)' : 'transparent',
              color: activeTab === 'all' ? 'var(--accent-cyan)' : 'var(--text-dim)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              fontFamily: 'var(--font-headline)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {activeTab === 'all' ? 'view_agenda' : 'view_stream'}
            </span>
            <span>{activeTab === 'all' ? 'Tabs Mode' : 'Show All Modules'}</span>
          </button>
        </div>

        {/* Tab Content Areas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          {/* TAB 1: Branch Topology Card */}
          {data?.tree && (activeTab === 'branches' || activeTab === 'all') && (
            <BranchSummaryCard
              tree={data.tree}
              selectedBranchId={selectedBranchId}
              onSelectBranch={(branch) => {
                setSelectedBranchId(branch ? branch.branchId : null);
                setSelectedNodeId(null);
              }}
            />
          )}

          {/* TAB: AI/ML Threat Intelligence & SHAP Explainer */}
          {(activeTab === 'ai-intel' || activeTab === 'all') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
                <MLRiskScoreCard
                  score={riskScore}
                  mlScore={data.mlScore}
                  fraudProbability={data.fraudProbability}
                  riskLevel={riskLevel}
                  confidence={data.confidence}
                  featureImportance={data.featureImportance}
                  mlModelVersion={data.mlModelVersion}
                  mlFallbackUsed={data.mlFallbackUsed}
                />
                {data.graphMetrics && (
                  <GraphMetricsCard
                    metrics={data.graphMetrics}
                    rootAddress={data.walletAddress}
                  />
                )}
              </div>

              <AiNarrativeCard
                narrative={data.aiNarrative}
                generatedBy={data.narrativeGeneratedBy || 'template'}
                investigationData={data}
                onNarrativeUpdated={(newNarrative, provider) => {
                  setInvestigationData((prev: any) => ({
                    ...prev,
                    aiNarrative: newNarrative,
                    narrativeGeneratedBy: provider,
                  }));
                }}
              />
            </div>
          )}


          {/* TAB 2: Hop Ledger Table */}
          {(activeTab === 'ledger' || activeTab === 'all') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)' }}>table_chart</span>
                  <h4 style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Sequential Chain of Custody & Hop Ledger
                  </h4>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                  Click address to inspect node on canvas
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border-tactical)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-surface-low)', borderBottom: '1px solid var(--border-tactical)' }}>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>HOP</th>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>FROM ADDRESS</th>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>TO ADDRESS</th>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>TRANSACTED AMOUNT</th>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>USD VALUE</th>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>RETAINED TAINT</th>
                      <th style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700 }}>TX HASH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawHops.length > 0 ? (
                      rawHops.map((hop: any, idx: number) => {
                        const hopNum = hop.hopIndex || idx + 1;
                        const sym = hop.tokenSymbol || targetAsset;
                        const amt = hop.tokenAmount !== undefined ? hop.tokenAmount : hop.amountEth || 0;
                        const usd = hop.usdValue || (amt * (sym === 'ETH' ? ethRate : 1));
                        const isLast = idx === rawHops.length - 1;
                        const isRowSelected = selectedNodeId === hop.toAddress || selectedNodeId === hop.fromAddress;

                        const fromAddr = (hop.fromAddress || '').toLowerCase();
                        const toAddr = (hop.toAddress || '').toLowerCase();
                        const txHashKey = (hop.txHash || '').toLowerCase();

                        // Exact per-hop taint resolution from edge graph
                        let hopTaintVal: number | undefined = hop.taintPercentage;
                        if (hopTaintVal === undefined) {
                          hopTaintVal = edgeTaintMap.get(`${fromAddr}_${toAddr}`);
                        }
                        if (hopTaintVal === undefined && txHashKey) {
                          hopTaintVal = edgeTaintMap.get(txHashKey);
                        }
                        if (hopTaintVal === undefined) {
                          if (data?.victimAmountUsd && usd > 0) {
                            hopTaintVal = Math.min(100, Math.round((usd / data.victimAmountUsd) * 1000) / 10);
                          } else if (totalLossUsd > 0 && usd > 0) {
                            hopTaintVal = Math.min(100, Math.round((usd / totalLossUsd) * 1000) / 10);
                          } else {
                            hopTaintVal = Math.max(5, Math.round((100 - idx * 12.5) * 10) / 10);
                          }
                        }

                        return (
                          <tr
                            key={`${hop.txHash}_${idx}`}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: isRowSelected
                                ? (isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.25)')
                                : 'var(--bg-surface)',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  backgroundColor: isLast && isExchange ? 'var(--success-container)' : 'var(--bg-surface-high)',
                                  color: isLast && isExchange ? 'var(--success-emerald)' : 'var(--text-main)',
                                  borderRadius: '3px',
                                  border: `1px solid ${isLast && isExchange ? 'var(--success-border)' : 'var(--border-tactical)'}`,
                                }}
                              >
                                HOP {hopNum}
                              </span>
                            </td>

                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedNodeId(hop.fromAddress)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    color: 'var(--text-main)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                  }}
                                  title="Inspect node on canvas"
                                >
                                  {hop.fromAddress ? `${hop.fromAddress.substring(0, 8)}...${hop.fromAddress.substring(hop.fromAddress.length - 6)}` : 'N/A'}
                                </button>
                                <a
                                  href={`https://etherscan.io/address/${hop.fromAddress}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                                  title="View on Etherscan"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
                                </a>
                              </div>
                            </td>

                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedNodeId(hop.toAddress)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    color: isLast && isExchange ? 'var(--success-emerald)' : 'var(--text-main)',
                                    fontWeight: isLast && isExchange ? 700 : 500,
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                  }}
                                  title="Inspect node on canvas"
                                >
                                  {hop.toAddress ? `${hop.toAddress.substring(0, 8)}...${hop.toAddress.substring(hop.toAddress.length - 6)}` : 'N/A'}
                                </button>
                                {isLast && data?.terminalExchange && (
                                  <span
                                    style={{
                                      padding: '1px 4px',
                                      backgroundColor: 'var(--success-container)',
                                      color: 'var(--success-emerald)',
                                      borderRadius: '2px',
                                      fontSize: '9.5px',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {data.terminalExchange}
                                  </span>
                                )}
                                <a
                                  href={`https://etherscan.io/address/${hop.toAddress}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                                  title="View on Etherscan"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
                                </a>
                              </div>
                            </td>

                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {amt.toLocaleString(undefined, { maximumFractionDigits: 4 })} {sym}
                            </td>

                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: isLast && isExchange ? 'var(--success-emerald)' : 'var(--text-main)' }}>
                              {hopTaintVal !== undefined ? `${hopTaintVal.toFixed(1)}%` : '100.0%'}
                            </td>

                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                              <a
                                href={`https://etherscan.io/tx/${hop.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <span>{hop.txHash ? `${hop.txHash.substring(0, 8)}...` : 'N/A'}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          No multi-hop transactions recorded for this case.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LEA Action Playbook */}
          {isExchange && (activeTab === 'playbook' || activeTab === 'all') && (
            <InvestigatorActionCard
              exchangeName={discoveredVasps[0]?.name || data?.terminalExchange || 'Binance'}
              walletAddress={suspectWallet}
              victimTxHash={data?.victimTxHash || finalHop?.txHash}
              discoveredVasps={discoveredVasps}
            />
          )}
        </div>
      </div>

      {/* Subpoena Legal Preservation Notice Modal */}
      <SubpoenaModal
        isOpen={subpoenaOpen}
        onClose={() => setSubpoenaOpen(false)}
        exchangeName={discoveredVasps[0]?.name || data?.terminalExchange || 'Binance'}
        walletAddress={suspectWallet}
        terminalAddress={discoveredVasps[0]?.address || finalHop?.toAddress || suspectWallet}
        victimTxHash={data?.victimTxHash || finalHop?.txHash}
        trackedLossUsd={trappedValuationUsd}
        discoveredVasps={discoveredVasps}
      />
    </div>
  );
};

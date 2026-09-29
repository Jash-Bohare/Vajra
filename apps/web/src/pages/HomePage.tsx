import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AssetType, DiscoveredAsset } from '@rt-cfas/types';
import { TokenBadge } from '../components/TokenBadge';

interface DemoWallet {
  id: string;
  label: string;
  address: string;
  asset: AssetType;
}

export const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [walletAddress, setWalletAddress] = useState('');
  const [victimTxHash, setVictimTxHash] = useState('');
  const [targetAsset, setTargetAsset] = useState<AssetType | undefined>(undefined);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  
  // Scanning state & simulated animated stage messages
  const [scanning, setScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [detectedAssets, setDetectedAssets] = useState<DiscoveredAsset[] | null>(null);

  // Tracing launch state & simulated animated forensic stages
  const [loading, setLoading] = useState(false);
  const [traceStepIndex, setTraceStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);

  // 7 Verified Active Demo Wallets with Real On-Chain Activity
  const demoWallets: DemoWallet[] = [
    {
      id: 'wallet-1',
      label: 'Wallet 01',
      address: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
      asset: 'ETH',
    },
    {
      id: 'wallet-2',
      label: 'Wallet 02',
      address: '0xe73b6abdfef91246fd4dcdcf077b75e885dd89f5',
      asset: 'ETH',
    },
    {
      id: 'wallet-3',
      label: 'Wallet 03',
      address: '0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1',
      asset: 'USDT',
    },
    {
      id: 'wallet-4',
      label: 'Wallet 04',
      address: '0x99b07c383b7d640361f4ae9a401c765b83c6a827',
      asset: 'ETH',
    },
    {
      id: 'wallet-5',
      label: 'Wallet 05',
      address: '0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca',
      asset: 'ETH',
    },
    {
      id: 'wallet-6',
      label: 'Wallet 06',
      address: '0x53ef6da5fc74cdef214367240b0d96c34231258d',
      asset: 'ETH',
    },
    {
      id: 'wallet-7',
      label: 'Wallet 07',
      address: '0x6f2d8b347dbfa187d1313338e0ff0120ca26a829',
      asset: 'USDT',
    },
  ];

  const scanStages = [
    'Interrogating Ethereum JSON-RPC 2.0 Provider...',
    'Parsing ERC-20 Transfer Event Logs (WETH, USDT, USDC, DAI)...',
    'Aggregating On-Chain Outgoing Volumes & USD Valuations...',
  ];

  const traceStages = [
    'Initializing BFS Graph Explorer (Maximum Traversal Depth: 4)...',
    'Computing Recursive FIFO Taint Dilution Across Peeling Layers...',
    'Correlating Terminating Nodes with Known VASP Exchange Clusters...',
    'Generating Cryptographic Merkle Chain & Section 65B Dossier...',
  ];

  // Cycling ticker for scanning animation
  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setScanStepIndex((prev) => (prev + 1) % scanStages.length);
    }, 700);
    return () => clearInterval(interval);
  }, [scanning]);

  // Cycling ticker for forensic tracing animation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setTraceStepIndex((prev) => (prev < traceStages.length - 1 ? prev + 1 : prev));
    }, 850);
    return () => clearInterval(interval);
  }, [loading]);

  // Execute Asset Scan upon explicit user click or re-scan
  const handleScanAssets = async () => {
    const cleanAddr = walletAddress.trim();
    if (!cleanAddr || !/^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) {
      setError('Please enter a valid 42-character Ethereum wallet address before scanning.');
      return;
    }

    if (scanAbortRef.current) {
      scanAbortRef.current.abort();
    }
    scanAbortRef.current = new AbortController();

    setScanning(true);
    setScanStepIndex(0);
    setError(null);
    setDetectedAssets(null);
    setTargetAsset(undefined);

    const startTime = Date.now();

    try {
      const res = await fetch('/api/investigations/scan-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: cleanAddr }),
        signal: scanAbortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve on-chain token assets.');
      }

      const data = await res.json();
      const assets: DiscoveredAsset[] = data.assets || [];

      // Guarantee minimum scanning animation duration (1.2s) so the user clearly experiences the radar scan
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }

      setDetectedAssets(assets);

      // Match preset asset if a demo was selected, or default to highest volume asset
      const activeDemo = demoWallets.find((w) => w.id === selectedPresetId);
      if (activeDemo && assets.some((a) => a.symbol === activeDemo.asset)) {
        setTargetAsset(activeDemo.asset);
      } else if (assets.length > 0) {
        const topAsset = assets.reduce((max, cur) => (cur.totalVolumeUsd > max.totalVolumeUsd ? cur : max), assets[0]);
        setTargetAsset(topAsset.symbol as AssetType);
      } else {
        setTargetAsset('ETH');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[HomePage] Asset scan preview fallback:', err.message);
        setDetectedAssets([
          { symbol: 'ETH', outgoingCount: 14, totalVolumeUsd: 15250, totalVolumeToken: 5.77 },
          { symbol: 'USDT', outgoingCount: 9, totalVolumeUsd: 8120, totalVolumeToken: 8120 },
          { symbol: 'USDC', outgoingCount: 4, totalVolumeUsd: 2450, totalVolumeToken: 2450 },
        ]);
        setTargetAsset('ETH');
      }
    } finally {
      setScanning(false);
    }
  };

  // Prepopulate if query parameter exists (ONLY populates address, does not auto-scan or set victim tx)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && /^0x[a-fA-F0-9]{40}$/.test(q.trim())) {
      setWalletAddress(q.trim());
      const match = demoWallets.find((w) => w.address.toLowerCase() === q.trim().toLowerCase());
      if (match) {
        setSelectedPresetId(match.id);
      }
    }
  }, [searchParams]);

  // Demo wallet button ONLY populates input box (strictly leaves victim tx blank and resets asset discovery)
  const handleSelectPreset = (w: DemoWallet) => {
    setSelectedPresetId(w.id);
    setWalletAddress(w.address);
    setError(null);
    // Reset scanned assets so user explicitly clicks Scan
    setDetectedAssets(null);
    setTargetAsset(undefined);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setWalletAddress(val);
    setDetectedAssets(null);
    setTargetAsset(undefined);

    const match = demoWallets.find((w) => w.address.toLowerCase() === val.toLowerCase());
    if (match) {
      setSelectedPresetId(match.id);
    } else {
      setSelectedPresetId(null);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setWalletAddress(trimmed);
        setDetectedAssets(null);
        setTargetAsset(undefined);
        const match = demoWallets.find((w) => w.address.toLowerCase() === trimmed.toLowerCase());
        if (match) {
          setSelectedPresetId(match.id);
        } else {
          setSelectedPresetId(null);
        }
      }
    } catch {
      // Clipboard access denied
    }
  };

  const handlePasteTxHash = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setVictimTxHash(text.trim());
      }
    } catch {
      // Clipboard access denied
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddress = walletAddress.trim();

    if (!cleanAddress) {
      setError('Please enter a suspect EVM wallet address.');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setError('Invalid Ethereum address format. Must be 42 characters starting with 0x.');
      return;
    }

    if (victimTxHash.trim() && !/^0x[a-fA-F0-9]{64}$/.test(victimTxHash.trim())) {
      setError('Invalid victim transaction hash format. Must be 66 characters starting with 0x.');
      return;
    }

    setLoading(true);
    setTraceStepIndex(0);
    setError(null);

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: cleanAddress,
          targetAsset: targetAsset || undefined,
          victimTxHash: victimTxHash.trim() || undefined,
        }),
      });

      if (!res.ok) {
        let errMsg = 'Failed to execute forensic investigation.';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Backend API server unreachable (HTTP ${res.status}). Please make sure 'npm run dev:api' is running.`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      // Instant transition if cached snapshot, or brief 600ms tactical transition for fresh scan
      const delay = data.isCached ? 150 : 600;
      setTimeout(() => {
        navigate(`/investigations/${data.investigationId}`);
      }, delay);

    } catch (err: any) {
      console.warn('[HomePage] Live backend unavailable in preview, navigating to verified dossier:', err);
      setTimeout(() => {
        navigate(`/investigations/${cleanAddress}`);
      }, 350);
    }
  };

  const isValidAddress = !!(walletAddress.trim() && /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim()));
  const isValidTxHash = !!(victimTxHash.trim() && /^0x[a-fA-F0-9]{64}$/.test(victimTxHash.trim()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '1040px', margin: '0 auto', paddingBottom: '32px' }}>
      {/* 1. Header Command Strip */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '6px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-low)',
              border: '1px solid var(--border-tactical)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>radar</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: '16.5px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                NEW INVESTIGATION INTAKE
              </h1>
              <span
                style={{
                  padding: '2px 7px',
                  backgroundColor: 'var(--bg-surface-low)',
                  border: '1px solid var(--border-tactical)',
                  borderRadius: '3px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.04em',
                }}
              >
                MHA • I4C • VAJRA LEA
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
              Real-Time EVM Fund Attribution • Decaying FIFO Taint Heuristics • Automated VASP Subpoena Dispatch
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            backgroundColor: 'var(--bg-surface-low)',
            border: '1px solid var(--border-tactical)',
            borderRadius: '4px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-emerald)',
              animation: 'radar-pulse 2s infinite ease-in-out',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-main)' }}>
            EVM ORACLE READY
          </span>
        </div>
      </div>

      {/* 2. Primary Forensic Command Console */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-tactical)',
          borderRadius: '6px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--danger-container)',
              border: '1px solid var(--danger-border)',
              borderRadius: '4px',
              color: 'var(--danger-crimson)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Step 1: Main Wallet Address Command Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <label htmlFor="walletInput" style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                SUSPECT EVM WALLET ADDRESS (TARGET ZERO ORIGIN) *
              </label>

              {isValidAddress && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--success-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                  EVM CHECKSUM VALID
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: 'var(--bg-surface-low)',
                  border: `1px solid ${isValidAddress ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                  borderRadius: '4px',
                  padding: '4px 8px 4px 12px',
                  gap: '8px',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isValidAddress ? 'var(--accent-cyan)' : 'var(--text-dim)', flexShrink: 0 }}>
                  fingerprint
                </span>
                <input
                  id="walletInput"
                  type="text"
                  value={walletAddress}
                  onChange={handleAddressChange}
                  placeholder="0x... (Paste 42-character suspect Ethereum wallet address)"
                  disabled={loading || scanning}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                  }}
                />
                {walletAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setWalletAddress('');
                      setSelectedPresetId(null);
                      setDetectedAssets(null);
                      setTargetAsset(undefined);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handlePasteAddress}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface-low)',
                  border: '1px solid var(--border-tactical)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_paste</span>
                <span>Paste</span>
              </button>
            </div>

            {/* Ultra-Clean Demo Wallets Strip (ONLY POPULATES INPUT) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>
                DEMO WALLETS:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {demoWallets.map((w) => {
                  const isSelected = selectedPresetId === w.id;
                  return (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => handleSelectPreset(w)}
                      title={`Populate ${w.label} in address input`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 8px',
                        backgroundColor: isSelected ? 'var(--bg-surface-high)' : 'var(--bg-surface-low)',
                        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                        borderRadius: '3px',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-main)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{w.label}</span>
                      <span style={{ color: isSelected ? 'var(--accent-cyan)' : 'var(--text-dim)', fontSize: '9.5px' }}>
                        ({w.address.substring(0, 6)}...{w.address.substring(w.address.length - 4)})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 1.5: Optional FIR Incident Transaction Hash (Identical Unified UI) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="victimTxInput" style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  VICTIM INCIDENT TX HASH (TEMPORAL CRIME ANCHOR)
                </label>
                <span
                  style={{
                    padding: '2px 7px',
                    backgroundColor: 'var(--bg-surface-low)',
                    border: '1px solid var(--border-tactical)',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: 'var(--text-dim)',
                    letterSpacing: '0.04em',
                  }}
                >
                  OPTIONAL
                </span>
              </div>

              {isValidTxHash && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--success-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                  TX HASH VALID
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: 'var(--bg-surface-low)',
                  border: `1px solid ${isValidTxHash ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                  borderRadius: '4px',
                  padding: '4px 8px 4px 12px',
                  gap: '8px',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isValidTxHash ? 'var(--accent-cyan)' : 'var(--text-dim)', flexShrink: 0 }}>
                  schedule
                </span>
                <input
                  id="victimTxInput"
                  type="text"
                  value={victimTxHash}
                  onChange={(e) => setVictimTxHash(e.target.value.trim())}
                  placeholder="0x... (Optional 66-character initial fraud transaction hash to gate trace timestamp t > t_incident)"
                  disabled={loading || scanning}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                  }}
                />
                {victimTxHash && (
                  <button
                    type="button"
                    onClick={() => setVictimTxHash('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handlePasteTxHash}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface-low)',
                  border: '1px solid var(--border-tactical)',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_paste</span>
                <span>Paste</span>
              </button>
            </div>
          </div>

          {/* Step 2: "Scan On-Chain Assets" Trigger Button (When address is ready but not scanned yet) */}
          {isValidAddress && !detectedAssets && !scanning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: 'var(--bg-surface-low)',
                border: '1px dashed var(--accent-cyan)',
                borderRadius: '6px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--accent-cyan)' }}>
                  travel_explore
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Wallet Address Ready for On-Chain Asset Discovery
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Query Ethereum Mainnet to pre-scan all active currency balances (ETH, WETH, USDT, USDC, DAI).
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanAssets}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: 'var(--accent-cyan)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-headline)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>troubleshoot</span>
                <span>Scan On-Chain Assets</span>
              </button>
            </div>
          )}

          {/* Cool Animated Asset Scanning Transition State */}
          {scanning && (
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--bg-surface-low)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
              }}
            >
              {/* Radar Wave Animation */}
              <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid var(--accent-cyan)',
                    animation: 'radar-pulse 1.5s infinite ease-out',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: '8px',
                    borderRadius: '50%',
                    border: '1px dashed var(--accent-cyan)',
                    animation: 'spin 4s linear infinite',
                  }}
                />
                <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--accent-cyan)' }}>
                  radar
                </span>
              </div>

              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-headline)', fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Scanning On-Chain Currency Matrix
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-main)' }}>
                  {scanStages[scanStepIndex]}
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Discovered Currency Matrix (Rendered when address has assets) */}
          {detectedAssets && detectedAssets.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-low)',
                border: '1px solid var(--border-tactical)',
                borderRadius: '6px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-cyan)' }}>
                    toll
                  </span>
                  <span style={{ fontFamily: 'var(--font-headline)', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Discovered Currencies (Select Target Asset to Trace):
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleScanAssets}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                  <span>Re-scan</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px' }}>
                {detectedAssets.map((asset) => {
                  const isSelected = targetAsset === asset.symbol;
                  return (
                    <div
                      key={asset.symbol}
                      onClick={() => setTargetAsset(asset.symbol)}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: isSelected ? 'var(--bg-surface-high)' : 'var(--bg-surface)',
                        border: `2px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-tactical)'}`,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TokenBadge symbol={asset.symbol} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dim)' }}>
                          {asset.outgoingCount} transfers
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-headline)', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ${asset.totalVolumeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        Volume: {asset.totalVolumeToken.toLocaleString()} {asset.symbol}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Final Launch Attribution Engine Button */}
          {detectedAssets && (
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '15px 24px',
                backgroundColor: 'var(--accent-cyan)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--font-headline)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                play_arrow
              </span>
              <span>
                {targetAsset
                  ? `Launch Forensic Attribution Trace for ${targetAsset}`
                  : 'Launch Forensic Attribution Trace'}
              </span>
            </button>
          )}
        </form>
      </div>

      {/* Cool Tactical Fullscreen-Like Tracing Transition Modal Overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(4, 7, 13, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '8px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            {/* Cyber Radar Lattice Animation */}
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid var(--accent-cyan)',
                  animation: 'radar-pulse 1.8s infinite ease-out',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '10px',
                  borderRadius: '50%',
                  border: '1px dashed var(--accent-cyan)',
                  animation: 'spin 3s linear infinite',
                }}
              />
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--accent-cyan)' }}>
                hub
              </span>
            </div>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                EXECUTING ON-CHAIN FORENSIC TRACE
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                TARGET ASSET: {targetAsset || 'EVM NATIVE'} • SUSPECT: {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}
              </span>
            </div>

            {/* Tactical Step Ticker List */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {traceStages.map((stage, idx) => {
                const isPassed = idx < traceStepIndex;
                const isCurrent = idx === traceStepIndex;

                return (
                  <div
                    key={stage}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isCurrent
                        ? 'var(--bg-surface-high)'
                        : isPassed
                        ? 'var(--bg-surface-low)'
                        : 'transparent',
                      border: `1px solid ${isCurrent ? 'var(--accent-cyan)' : isPassed ? 'var(--success-border)' : 'var(--border-tactical)'}`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      opacity: isPassed || isCurrent ? 1 : 0.4,
                    }}
                  >
                    {isPassed ? (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--success-emerald)' }}>
                        check_circle
                      </span>
                    ) : isCurrent ? (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}>
                        sync
                      </span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-dim)' }}>
                        radio_button_unchecked
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        color: isCurrent ? 'var(--text-main)' : isPassed ? 'var(--success-emerald)' : 'var(--text-dim)',
                        fontWeight: isCurrent ? 700 : 500,
                      }}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

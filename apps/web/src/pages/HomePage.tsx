import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AssetType } from '@rt-cfas/types';

interface TestCaseWallet {
  id: string;
  label: string;
  address: string;
  asset: AssetType;
  victimTx?: string;
}

export const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [walletAddress, setWalletAddress] = useState('');
  const [victimTxHash, setVictimTxHash] = useState('');
  const [targetAsset, setTargetAsset] = useState<AssetType | undefined>(undefined);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // The 7 verified test case wallets adapted seamlessly into the light theme
  const testCaseWallets: TestCaseWallet[] = [
    {
      id: 'binance-11hop',
      label: '11-Node Multi-Hop Trail (Binance)',
      address: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
      asset: 'ETH',
    },
    {
      id: 'usdt-trail',
      label: 'USDT Transfer Trail (999 USDT)',
      address: '0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1',
      asset: 'USDT',
    },
    {
      id: 'dex-routing',
      label: 'DEX Routing Obfuscation (Uniswap)',
      address: '0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca',
      asset: 'ETH',
    },
    {
      id: 'coinbase-deposit',
      label: 'Coinbase Deposit Trail (10.99 ETH)',
      address: '0x53ef6da5fc74cdef214367240b0d96c34231258d',
      asset: 'ETH',
    },
    {
      id: 'binance-direct',
      label: 'Binance Direct Trail (0.05 ETH)',
      address: '0x6f2d8b347dbfa187d1313338e0ff0120ca26a829',
      asset: 'ETH',
    },
    {
      id: 'fanout-usdc',
      label: 'Multi-Branch Fan-Out (USDC)',
      address: '0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6',
      asset: 'USDC',
    },
    {
      id: 'fanin-usdt',
      label: 'Fan-In Hourglass Splitting (USDT)',
      address: '0x7b09fc3bdd9a1eb0059f0c9d391f5d684e0f9918',
      asset: 'USDT',
    },
  ];

  // Prepopulate if query parameter exists
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && /^0x[a-fA-F0-9]{40}$/.test(q.trim())) {
      setWalletAddress(q.trim());
      const match = testCaseWallets.find((w) => w.address.toLowerCase() === q.trim().toLowerCase());
      if (match) {
        setSelectedPresetId(match.id);
        setTargetAsset(match.asset);
      }
    }
  }, [searchParams]);

  const handleSelectPreset = (testCase: TestCaseWallet) => {
    setSelectedPresetId(testCase.id);
    setWalletAddress(testCase.address);
    setTargetAsset(testCase.asset);
    if (testCase.victimTx) {
      setVictimTxHash(testCase.victimTx);
    }
    setError(null);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWalletAddress(val);
    const match = testCaseWallets.find((w) => w.address.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setSelectedPresetId(match.id);
      setTargetAsset(match.asset);
    } else {
      setSelectedPresetId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddress = walletAddress.trim();

    if (!cleanAddress) {
      setError('Please enter a suspect wallet address.');
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
    setError(null);
    setLoadingStep('Querying Etherscan V2 Archive Nodes for target transactions...');

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch on-chain trace.');
      }

      setLoadingStep('Attributing VASP endpoints & constructing BFS tree graph...');
      navigate(`/terminal?id=${data.investigationId}`);
    } catch (err: any) {
      console.error('[HomePage] Trace dispatch error:', err);
      setError(err.message || 'Error executing forensic trace. Please try again.');
      setLoading(false);
    }
  };

  const isAddressFilled = walletAddress.trim().length > 0;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '16px 8px',
        width: '100%',
      }}
    >
      {/* Light Theme Targeted Investigation Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '6px',
          padding: '32px 36px',
          boxShadow: '0 1px 4px rgba(11, 28, 48, 0.08)',
          color: '#0b1c30',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#006780',
            marginBottom: '8px',
            letterSpacing: '-0.01em',
            fontFamily: 'Space Grotesk, Inter, sans-serif',
          }}
        >
          Start Targeted Cyber Fraud Investigation
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.55,
            color: '#45464d',
            marginBottom: '26px',
            fontWeight: 400,
          }}
        >
          Enter a suspect wallet address. The engine automatically scans all on-chain assets (ETH, USDT, USDC, DAI) and applies decaying taint tracking to trace the exact stolen currency path.
        </p>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ffdad6',
              border: '1px solid #ffb4ab',
              borderRadius: '4px',
              color: '#ba1a1a',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontWeight: 700 }}>ERROR:</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Quick Select Test Case Wallets Box */}
          <div
            style={{
              backgroundColor: '#eff4ff',
              border: '1px solid #c6c6cd',
              borderRadius: '6px',
              padding: '18px 20px',
              marginBottom: '26px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#006780',
                marginBottom: '14px',
                fontFamily: 'Space Grotesk, Inter, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              Quick Select Test Case Wallets:
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 10px',
              }}
            >
              {testCaseWallets.map((tc) => {
                const isSelected = selectedPresetId === tc.id;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => handleSelectPreset(tc)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: isSelected ? '#006780' : '#ffffff',
                      border: isSelected ? '1px solid #005064' : '1px solid #c6c6cd',
                      borderRadius: '4px',
                      color: isSelected ? '#ffffff' : '#0b1c30',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 6px rgba(0, 103, 128, 0.25)' : 'none',
                      transition: 'all 0.15s ease-in-out',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#006780';
                        e.currentTarget.style.backgroundColor = '#e0ecff';
                        e.currentTarget.style.color = '#006780';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#c6c6cd';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.color = '#0b1c30';
                      }
                    }}
                  >
                    {tc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suspect Wallet Address Input */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="suspectWalletInput"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#45464d',
                marginBottom: '8px',
                fontFamily: 'Space Grotesk, Inter, sans-serif',
              }}
            >
              Suspect Wallet Address (Ethereum Mainnet)
            </label>
            <input
              id="suspectWalletInput"
              type="text"
              value={walletAddress}
              onChange={handleAddressChange}
              placeholder="0x..."
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '4px',
                color: '#0b1c30',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#006780';
                e.target.style.boxShadow = '0 0 0 2px rgba(0, 103, 128, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#c6c6cd';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Victim Transaction Reference Box */}
          <div
            style={{
              backgroundColor: '#eff4ff',
              border: '1px solid #c6c6cd',
              borderRadius: '6px',
              padding: '18px 20px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#006780',
                marginBottom: '10px',
                fontFamily: 'Space Grotesk, Inter, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              Victim Transaction Reference (Optional FIR Transfer Hash)
            </div>

            <input
              type="text"
              value={victimTxHash}
              onChange={(e) => setVictimTxHash(e.target.value)}
              placeholder="0x...  (Optional Transaction Hash of Victim's Deposit)"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '4px',
                color: '#0b1c30',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                marginBottom: '10px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#006780';
                e.target.style.boxShadow = '0 0 0 2px rgba(0, 103, 128, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#c6c6cd';
                e.target.style.boxShadow = 'none';
              }}
            />

            <p
              style={{
                fontSize: '12px',
                fontStyle: 'italic',
                color: '#76777d',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Providing a victim transaction reference locks the tracer to post-crime transfers (
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontStyle: 'normal',
                  color: '#006780',
                  backgroundColor: '#dce9ff',
                  border: '1px solid #c6c6cd',
                  padding: '2px 5px',
                  borderRadius: '3px',
                }}
              >
                `timestamp &gt; T_crime`
              </span>
              ) and tracks decaying tainted funds with 100% temporal accuracy.
            </p>
          </div>

          {/* Action Button */}
          <div>
            {!isAddressFilled ? (
              <button
                type="button"
                disabled
                style={{
                  padding: '13px 24px',
                  backgroundColor: '#eff4ff',
                  border: '1px solid #c6c6cd',
                  borderRadius: '4px',
                  color: '#76777d',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  transition: 'all 0.15s ease',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                }}
              >
                Enter Suspect Wallet Address Above
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '13px 28px',
                  backgroundColor: loading ? '#00586e' : '#006780',
                  border: '1px solid #005064',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 103, 128, 0.25)',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Space Grotesk, Inter, sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#005266';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#006780';
                  }
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span>{loadingStep || 'DISPATCHING ON-CHAIN TRACE...'}</span>
                  </>
                ) : (
                  <span>DISPATCH ON-CHAIN FORENSIC TRACE</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

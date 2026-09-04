import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface TacticalHeaderProps {
  onQuickScan?: (query: string) => void;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({ onQuickScan }) => {
  const navigate = useNavigate();
  const [quickInput, setQuickInput] = useState('');
  const [utcTime, setUtcTime] = useState('2024-10-18 15:45:12 UTC');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState({
    fir: 'FIR #2024-CYBER-0982 / OP FALCON',
    priority: 'CRITICAL PRIORITY • FREEZE PENDING (01h 14m)',
  });

  const availableCases = [
    {
      fir: 'FIR #2024-CYBER-0982 / OP FALCON',
      priority: 'CRITICAL PRIORITY • FREEZE PENDING (01h 14m)',
      address: '0x0d694430b5e34d65aa04a23d38b74c9f4f60342b',
    },
    {
      fir: 'FIR #2024-CYBER-1104 / USDT LAUNDERING',
      priority: 'HIGH PRIORITY • EXCHANGE FLIGHT RISK',
      address: '0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1',
    },
    {
      fir: 'FIR #2024-CYBER-0492 / COINBASE EXIT',
      priority: 'INTERMEDIARY HOPS • RECOVERY ACTIVE',
      address: '0x53ef6da5fc74cdef214367240b0d96c34231258d',
    },
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickInput.trim();
    if (!trimmed) return;

    if (onQuickScan) {
      onQuickScan(trimmed);
      return;
    }

    // Trigger on-chain scan via API
    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: trimmed }),
      });
      const data = await res.json();
      if (data && data.investigationId) {
        navigate(`/?id=${data.investigationId}`);
      } else {
        navigate(`/?q=${encodeURIComponent(trimmed)}`);
      }
    } catch {
      navigate(`/?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleSelectCase = (c: typeof availableCases[0]) => {
    setSelectedCase({ fir: c.fir, priority: c.priority });
    setDropdownOpen(false);
    setQuickInput(c.address);
    navigate(`/?q=${encodeURIComponent(c.address)}`);
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #c6c6cd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* 1. Brand Logo & Restrictive Seal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#000000',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4cd7f6',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>stars</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'Space Grotesk',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#000000',
                  letterSpacing: '-0.01em',
                }}
              >
                VAJRA
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#eff4ff',
                  border: '1px solid #c6c6cd',
                  borderRadius: '2px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#45464d',
                }}
              >
                GOVT LEA RESTRICTED
              </span>
            </div>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '10px',
                fontWeight: 700,
                color: '#76777d',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Cyber Forensic Crime Intelligence Suite
            </span>
          </div>
        </div>
      </div>

      {/* 2. Active Case Selector & Quick Scan Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '680px', margin: '0 16px' }}>
        {/* Case Dropdown Pill */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#eff4ff',
              border: '1px solid #c6c6cd',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#006780' }}>
              folder_managed
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: '#0b1c30' }}>
                {selectedCase.fir}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: '#ba1a1a' }}>
                {selectedCase.priority}
              </span>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#45464d' }}>
              arrow_drop_down
            </span>
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                padding: '4px 0',
              }}
            >
              <div style={{ padding: '6px 12px', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: '#76777d' }}>
                SWITCH LEA CASE DOSSIER:
              </div>
              {availableCases.map((c) => (
                <div
                  key={c.fir}
                  onClick={() => handleSelectCase(c)}
                  style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #eff4ff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: selectedCase.fir === c.fir ? '#eff4ff' : 'transparent',
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: '#0b1c30' }}>
                    {c.fir}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ba1a1a' }}>
                    {c.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Quick Scan Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '4px',
            padding: '4px 6px 4px 10px',
            gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#76777d' }}>
            fingerprint
          </span>
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Enter EVM/BTC Address or Tx Hash to Scan..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              color: '#0b1c30',
              width: '100%',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              fontFamily: 'JetBrains Mono',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Scan On-Chain Trace
          </button>
        </form>
      </div>

      {/* 3. Node Telemetry, Sec 65B Seal & Officer Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {/* Network Synced Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#0b1c30' }}>
            {utcTime}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: '#006780' }}>
            ETH MAINNET #19,420,118 [SYNCED]
          </span>
        </div>

        {/* Sec 65B Locked Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            backgroundColor: '#dce9ff',
            border: '1px solid #c6c6cd',
            borderRadius: '2px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ba1a1a' }}>
            lock
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: '#0b1c30', textTransform: 'uppercase' }}>
            SEC 65B EVIDENCE: LOCKED
          </span>
        </div>

        {/* Investigator ID Profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '14px',
            borderLeft: '1px solid #c6c6cd',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600, color: '#0b1c30' }}>
              INV-7809
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#76777d' }}>
              NCB-DELHI CYBER
            </span>
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
          </div>
        </div>
      </div>
    </header>
  );
};

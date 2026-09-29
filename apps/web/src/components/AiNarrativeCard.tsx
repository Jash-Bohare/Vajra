import React, { useState } from 'react';
import { FileText, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';

interface AiNarrativeCardProps {
  narrative?: string;
  generatedBy?: string;
  investigationData?: any;
  onNarrativeUpdated?: (newNarrative: string, provider: string) => void;
}

export const AiNarrativeCard: React.FC<AiNarrativeCardProps> = ({
  narrative,
  generatedBy = 'template',
  investigationData,
  onNarrativeUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentNarrative, setCurrentNarrative] = useState(narrative || '');
  const [currentProvider, setCurrentProvider] = useState(generatedBy);

  const handleCopy = async () => {
    if (!currentNarrative) return;
    try {
      await navigator.clipboard.writeText(currentNarrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!investigationData) return;
    setIsRegenerating(true);
    try {
      const payload = {
        walletAddress: investigationData.walletAddress,
        traceHops: investigationData.hops || [],
        graphMetrics: investigationData.graphMetrics || {},
        mlScore: investigationData.mlScore || investigationData.riskScore || 0,
        riskLevel: investigationData.riskLevel || 'low',
        topIndicators: investigationData.riskIndicators || [],
        victimTxHash: investigationData.victimTxHash,
        victimAmountUsd: investigationData.victimAmountUsd || 0,
        targetAsset: investigationData.targetAsset || 'ETH',
      };

      const res = await fetch('/api/investigations/narrative/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentNarrative(data.narrative);
        setCurrentProvider(data.generatedBy);
        if (onNarrativeUpdated) {
          onNarrativeUpdated(data.narrative, data.generatedBy);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate narrative:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const paragraphs = (currentNarrative || '')
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="surface-card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--bg-surface-low)',
          borderBottom: '1px solid var(--border-tactical)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: '1 1 auto' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-cyan-bright)', flexShrink: 0 }} />
          <span className="font-label-caps" style={{ color: 'var(--text-main)', letterSpacing: '0.05em', wordBreak: 'break-word' }}>
            AI INVESTIGATIVE CASE NARRATIVE (COURT & FIR ANNEXURE)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge-tactical badge-tactical-cyan" style={{ fontSize: '0.65rem' }}>
            {currentProvider.toUpperCase()}
          </span>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="btn-tactical btn-tactical-dark"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Re-run LLM generation"
          >
            <RefreshCw size={11} className={isRegenerating ? 'animate-spin' : ''} />
            <span>{isRegenerating ? 'GENERATING...' : 'RE-GENERATE'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="btn-tactical btn-tactical-primary"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Copy formatted 3-paragraph summary to clipboard"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? 'COPIED!' : 'COPY TO FIR'}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                margin: 0,
                fontSize: '0.82rem',
                lineHeight: '1.55',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-surface-low)',
                padding: '0.75rem',
                borderRadius: '3px',
                border: '1px solid var(--border-tactical)',
                borderLeft: '3px solid var(--accent-cyan-bright)',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                boxSizing: 'border-box',
              }}
            >
              {para}
            </p>
          ))
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem' }}>
            No narrative available. Click "RE-GENERATE" to generate an executive report summary.
          </div>
        )}
      </div>
    </div>
  );
};

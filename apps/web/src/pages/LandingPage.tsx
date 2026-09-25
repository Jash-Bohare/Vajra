import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();


  return (
    <div className="vajra-landing bg-canvas-obsidian text-on-surface font-body-md text-body-md selection:bg-primary selection:text-on-primary min-h-screen">
      <style>{`
        .vajra-landing * {
          box-sizing: border-box;
        }
        .vajra-landing a {
          color: inherit;
          text-decoration: none;
        }
        .vajra-landing button {
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
          background: transparent;
          border: none;
          color: inherit;
          padding: 0;
          margin: 0;
        }
        .vajra-landing ul, .vajra-landing ol {
          list-style: none;
          margin: 0;
          padding: 0;
        }
      `}</style>
      {/* ========================================== */}
      {/* 1. TACTICAL NAVIGATION BAR (Fixed Header)  */}
      {/* ========================================== */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#080d16]/95 backdrop-blur-md border-b border-[#182335]">
        <div className="h-16 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5 flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-[17px] font-sans">VAJRA</span>
                <span className="font-mono text-[11px] text-cyan-400 font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50">RT-CFAS</span>
              </div>
              <span className="hidden lg:inline-block font-mono text-slate-400 uppercase tracking-widest text-[9.5px]">
                Real-Time Crypto Fraud Attribution System
              </span>
            </div>

            <div className="hidden xl:flex items-center px-2.5 py-1 bg-[#0b121f] border border-cyan-900/40 rounded">
              <span className="font-mono text-cyan-400/90 tracking-wider text-[9.5px] font-semibold">
                [ GOVT LEA RESTRICTED // MHA &amp; I4C EDITION ]
              </span>
            </div>
          </div>

          {/* Navigation Links - Centered Tactical Command Bar */}
          <nav className="hidden md:flex items-center bg-[#0a101b] border border-[#1e2a3f] rounded-lg p-1 shadow-lg shadow-black/50">
            <button
              onClick={() => navigate('/intake')}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide text-slate-300 hover:text-white hover:bg-cyan-950/60 border border-transparent hover:border-cyan-500/40 transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-cyan-400 group-hover:scale-110 text-[18px] transition-transform">
                radar
              </span>
              <span className="font-mono uppercase tracking-wider text-[11px]">New Investigation</span>
            </button>

            <div className="h-4 w-px bg-[#1e293b] mx-1"></div>

            <button
              onClick={() => navigate('/history')}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide text-slate-300 hover:text-white hover:bg-cyan-950/60 border border-transparent hover:border-cyan-500/40 transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-cyan-400 group-hover:scale-110 text-[18px] transition-transform">
                folder_open
              </span>
              <span className="font-mono uppercase tracking-wider text-[11px]">Session History</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#071612] border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-mono text-emerald-400 uppercase font-semibold text-[10.5px] tracking-wider">
                NODE STATUS: ALL TRACERS ONLINE
              </span>
            </div>

            {/* Officer Avatar Symbol */}
            <button
              onClick={() => navigate('/history')}
              className="w-8 h-8 rounded-full bg-[#0a1220] border border-cyan-800/60 hover:border-cyan-400 ring-1 ring-cyan-500/20 flex items-center justify-center cursor-pointer transition-all hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              title="Investigator Profile (INV-7809)"
            >
              <span className="material-symbols-outlined text-cyan-400 text-[18px]">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* 2. HERO SECTION & GRAPH INTERACTION       */}
      {/* ========================================== */}
      <main className="w-full pt-16 bg-canvas-obsidian min-h-[calc(100vh-16rem)]">
        <section className="relative w-full overflow-hidden bg-canvas-obsidian px-gutter-lg pt-space-xl pb-margin-lg">
          {/* Ambient Glowing Conduits Background */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[980px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute top-1/4 right-0 w-[420px] h-[350px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container border border-primary/30 shadow-[0_0_18px_rgba(6,182,212,0.25)] mb-space-lg">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              <span className="font-label-code-sm text-label-code-sm text-primary tracking-widest uppercase text-[11px] font-bold">
                MINISTRY OF HOME AFFAIRS • I4C • SIH 2026 CYBER FORENSIC SUITE
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-status-verified animate-ping"></span>
            </div>

            {/* Main Headline */}
            <h1 className="font-headline-xl text-headline-xl lg:text-[54px] lg:leading-[60px] text-text-primary tracking-tight font-extrabold max-w-4xl">
              Stop Crypto Laundering at the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary">
                Exchange Gate
              </span>
              .
            </h1>

            {/* Sub-headline */}
            <p className="mt-space-md font-body-lg text-body-lg text-text-secondary max-w-2xl leading-relaxed">
              Autonomous multi-hop forensic tracing and instant Section 91 VASP freeze notices in under 1 minute. Built for Indian Cyber Crime Police Stations.
            </p>

            {/* Primary Action - Start Investigation Highlighted Button */}
            <div className="mt-space-lg flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/intake')}
                className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee 0%, #67e8f9 50%, #06b6d4 100%)',
                  color: '#020617',
                  boxShadow: '0 0 30px rgba(6, 182, 212, 0.7), 0 0 60px rgba(6, 182, 212, 0.3)',
                  border: '2px solid #a5f3fc',
                  outline: 'none',
                }}
              >
                <span className="material-symbols-outlined text-slate-950 text-[22px] group-hover:rotate-45 transition-transform duration-300">
                  radar
                </span>
                <span className="tracking-wider">Start a New Investigation</span>
                <span className="material-symbols-outlined text-slate-950 text-[20px] group-hover:translate-x-1.5 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 3. LIVE CAPABILITY METRICS TICKER         */}
        {/* ========================================== */}
        <section className="w-full bg-surface-container-low border-y border-border-tactical py-space-lg px-gutter-lg">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-md">
            <div className="flex flex-col p-space-sm bg-surface-container rounded border border-border-tactical/50">
              <span className="font-headline-xl text-headline-xl text-primary font-extrabold tracking-tight">&lt; 1 min</span>
              <span className="font-label-code-md text-label-code-md text-text-primary font-semibold mt-1">End-to-End Latency</span>
              <span className="font-body-sm text-body-sm text-text-muted mt-0.5">
                Automated complaint-to-freeze notice dispatch.
              </span>
            </div>

            <div className="flex flex-col p-space-sm bg-surface-container rounded border border-border-tactical/50">
              <span className="font-headline-xl text-headline-xl text-secondary font-extrabold tracking-tight">5-Hop BFS</span>
              <span className="font-label-code-md text-label-code-md text-text-primary font-semibold mt-1">Peeling Traversal</span>
              <span className="font-body-sm text-body-sm text-text-muted mt-0.5">
                Deep dispersion tracking with taint decay.
              </span>
            </div>

            <div className="flex flex-col p-space-sm bg-surface-container rounded border border-border-tactical/50">
              <span className="font-headline-xl text-headline-xl text-status-verified font-extrabold tracking-tight">10+ VASPs</span>
              <span className="font-label-code-md text-label-code-md text-text-primary font-semibold mt-1">Nodal Exchanges</span>
              <span className="font-body-sm text-body-sm text-text-muted mt-0.5">
                Direct contacts for Binance, OKX, Bybit &amp; domestic.
              </span>
            </div>

            <div className="flex flex-col p-space-sm bg-surface-container rounded border border-border-tactical/50">
              <span className="font-headline-xl text-headline-xl text-tertiary font-extrabold tracking-tight">Sec. 65B</span>
              <span className="font-label-code-md text-label-code-md text-text-primary font-semibold mt-1">Court Admissible</span>
              <span className="font-body-sm text-body-sm text-text-muted mt-0.5">
                Tamper-evident SHA-256 digital evidence certificate.
              </span>
            </div>

            <div className="flex flex-col p-space-sm bg-surface-container rounded border border-border-tactical/50 col-span-2 md:col-span-1">
              <span className="font-headline-xl text-headline-xl text-alert-warning font-extrabold tracking-tight">Multi-Asset</span>
              <span className="font-label-code-md text-label-code-md text-text-primary font-semibold mt-1">Token Coverage</span>
              <span className="font-body-sm text-body-sm text-text-muted mt-0.5">
                Native discovery for ETH, USDT, USDC, DAI &amp; WETH.
              </span>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 4. THE PROBLEM VS. THE BREAKTHROUGH       */}
        {/* ========================================== */}
        <section className="w-full bg-canvas-obsidian px-gutter-lg py-margin-lg" id="capabilities">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-xs max-w-3xl">
              <div className="flex items-center gap-space-xs text-primary font-label-code-sm text-label-code-sm font-bold uppercase tracking-widest text-[11px]">
                <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                <span>Tactical Disruption Analysis</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-text-primary font-bold">
                Why Legacy Crypto Investigation Fails in India
              </h2>
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                Fraud rings exploit the latency gap between police station FIR registration and manual exchange correspondence.
                VAJRA eliminates this window entirely.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
              {/* Left Column: Legacy Tracing */}
              <div className="rounded-xl bg-surface-container-lowest border border-alert-critical/30 p-space-lg flex flex-col gap-space-md relative overflow-hidden">
                <div className="flex items-center justify-between pb-space-sm border-b border-border-tactical">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-alert-critical text-[22px]">cancel</span>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                      The Current Baseline (Manual Legacy Tracing)
                    </h3>
                  </div>
                  <span className="font-label-code-sm text-label-code-sm text-alert-critical px-space-xs py-0.5 bg-alert-critical/10 rounded font-semibold text-[10px]">
                    LATENCY: 4 TO 12 HOURS
                  </span>
                </div>
                <ul className="flex flex-col gap-space-md">
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-alert-critical text-[18px] mt-0.5 flex-shrink-0">error</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Manual Spreadsheet Tracing
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Transcribing blockchain explorer addresses into spreadsheets loses track of rapid multi-branch fan-outs.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-alert-critical text-[18px] mt-0.5 flex-shrink-0">error</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Rapid Off-Ramping Exploited
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Syndicates off-ramp funds into P2P bank accounts in under 30 minutes, before manual freeze notices are sent.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-alert-critical text-[18px] mt-0.5 flex-shrink-0">error</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Pre-Crime Historical Clutter
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Without time-locks, legacy tools analyze years of irrelevant transactions, obscuring the active fraud trail.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-alert-critical text-[18px] mt-0.5 flex-shrink-0">error</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Evidence Inadmissible in Court
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Ad-hoc screenshots and unsealed PDFs fail Section 65B Indian Evidence Act scrutiny, collapsing prosecution.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Right Column: VAJRA Breakthrough */}
              <div className="rounded-xl bg-surface-container border border-primary/40 p-space-lg flex flex-col gap-space-md relative overflow-hidden shadow-[0_0_24px_rgba(6,182,212,0.15)]">
                <div className="flex items-center justify-between pb-space-sm border-b border-border-tactical">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[22px]">check_circle</span>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                      The VAJRA Breakthrough (Autonomous Sovereign Intel)
                    </h3>
                  </div>
                  <span className="font-label-code-sm text-label-code-sm text-status-verified px-space-xs py-0.5 bg-status-verified/10 rounded font-bold text-[10px]">
                    LATENCY: &lt; 1 MINUTE
                  </span>
                </div>
                <ul className="flex flex-col gap-space-md">
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">bolt</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Automated 5-Hop BFS Graph Engine
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Unrolls complex peeling chains across 5 hops in parallel, tracking intermediary mules and mixers.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">gavel</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        1-Click Section 91 CrPC Notices
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Instant statutory freeze directives pre-addressed to verified legal contacts of identified exchanges.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">schedule</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Temporal Lock Forensics (TLFT)
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Strictly isolates transactions following the FIR timestamp, eliminating irrelevant historical noise.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">verified</span>
                    <div>
                      <strong className="font-body-md text-body-md text-text-primary font-semibold block">
                        Certified Section 65B Electronic Dossier
                      </strong>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                        Generates court-ready PDF evidence dossiers with SHA-256 integrity chains and complete officer attestation.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 5. 4-STAGE FORENSIC PIPELINE              */}
        {/* ========================================== */}
        <section className="w-full bg-surface-container-low px-gutter-lg py-margin-lg border-y border-border-tactical" id="pipeline">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
            <div className="flex flex-col gap-space-xs text-center items-center">
              <span className="px-space-sm py-0.5 rounded bg-surface-container border border-border-tactical text-primary font-label-code-sm text-label-code-sm uppercase tracking-widest text-[11px] font-bold">
                Sovereign Investigative Workflow
              </span>
              <h2 className="font-headline-lg text-headline-lg text-text-primary font-bold">
                4-Stage Autonomous Forensic Pipeline
              </h2>
              <p className="font-body-md text-body-md text-text-secondary max-w-2xl">
                Engineered to match official LEA Standard Operating Procedures (SOPs) from initial FIR filing to courtroom
                prosecution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md relative">
              {/* Stage 1 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical hover:border-primary/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-code-lg text-label-code-lg text-primary font-bold">01</span>
                    <span className="material-symbols-outlined text-primary text-[22px]">fingerprint</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold mb-space-xs">
                    Ingestion &amp; Epoch Calibrate
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    Investigator inputs suspect address and FIR crime timestamp. Temporal gating immediately eliminates pre-fraud
                    transactions.
                  </p>
                </div>
                <div className="mt-space-md pt-space-sm border-t border-border-tactical/60 font-label-code-sm text-label-code-sm text-text-muted">
                  <span className="text-primary font-mono">TLFT Engine</span> • Noise Stripped
                </div>
              </div>

              {/* Stage 2 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical hover:border-secondary/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-code-lg text-label-code-lg text-secondary font-bold">02</span>
                    <span className="material-symbols-outlined text-secondary text-[22px]">radar</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold mb-space-xs">
                    Multi-Asset Discovery
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    Deep scans native ETH alongside ERC-20 event logs (USDT, USDC, DAI) to map entire balances and unmask contract
                    wrappers.
                  </p>
                </div>
                <div className="mt-space-md pt-space-sm border-t border-border-tactical/60 font-label-code-sm text-label-code-sm text-text-muted">
                  <span className="text-secondary font-mono">Token Logs</span> • USD/INR Oracle
                </div>
              </div>

              {/* Stage 3 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical hover:border-tertiary/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-code-lg text-label-code-lg text-tertiary font-bold">03</span>
                    <span className="material-symbols-outlined text-tertiary text-[22px]">hub</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold mb-space-xs">
                    Multi-Branch BFS Engine
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    Traces dispersion peeling chains across 5 hops in parallel, maintaining rigorous taint calculations through mixer
                    hops.
                  </p>
                </div>
                <div className="mt-space-md pt-space-sm border-t border-border-tactical/60 font-label-code-sm text-label-code-sm text-text-muted">
                  <span className="text-tertiary font-mono">BFS Traversal</span> • &lt; 2.2s Execution
                </div>
              </div>

              {/* Stage 4 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical hover:border-status-verified/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-code-lg text-label-code-lg text-status-verified font-bold">04</span>
                    <span className="material-symbols-outlined text-status-verified text-[22px]">gavel</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold mb-space-xs">
                    Subpoena &amp; Sec 65B Dossier
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                    Auto-formats Section 91 CrPC freeze directive for identified exchanges and binds the evidence chain into a
                    court-ready dossier.
                  </p>
                </div>
                <div className="mt-space-md pt-space-sm border-t border-border-tactical/60 font-label-code-sm text-label-code-sm text-text-muted">
                  <span className="text-status-verified font-mono">Sec 65B Sealed</span> • 1-Click PDF
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 6. CORE TECHNICAL CAPABILITIES (Bento)    */}
        {/* ========================================== */}
        <section className="w-full bg-canvas-obsidian px-gutter-lg py-margin-lg">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <span className="text-primary font-label-code-sm text-label-code-sm uppercase tracking-widest font-bold text-[11px]">
                Architecture Specs
              </span>
              <h2 className="font-headline-lg text-headline-lg text-text-primary font-bold">Defense-Grade Core Capabilities</h2>
              <p className="font-body-md text-body-md text-text-secondary max-w-3xl">
                Engineered without external commercial API dependencies. Self-hosted high-throughput nodes and local deterministic
                graph intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {/* Card 1 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-primary text-[24px]">account_tree</span>
                    <span className="font-label-code-sm text-label-code-sm text-primary px-space-xs py-0.5 rounded bg-surface-container-lowest text-[10px]">
                      CONCURRENCY: 32 THREADS
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Multi-Branch BFS Engine</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Navigates non-linear money laundering topologies, fan-outs, and peeling chains up to 5 hops deep with weighted
                    root taint preservation.
                  </p>
                </div>
                <div className="mt-space-md p-space-xs rounded bg-surface-container-lowest font-mono text-[11px] text-text-muted">
                  // T_decay = (V_tx / V_total) * (1 - α)^hop
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-secondary text-[24px]">domain</span>
                    <span className="font-label-code-sm text-label-code-sm text-secondary px-space-xs py-0.5 rounded bg-surface-container-lowest text-[10px]">
                      INDEX: 4.8M CLUSTERS
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">VASP Attribution Directory</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Deterministic cluster matching of exchange hot wallets, cold reserves, and smart contract deposit routers across
                    top global platforms.
                  </p>
                </div>
                <div className="mt-space-md p-space-xs rounded bg-surface-container-lowest font-mono text-[11px] text-text-muted">
                  // Match confidence: 99.84% (Deterministic tag)
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-status-verified text-[24px]">history_toggle_off</span>
                    <span className="font-label-code-sm text-label-code-sm text-status-verified px-space-xs py-0.5 rounded bg-surface-container-lowest text-[10px]">
                      TLFT PROTOCOL
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Temporal Gating (TLFT)</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Isolates the crime epoch by eliminating any inbound/outbound transactions preceding the registered FIR incident
                    timestamp.
                  </p>
                </div>
                <div className="mt-space-md p-space-xs rounded bg-surface-container-lowest font-mono text-[11px] text-text-muted">
                  // Gating: FILTER WHERE block_time &gt;= T_incident
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-alert-warning text-[24px]">crisis_alert</span>
                    <span className="font-label-code-sm text-label-code-sm text-alert-warning px-space-xs py-0.5 rounded bg-surface-container-lowest text-[10px]">
                      HEURISTICS V3
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Heuristic Risk Microservice</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Instant rule-based detection for rapid asset forwarding (&lt; 90 seconds), ephemeral burner addresses, and
                    decentralized mixer protocols.
                  </p>
                </div>
                <div className="mt-space-md p-space-xs rounded bg-surface-container-lowest font-mono text-[11px] text-text-muted">
                  // Risk flags: RAPID_FWD | PEEL_CHAIN | TORNADO_RELAY
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-tertiary text-[24px]">policy</span>
                    <span className="font-label-code-sm text-label-code-sm text-tertiary px-space-xs py-0.5 rounded bg-surface-container-lowest text-[10px]">
                      STATUTORY READY
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Section 65B Legal Dossier</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Instant programmatic export of evidentiary packets with tamper-evident digital signatures and block state
                    cryptographic verification.
                  </p>
                </div>
                <div className="mt-space-md p-space-xs rounded bg-surface-container-lowest font-mono text-[11px] text-text-muted">
                  // Sign: SHA256-RSA-4096-I4C-AUTHORITY
                </div>
              </div>

              {/* Card 6 */}
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-primary text-[24px]">database</span>
                    <span className="font-label-code-sm text-label-code-sm text-primary px-space-xs py-0.5 rounded bg-surface-container-lowest text-[10px]">
                      POSTGRES JSONB
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Immutable Point-in-Time Graph</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Every query freezes transaction state and USD/INR exchange rates at the exact block depth to prevent courtroom
                    defense contention.
                  </p>
                </div>
                <div className="mt-space-md p-space-xs rounded bg-surface-container-lowest font-mono text-[11px] text-text-muted">
                  // Snapshot Hash: 0x9f88...31cc [STAMPED]
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* ========================================== */}
        {/* 8. LEGAL COMPLIANCE & EVIDENCE STANDARDS  */}
        {/* ========================================== */}
        <section className="w-full bg-canvas-obsidian px-gutter-lg py-margin-lg" id="dossier">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
            <div className="flex flex-col gap-space-xs max-w-3xl">
              <span className="text-status-verified font-label-code-sm text-label-code-sm uppercase font-bold tracking-widest text-[11px]">
                Statutory Validity &amp; Court Admissibility
              </span>
              <h2 className="font-headline-lg text-headline-lg text-text-primary font-bold">
                Strict Adherence to Indian Law &amp; Evidence Standards
              </h2>
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                Forensic outputs engineered to withstand hostile cross-examination in Sessions Courts, High Courts, and Special PMLA
                tribunals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Section 65B Indian Evidence Act</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Cryptographically verified electronic record certificate with complete hardware metadata, execution hashes, and
                    officer attestation signatures.
                  </p>
                </div>
                <div className="mt-space-md pt-space-xs border-t border-border-tactical text-primary font-label-code-sm text-label-code-sm font-semibold text-[11px]">
                  Certified Electronic Record
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[28px]">gavel</span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">Section 91 CrPC Compliance</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Pre-structured summons templates to compel production of VASP KYC records, login IP logs, and immediate
                    transaction ledger freezing.
                  </p>
                </div>
                <div className="mt-space-md pt-space-xs border-t border-border-tactical text-secondary font-label-code-sm text-label-code-sm font-semibold text-[11px]">
                  Mandatory VASP Production
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <span className="material-symbols-outlined text-tertiary text-[28px]">security</span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">ISO/IEC 27037 Standard</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Conforms strictly to international forensic digital evidence handling: Identification, Collection, Acquisition,
                    and Preservation.
                  </p>
                </div>
                <div className="mt-space-md pt-space-xs border-t border-border-tactical text-tertiary font-label-code-sm text-label-code-sm font-semibold text-[11px]">
                  Global Chain-of-Custody
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div className="flex flex-col gap-space-xs">
                  <span className="material-symbols-outlined text-status-verified text-[28px]">local_police</span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">I4C / MHA NCRP Integration</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Direct JSON export compatible with the National Cybercrime Reporting Portal (NCRP) and state cyber cell evidence
                    archives.
                  </p>
                </div>
                <div className="mt-space-md pt-space-xs border-t border-border-tactical text-status-verified font-label-code-sm text-label-code-sm font-semibold text-[11px]">
                  National Portal Synced
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 9. VASP COMPLIANCE DIRECTORY (10 Cards)    */}
        {/* ========================================== */}
        <section className="w-full bg-surface-container-low px-gutter-lg py-margin-lg border-y border-border-tactical" id="vasp-catalog">
          <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
              <div className="flex flex-col gap-space-xs">
                <span className="text-primary font-label-code-sm text-label-code-sm uppercase font-bold tracking-widest text-[11px]">
                  Interdiction Directory
                </span>
                <h2 className="font-headline-lg text-headline-lg text-text-primary font-bold">Active Nodal Exchange Desks</h2>
              </div>
              <div className="font-label-code-sm text-label-code-sm text-status-verified flex items-center gap-1 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-status-verified"></span>
                <span>ALL DESKS ACTIVE WITH SUB-4H SLA</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm">
              {/* VASP 1: Binance */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">Binance</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Govt Relations Desk</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 2h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>

              {/* VASP 2: OKX */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">OKX</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Law Enforcement Portal</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 2h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>

              {/* VASP 3: Coinbase */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">Coinbase</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Subpoena Services Unit</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 4h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>

              {/* VASP 4: Bybit */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">Bybit</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Compliance Legal Liaison</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 3h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>

              {/* VASP 5: KuCoin */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">KuCoin</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Investigation Response</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 4h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>

              {/* VASP 6: CoinDCX */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">CoinDCX</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">FIU-IND Domestic Nodal</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 30m</span>
                  <span className="text-status-verified font-bold">INSTANT FREEZE</span>
                </div>
              </div>

              {/* VASP 7: WazirX */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">WazirX</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Nodal Officer Hotdesk</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 45m</span>
                  <span className="text-status-verified font-bold">INSTANT FREEZE</span>
                </div>
              </div>

              {/* VASP 8: CoinSwitch */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">CoinSwitch</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Law Enforcement Portal</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 30m</span>
                  <span className="text-status-verified font-bold">INSTANT FREEZE</span>
                </div>
              </div>

              {/* VASP 9: Kraken */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">Kraken</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">Global Compliance LEA</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 3h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>

              {/* VASP 10: Gate.io */}
              <div className="p-space-sm rounded bg-surface-container border border-border-tactical flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">Gate.io</span>
                    <span className="material-symbols-outlined text-status-verified text-[18px]">verified</span>
                  </div>
                  <div className="font-label-code-sm text-label-code-sm text-text-muted mt-1 text-[11px]">International Legal Ops</div>
                </div>
                <div className="mt-space-sm pt-space-xs border-t border-border-tactical flex items-center justify-between font-label-code-sm text-label-code-sm text-[10px]">
                  <span className="text-text-muted">SLA: &lt; 4h</span>
                  <span className="text-status-verified font-bold">SUBPOENA READY</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ========================================== */}
      {/* 11. TACTICAL SEPARATOR & FOOTER            */}
      {/* ========================================== */}
      {/* Glowing Horizon Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent"></div>

      {/* Status Ribbon */}
      <div className="w-full bg-[#050811] border-b border-[#141d2e] py-3 px-gutter-lg flex flex-wrap items-center justify-between gap-space-sm text-label-code-sm font-label-code-sm text-[11px]">
        <div className="flex items-center gap-space-md text-text-muted">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>SYSTEM ROOT // ALL CLUSTERS ONLINE</span>
          </div>
          <span className="hidden sm:inline text-border-tactical">•</span>
          <span className="hidden sm:inline">SEC-65B EVIDENCE VAULT ACTIVE</span>
          <span className="hidden md:inline text-border-tactical">•</span>
          <span className="hidden md:inline">AIR-GAPPED TELEMETRY SYNCED</span>
        </div>
        <div className="flex items-center gap-space-sm text-text-muted">
          <span className="text-status-verified font-bold">100% SOVEREIGN</span>
          <span className="text-border-tactical">|</span>
          <span className="text-text-secondary">SIH 2026 CYBER FORENSIC SUITE</span>
        </div>
      </div>

      {/* Distinct Tactical Footer */}
      <footer className="w-full bg-[#04060c] pt-space-xl pb-space-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06)_0,transparent_55%)] pointer-events-none"></div>

        <div className="relative w-full px-gutter-lg">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter-lg pb-space-lg border-b border-[#162032]">
            {/* Col 1: Identity & Mandate */}
            <div className="md:col-span-5 flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight font-bold">
                  VAJRA
                </span>
                <span className="font-mono text-[11px] text-cyan-400 font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50">
                  RT-CFAS
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-muted leading-relaxed max-w-md">
                Real-Time Crypto Fraud Attribution System. Purpose-built for the Ministry of Home Affairs (MHA) and Indian Cyber Crime Coordination Centre (I4C).
              </p>
              <div className="flex items-center gap-space-xs text-status-verified text-[11px] font-mono">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>SHA-256 INTEGRITY CHAIN VERIFIED // TAMPER-EVIDENT</span>
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="md:col-span-3 flex flex-col gap-space-xs">
              <span className="font-mono text-text-primary font-bold uppercase tracking-wider text-[11px] mb-1">
                Investigation Portal
              </span>
              <nav className="flex flex-col gap-1.5 font-body-sm text-body-sm">
                <button
                  onClick={() => navigate('/intake')}
                  className="text-text-muted hover:text-primary transition-colors text-left cursor-pointer flex items-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[15px] group-hover:translate-x-0.5 transition-transform">radar</span>
                  <span>New Investigation Intake</span>
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="text-text-muted hover:text-primary transition-colors text-left cursor-pointer flex items-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[15px] group-hover:translate-x-0.5 transition-transform">folder_open</span>
                  <span>Session History &amp; Records</span>
                </button>
                <a
                  href="#capabilities"
                  className="text-text-muted hover:text-primary transition-colors text-left flex items-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[15px] group-hover:translate-x-0.5 transition-transform">compare_arrows</span>
                  <span>Tactical Disruption Specs</span>
                </a>
                <a
                  href="#vasp-catalog"
                  className="text-text-muted hover:text-primary transition-colors text-left flex items-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-primary text-[15px] group-hover:translate-x-0.5 transition-transform">domain</span>
                  <span>VASP Exchange Catalog</span>
                </a>
              </nav>
            </div>

            {/* Col 3: System Audit Badges */}
            <div className="md:col-span-4 flex flex-col gap-space-xs">
              <span className="font-mono text-text-primary font-bold uppercase tracking-wider text-[11px] mb-1">
                System Audit &amp; Nodes
              </span>
              <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex justify-between py-1 px-2.5 rounded bg-[#090f1a] border border-[#162236]">
                  <span className="text-text-muted">CLUSTER HASH</span>
                  <span className="text-primary font-semibold">SHA-256: 8F2A...E491</span>
                </div>
                <div className="flex justify-between py-1 px-2.5 rounded bg-[#090f1a] border border-[#162236]">
                  <span className="text-text-muted">STATUTORY STANDARD</span>
                  <span className="text-status-verified font-semibold">SEC-65B EVIDENCE ACT</span>
                </div>
                <div className="flex justify-between py-1 px-2.5 rounded bg-[#090f1a] border border-[#162236]">
                  <span className="text-text-muted">CHAIN MONITOR</span>
                  <span className="text-text-primary font-semibold">34 CHAINS SYNCHRONIZED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Compliance Strip */}
          <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm text-[11px]">
            <div className="flex items-center gap-2 text-alert-warning font-mono">
              <span className="material-symbols-outlined text-[16px] flex-shrink-0">gavel</span>
              <span>
                GOVT LEA RESTRICTED — Authorized Law Enforcement &amp; Cyber Forensic Personnel Only.
              </span>
            </div>
            <div className="font-mono text-text-muted">
              &copy; 2026 MHA / I4C • SIH 2026 Defense Cyber Suite
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};


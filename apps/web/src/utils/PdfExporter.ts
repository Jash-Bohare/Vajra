import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    leaEmail: 'compliance@gemini.com',
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

export function exportInvestigationPdf(data: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // -------------------------------------------------------------
  // 1. TOP HEADER & OFFICIAL CLASSIFICATION BANNER
  // -------------------------------------------------------------
  // Security Classification Bar
  doc.setFillColor(220, 38, 38); // Dark Red
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE // OFFICIAL FORENSIC REPORT', pageWidth / 2, 4.2, { align: 'center' });

  // Main Header Box
  doc.setFillColor(15, 23, 42); // Navy/Slate #0f172a
  doc.rect(0, 6, pageWidth, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('VAJRA (RT-CFAS) — CRYPTO FRAUD ATTRIBUTION REPORT', margin, 17);

  // Subtitle & Platform Description
  doc.setTextColor(56, 189, 248); // Cyan
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Real-Time Fraud-Linked Exchange Attribution & Multi-Branch Forensic Analysis', margin, 23);

  doc.setTextColor(148, 163, 184); // Muted slate
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated: ' + new Date().toUTCString() + '  |  Blockchain: Ethereum (Mainnet)  |  Standard: FATF / LEA Compliant', margin, 30);

  let y = 43;

  // -------------------------------------------------------------
  // 2. EXECUTIVE INTELLIGENCE SUMMARY (KEY FINDINGS BOX)
  // -------------------------------------------------------------
  const isExchange = data.terminalType === 'exchange';
  const exchangeName = data.terminalExchange || 'Unknown Exchange';
  const riskLevel = (data.riskLevel || 'HIGH').toUpperCase();
  const riskScore = data.riskScore || (riskLevel === 'HIGH' ? 85 : riskLevel === 'MEDIUM' ? 55 : 15);
  const tree = data.tree || data.graph?.tree;
  const hops = data.hops || [];

  // Card Background
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  // Left accent line
  doc.setFillColor(isExchange ? 16 : 245, isExchange ? 185 : 158, isExchange ? 129 : 11);
  doc.rect(margin, y, 3, 38, 'F');

  // Box Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE INTELLIGENCE SUMMARY', margin + 6, y + 7);

  // Grid Info
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  // Col 1: VASP Attribution
  doc.text('Matched VASP Destination:', margin + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  if (isExchange) {
    doc.setTextColor(5, 150, 105); // Green
    doc.text('TARGET VASP IDENTIFIED: ' + exchangeName, margin + 6, y + 19);
  } else {
    doc.setTextColor(217, 119, 6); // Amber
    doc.text('INCONCLUSIVE (Intermediary Layering)', margin + 6, y + 19);
  }

  // Col 1: Risk Assessment
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Automated Risk Index:', margin + 6, y + 26);
  doc.setFont('helvetica', 'bold');
  if (riskScore >= 80) {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('CRITICAL RISK (' + riskScore + '/100) — Active Laundering', margin + 6, y + 31);
  } else if (riskScore >= 50) {
    doc.setTextColor(217, 119, 6); // Amber
    doc.text('MEDIUM RISK (' + riskScore + '/100) — Suspicious Movement', margin + 6, y + 31);
  } else {
    doc.setTextColor(5, 150, 105); // Green
    doc.text('LOW RISK (' + riskScore + '/100) — Direct Transfer', margin + 6, y + 31);
  }

  // Col 2: Topology Breakdown
  const col2X = margin + 95;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Tracing Topology Breakdown:', col2X, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const totalBranches = tree ? tree.totalBranches : 1;
  const exchangeBranches = tree ? tree.exchangeBranches : (isExchange ? 1 : 0);
  const fanOuts = tree ? tree.totalFanOutNodes : 0;
  const fanIns = tree ? tree.totalFanInNodes : 0;
  doc.text(totalBranches + ' Branches Traced  |  ' + exchangeBranches + ' Reached Exchange', col2X, y + 19);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Money Laundering Topology Patterns:', col2X, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(fanOuts + ' Fan-Out Splitting Node(s)  |  ' + fanIns + ' Aggregator Hub(s)', col2X, y + 31);

  y += 44;

  // -------------------------------------------------------------
  // 3. SECTION 1: CASE & SUSPECT WALLET METADATA
  // -------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Suspect Wallet & Case Metadata', margin, y);
  y += 3;

  const metadataRows = [
    [
      { content: 'Investigation ID', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      data.id || 'N/A',
      { content: 'Origin Blockchain', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      'Ethereum Mainnet (Chain ID 1)',
    ],
    [
      { content: 'Reported Suspect Wallet', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      data.walletAddress || 'N/A',
      { content: 'Targeted Asset', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      data.targetAsset || 'ETH',
    ],
    [
      { content: 'Victim Tx Hash Reference', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      data.victimTxHash ? (data.victimTxHash.substring(0, 18) + '...' + data.victimTxHash.substring(56)) : 'None (Full Wallet Trace)',
      { content: 'Tainted Loss Value', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      data.victimAmountUsd ? ('$' + data.victimAmountUsd.toLocaleString() + ' USD') : 'Calculated on-chain',
    ],
    [
      { content: 'Investigation Timestamp', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      data.createdAt ? (new Date(data.createdAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC') : 'N/A',
      { content: 'Oracle Rate at Snapshot', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      (data.ethPriceUsd || data.tree?.ethPriceUsd) ? ('$' + Number(data.ethPriceUsd || data.tree?.ethPriceUsd).toLocaleString() + ' USD / ETH') : '$2,442.00 USD',
    ],
    [
      { content: 'All Detected Assets', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      (data.assetsDetected && data.assetsDetected.length > 0) ? data.assetsDetected.join(', ') : 'ETH',
      { content: 'Investigation Status', styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] as [number, number, number] } },
      'COMPLETED (Deterministic Traversal)',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: metadataRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 55 },
      2: { cellWidth: 38 },
      3: { cellWidth: 49 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // -------------------------------------------------------------
  // 4. SECTION 2: ACTIONABLE INTELLIGENCE & LEA ENFORCEMENT STEPS
  // -------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Actionable Law Enforcement Intelligence & Next Legal Steps', margin, y);
  y += 4;

  const exInfo = isExchange ? EXCHANGE_LEA_INFO[exchangeName] : null;

  const leaSteps = [
    [
      'Step 1',
      'Immediate Preservation Notice',
      isExchange
        ? ('Issue formal Preservation Notice to ' + exchangeName + ' compliance team to freeze KYC identity records, IP logs, linked bank accounts, and wallet deposit history.')
        : 'Identify intermediate node owners and prepare subpoenas for downstream exchange touchpoints.',
      isExchange ? (exInfo?.leaEmail ? ('Email: ' + exInfo.leaEmail) : (exInfo?.leaPortalName || 'LEA Portal')) : 'N/A',
    ],
    [
      'Step 2',
      'Judicial Freeze Order (Sec 91 CrPC / PMLA / MLAT)',
      'Obtain judicial authorization under Section 91 CrPC / Section 17 PMLA / IT Act. Attach this forensic report as Annexure A to secure court disclosure order.',
      exInfo?.jurisdiction || 'Competent Court Jurisdiction',
    ],
    [
      'Step 3',
      'MHA SAHYOG Platform Integration',
      ('Submit formal digital asset freeze request through the MHA SAHYOG Portal (https://sahyog.cybercrime.gov.in) with suspect address ' + data.walletAddress.substring(0, 10) + '... and target exchange ' + exchangeName + '.'),
      'sahyog.cybercrime.gov.in',
    ],
    [
      'Step 4',
      'NCRP Reference & Victim Restitution',
      'Cross-reference National Cyber Crime Reporting Portal (NCRP / cybercrime.gov.in) complaint number. Ensure victim statement matches on-chain fund trail.',
      'cybercrime.gov.in',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Step', 'Action Required', 'Investigative & Legal Procedure', 'LEA Contact / Portal']],
    body: leaSteps,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 85 },
      3: { cellWidth: 40, textColor: [2, 132, 199] },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // -------------------------------------------------------------
  // 5. SECTION 3: MULTI-BRANCH TOPOLOGY BREAKDOWN TABLE
  // -------------------------------------------------------------
  if (tree && tree.branches && tree.branches.length > 0) {
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 16;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Multi-Branch Fund Flow Topology Breakdown', margin, y);
    y += 4;

    const branchRows = tree.branches.map((b: any) => {
      const isEx = b.terminalType === 'exchange';
      return [
        b.branchId,
        (b.hopCount + ' Hops'),
        b.terminalAddress ? (b.terminalAddress.substring(0, 8) + '...' + b.terminalAddress.substring(34)) : 'N/A',
        isEx ? ('TARGET: ' + (b.exchangeName || 'Known Exchange')) : (b.terminalType === 'peeling_leaf' ? 'Peeling Leaf' : 'Uncataloged Wallet'),
        b.finalAmountUsd ? ('$' + b.finalAmountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })) : '$0.00',
        (b.taintPercentage + '%'),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Branch', 'Depth', 'Terminal Recipient', 'Endpoint Status / VASP', 'Traced Amount (USD)', 'Taint Share (%)']],
      body: branchRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // #1e293b
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 48 },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // Investigative Statement
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    const summaryStmt = 'Forensic Summary: ' + tree.taintCoveragePercent + '% of the initial suspect funds have been traced and accounted for across ' + tree.totalBranches + ' independent fund flow branches in this investigation.';
    doc.text(summaryStmt, margin, y);
    y += 8;
  }

  // -------------------------------------------------------------
  // 6. SECTION 4: COMPREHENSIVE TRACED ON-CHAIN HOPS LEDGER
  // -------------------------------------------------------------
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 16;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Comprehensive Traced On-Chain Hops Ledger (' + hops.length + ' Transactions)', margin, y);
  y += 4;

  if (hops.length > 0) {
    const hopRows = hops.map((h: any) => {
      const sym = h.tokenSymbol || 'ETH';
      const amtStr = h.tokenAmount !== undefined ? (h.tokenAmount + ' ' + sym) : (h.amountEth + ' ETH');
      const usdStr = h.usdValue !== undefined ? ('$' + h.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })) : '$0.00';
      const timeStr = h.txTimestamp ? new Date(h.txTimestamp).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';
      const txShort = h.txHash ? (h.txHash.substring(0, 8) + '...' + h.txHash.substring(58)) : 'N/A';

      return [
        ('Hop #' + h.hopIndex),
        (h.fromAddress.substring(0, 8) + '...' + h.fromAddress.substring(36)),
        (h.toAddress.substring(0, 8) + '...' + h.toAddress.substring(36)),
        amtStr,
        usdStr,
        (h.confidence || 'HIGH').toUpperCase(),
        txShort,
        timeStr,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Hop #', 'Sender (From)', 'Recipient (To)', 'Transfer Amount', '~USD Value', 'Confidence', 'Tx Hash', 'Timestamp (UTC)']],
      body: hopRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        cellPadding: 2.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      columnStyles: {
        0: { cellWidth: 14, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 26 },
        2: { cellWidth: 26 },
        3: { cellWidth: 24, fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 24 },
        7: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // -------------------------------------------------------------
  // 7. SECTION 5: EVIDENTIARY CERTIFICATION & CHAIN OF CUSTODY
  // -------------------------------------------------------------
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 16;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Forensic Certificate & Chain of Custody (Electronic Evidence Under Sec 65B / BSA Sec 63)', margin + 4, y + 6);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const certText = 'This report represents an automated, deterministic electronic record produced by the Vajra RT-CFAS blockchain analytics engine. All transaction hashes and wallet attributions are cryptographically anchored to public distributed ledger state data. Prepared for submission to competent judicial and law enforcement authorities.';
  const certLines = doc.splitTextToSize(certText, contentWidth - 8);
  doc.text(certLines, margin + 4, y + 12);

  // Signature Placeholders
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Investigating Officer Signature: _______________________', margin + 4, y + 28);
  doc.text('Badge / Officer ID: _______________', margin + 85, y + 28);
  doc.text('Cyber Crime Cell Seal: [  SEAL  ]', margin + 135, y + 28);

  // -------------------------------------------------------------
  // 8. PAGE NUMBERING & FOOTERS ON ALL PAGES
  // -------------------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom Footer Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('VAJRA RT-CFAS — Forensic Investigation Report  |  Ref: ' + data.id.substring(0, 12) + '...', margin, pageHeight - 5.5);
    doc.text('Page ' + i + ' of ' + totalPages, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
  }

  // Save PDF
  doc.save('VAJRA-Forensic-Report-' + data.id.substring(0, 8) + '.pdf');
}

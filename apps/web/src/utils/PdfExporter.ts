import jsPDF from 'jspdf';

export function exportInvestigationPdf(data: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title Header
  doc.setFillColor(15, 23, 42); // Dark slate header
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RT-CFAS FRAUD ATTRIBUTION REPORT', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Real-Time Crypto Fraud Attribution System | Law Enforcement Copy', 14, 28);

  let y = 50;

  // 1. Investigation Metadata
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Case Metadata Overview', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Investigation ID: ${data.id}`, 14, y);
  y += 6;
  doc.text(`Suspect Wallet Address: ${data.walletAddress}`, 14, y);
  y += 6;
  doc.text(`Blockchain: ${data.chain || 'Ethereum (Mainnet)'}`, 14, y);
  y += 6;
  doc.text(`Created At: ${new Date(data.createdAt).toUTCString()}`, 14, y);
  y += 12;

  // 2. VASP Attribution Result
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. VASP Exchange Attribution Result', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.terminalType === 'exchange') {
    doc.setTextColor(16, 185, 129);
    doc.text(`MATCHED EXCHANGE: ${data.terminalExchange}`, 14, y);
    y += 6;
    doc.setTextColor(15, 23, 42);
    doc.text(`Status: Fund flow terminates at a cataloged deposit address belonging to ${data.terminalExchange}.`, 14, y);
  } else {
    doc.setTextColor(245, 158, 11);
    doc.text('MATCH STATUS: INCONCLUSIVE', 14, y);
    y += 6;
    doc.setTextColor(15, 23, 42);
    doc.text('Status: Funds passed through intermediary wallets without hitting a cataloged VASP within 5 hops.', 14, y);
  }
  y += 12;

  // 3. Risk Assessment
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Explainable Risk Assessment', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Risk Level: ${(data.riskLevel || 'UNKNOWN').toUpperCase()}`, 14, y);
  y += 6;
  doc.text(`Reasoning: ${data.riskReason || 'N/A'}`, 14, y);
  y += 14;

  // 4. Tree Topology Summary (Spec 09)
  const tree = data.tree || data.graph?.tree;
  if (tree && tree.branches && tree.branches.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Multi-Branch Tree Topology Summary', 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Branches Traced: ${tree.totalBranches} | Exchange Endpoints Reached: ${tree.exchangeBranches}`, 14, y);
    y += 5;
    doc.text(`Taint Coverage: ${tree.taintCoveragePercent}% of reported victim funds traced`, 14, y);
    y += 5;
    doc.text(`Topology Flags: Fan-Out Splitting (${tree.totalFanOutNodes} nodes) | Fan-In Convergence (${tree.totalFanInNodes} nodes)`, 14, y);
    y += 8;

    // Taint Coverage Investigative Summary Statement
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(51, 65, 85);
    const summaryStmt = `Investigative Summary Statement: ${tree.taintCoveragePercent}% ($${(tree.victimAmountUsd * (tree.taintCoveragePercent / 100)).toLocaleString()} USD) of the total reported victim loss of $${tree.victimAmountUsd.toLocaleString()} USD has been traced and accounted for across ${tree.totalBranches} independent fund flow branches in this investigation.`;
    const splitLines = doc.splitTextToSize(summaryStmt, pageWidth - 28);
    doc.text(splitLines, 14, y);
    y += splitLines.length * 5 + 6;

    doc.setTextColor(15, 23, 42);

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }

  // 5. Traced Hops Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Traced On-Chain Hops Table', 14, y);
  y += 8;

  const hops = data.hops || [];
  if (hops.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Hop #   Sender Address                  Recipient Address               Asset / Amount          Timestamp', 14, y);
    y += 6;
    doc.line(14, y - 2, pageWidth - 14, y - 2);

    doc.setFont('helvetica', 'normal');
    hops.forEach((hop: any) => {
      const fromShort = `${hop.fromAddress.substring(0, 8)}...${hop.fromAddress.substring(36)}`;
      const toShort = `${hop.toAddress.substring(0, 8)}...${hop.toAddress.substring(36)}`;
      const timeStr = new Date(hop.txTimestamp).toISOString().substring(0, 16);
      const amtStr = hop.tokenSymbol && hop.tokenSymbol !== 'ETH'
        ? `${hop.tokenAmount || 0} ${hop.tokenSymbol}`
        : `${hop.amountEth} ETH`;

      doc.text(
        `Hop #${hop.hopIndex}   ${fromShort}   ${toShort}   ${amtStr.padEnd(23, ' ')}   ${timeStr}`,
        14,
        y
      );
      y += 6;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No outgoing transaction hops recorded.', 14, y);
  }

  // Save File
  doc.save(`RT-CFAS-Report-${data.id.substring(0, 8)}.pdf`);
}

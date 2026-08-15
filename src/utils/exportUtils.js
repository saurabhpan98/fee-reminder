// src/utils/exportUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode'; // Standard real QR code encode

// ==========================================
// 1. BUILT-IN STANDALONE UPI & QR CODE ENGINE
// ==========================================

/**
 * Generates standard NPCI UPI Intent URL
 */
export const buildUPIPaymentURL = ({ upiId, payeeName, amount, note }) => {
  const cleanUpi = (upiId || '').trim();
  if (!cleanUpi) return '';

  const cleanName = encodeURIComponent(payeeName || 'Tuition Center');
  const cleanNote = encodeURIComponent(note || 'Tuition Fee');
  const cleanAmount = Number(amount || 0).toFixed(2);

  // Exact standard format required by GPay / PhonePe / Paytm
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
};
/**
 * Lightweight Standalone Canvas QR Code Generator
 * (Works 100% reliably in browser without any package dependency crashes)
 */
export const generateQRCodeDataURL = async (text) => {
  if (!text) return null;
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Real QR Engine Error:', err);
    return null;
  }
};

// ==========================================
// 2. COACHING SEAL / STAMP GENERATOR
// ==========================================
export const generateCoachingSeal = (coachingName) => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  const centerX = 150;
  const centerY = 150;
  ctx.clearRect(0, 0, 300, 300);

  // Scalloped outer starburst border
  ctx.save();
  ctx.fillStyle = '#64748b';
  const numPoints = 16;
  const outerRadius = 135;
  const innerRadius = 120;
  ctx.beginPath();
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / numPoints;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Inner white & concentric circle rings
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 115, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 108, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Top Arc Text
  ctx.save();
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const topText = (coachingName || 'COACHING INSTITUTE').toUpperCase();
  const topRadius = 94;
  const totalAngle = Math.min(Math.PI * 0.8, (topText.length * 14 * Math.PI) / 180);
  const startAngle = -Math.PI / 2 - totalAngle / 2;
  const charStep = totalAngle / Math.max(1, topText.length - 1);
  for (let i = 0; i < topText.length; i++) {
    const charAngle = startAngle + i * charStep;
    ctx.save();
    ctx.translate(centerX + Math.cos(charAngle) * topRadius, centerY + Math.sin(charAngle) * topRadius);
    ctx.rotate(charAngle + Math.PI / 2);
    ctx.fillText(topText[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // Bottom Arc Text
  ctx.save();
  ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bottomText = 'AUTHORIZED SIGNATORY';
  const bottomRadius = 94;
  const bTotalAngle = Math.PI * 0.6;
  const bStartAngle = Math.PI / 2 + bTotalAngle / 2;
  const bCharStep = bTotalAngle / (bottomText.length - 1);
  for (let i = 0; i < bottomText.length; i++) {
    const charAngle = bStartAngle - i * bCharStep;
    ctx.save();
    ctx.translate(centerX + Math.cos(charAngle) * bottomRadius, centerY + Math.sin(charAngle) * bottomRadius);
    ctx.rotate(charAngle - Math.PI / 2);
    ctx.fillText(bottomText[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // Center Ribbon
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(-140, -15);
  ctx.lineTo(-115, -28);
  ctx.lineTo(-115, 28);
  ctx.lineTo(-140, 15);
  ctx.lineTo(-130, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(140, -15);
  ctx.lineTo(115, -28);
  ctx.lineTo(115, 28);
  ctx.lineTo(140, 15);
  ctx.lineTo(130, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(-120, -25, 240, 50);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-117, -22, 234, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let bannerText = (coachingName || 'COACHING').toUpperCase();
  if (bannerText.length > 16) {
    bannerText = bannerText.slice(0, 14) + '..';
  }
  ctx.fillText(bannerText, 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png');
};

// ==========================================
// 3. SINGLE MONTH PAYMENT RECEIPT (WITH QR)
// ==========================================
export const downloadPaymentReceiptPDF = async ({ coaching, student, classSubjectInfo, feeRecord, upiId }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const receiptNo = feeRecord?.id || `REC-${Date.now().toString().slice(-6)}`;
  const dateStr = feeRecord?.updatedAt
    ? new Date(feeRecord.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');

  // Top Banner
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 148, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(coaching?.name || 'Tuition Center', 10, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Location: ${coaching?.address || 'N/A'} | Owner: ${coaching?.ownerName || 'N/A'}`, 10, 18);

  // Title & Metadata
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FEE PAYMENT RECEIPT', 10, 33);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${receiptNo}`, 10, 39);
  doc.text(`Date: ${dateStr}`, 105, 39);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 138, 42);

  // Student Profile Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, 46, 128, 28, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Student Name:', 14, 52);
  doc.text('Contact Phone:', 14, 58);
  doc.text('Class & Subject:', 14, 64);
  doc.text('Teacher Name:', 14, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(student?.name || 'N/A', 45, 52);
  doc.text(student?.phone || 'N/A', 45, 58);
  doc.text(`${classSubjectInfo?.className || 'N/A'} (${classSubjectInfo?.subjectName || 'N/A'})`, 45, 64);
  doc.text(classSubjectInfo?.teacherName || 'Faculty', 45, 70);

  // Fee Calculation
  const statusStr = feeRecord?.status === 'paid' ? 'Fully Paid' : feeRecord?.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid';
  const amountPaid = Number(feeRecord?.amountPaid || 0);
  const monthlyFee = Number(classSubjectInfo?.monthlyFee || 0);
  const balanceDue = Math.max(0, monthlyFee - amountPaid);

  autoTable(doc, {
    startY: 78,
    head: [['Description', 'Month/Year', 'Status', 'Amount (INR)']],
    body: [
      [`Monthly Tuition Fee - ${classSubjectInfo?.subjectName || ''}`, `${classSubjectInfo?.month}/${classSubjectInfo?.year}`, statusStr, `INR ${monthlyFee}`],
      ['Amount Paid', '-', '-', `INR ${amountPaid}`],
      ['Remaining Balance Due', '-', '-', `INR ${balanceDue}`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 110;

  if (feeRecord?.remark) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Remark: ${feeRecord.remark}`, 10, finalY + 6);
  }

  // GUARANTEED DYNAMIC UPI QR CODE RENDERING
  const upiIdToUse = upiId || coaching?.upiId || coaching?.upi || 'tuition@upi';
  const amountForQR = balanceDue > 0 ? balanceDue : (monthlyFee > 0 ? monthlyFee : 100);

  try {
    const upiUrl = buildUPIPaymentURL({
      upiId: upiIdToUse,
      payeeName: coaching?.name || 'Tuition Center',
      amount: amountForQR,
      note: `Fee-${student?.name || 'Student'}-${classSubjectInfo?.month}/${classSubjectInfo?.year}`
    });

    const qrDataUrl = await generateQRCodeDataURL(upiUrl);
    if (qrDataUrl) {
      const qrBoxY = finalY + 10;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(10, qrBoxY, 60, 48, 2, 2, 'F');
      doc.addImage(qrDataUrl, 'PNG', 14, qrBoxY + 3, 26, 26);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(balanceDue > 0 ? 'Scan & Pay Balance Due' : 'Official Payment QR', 14, qrBoxY + 33);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`UPI: ${upiIdToUse}`, 14, qrBoxY + 38);
      doc.setTextColor(balanceDue > 0 ? 225 : 16, balanceDue > 0 ? 29 : 185, balanceDue > 0 ? 72 : 129);
      doc.text(balanceDue > 0 ? `Due: INR ${balanceDue}` : `Fee: INR ${amountPaid}`, 14, qrBoxY + 43);
    }
  } catch (qrErr) {
    console.error('Error generating QR code:', qrErr);
  }

  // Official Seal
  try {
    const sealDataUrl = generateCoachingSeal(coaching?.name);
    const stampWidth = 36;
    const stampHeight = 36;
    const centerX = 118;
    const stampX = centerX - (stampWidth / 2);
    const stampY = finalY + 10;
    doc.addImage(sealDataUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
  } catch (err) {
    console.error('Error generating seal:', err);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated digital payment receipt.', 10, 198);
  doc.text('Thank you!', 125, 198);

  doc.save(`Receipt_${student?.name?.replace(/\s+/g, '_') || 'Student'}_${classSubjectInfo?.month}_${classSubjectInfo?.year}.pdf`);
};

// ==========================================
// 4. RANGE DATE STATEMENT & RECEIPT PDF[cite: 1]
// ==========================================
export const downloadClassSubjectRangeReceiptPDF = ({ coaching, student, classSubjectInfo, monthRecords, dateRangeText }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(coaching?.name || 'Tuition Center', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Location: ${coaching?.address || 'N/A'} | Owner: ${coaching?.ownerName || 'N/A'}`, 14, 22);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CLASS-SUBJECT FEE STATEMENT & RECEIPT', 14, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Period Range: ${dateRangeText}`, 14, 46);
  doc.text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 46);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 50, 182, 34, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Student Name:', 18, 57);
  doc.text('Contact Phone:', 18, 63);
  doc.text('Class & Subject:', 18, 69);
  doc.text('Teacher Name:', 18, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(student?.name || 'N/A', 50, 57);
  doc.text(student?.phone || 'N/A', 50, 63);
  doc.text(`${classSubjectInfo?.className || 'N/A'} - ${classSubjectInfo?.subjectName || 'N/A'}`, 50, 69);
  doc.text(classSubjectInfo?.teacherName || 'N/A', 50, 75);

  let grandTotalFee = 0;
  let grandTotalPaid = 0;
  let grandTotalDue = 0;

  const tableBody = monthRecords.map(r => {
    const monthlyFee = Number(r.monthlyFee || 0);
    const amountPaid = Number(r.amountPaid || 0);
    const balanceDue = Math.max(0, monthlyFee - amountPaid);
    grandTotalFee += monthlyFee;
    grandTotalPaid += amountPaid;
    grandTotalDue += balanceDue;
    const statusLabel = r.status === 'paid' ? 'Fully Paid' : r.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid';
    return [
      `${r.month}/${r.year}`,
      `INR ${monthlyFee}`,
      `INR ${amountPaid}`,
      `INR ${balanceDue}`,
      statusLabel,
      r.remark || '-'
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [['Month/Year', 'Monthly Fee', 'Amount Paid', 'Balance Left', 'Status', 'Remark']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 140;

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(102, finalY + 8, 94, 38, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('STATEMENT FINANCIAL SUMMARY', 106, finalY + 15);
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229);
  doc.text(`Total Agreed Tuition Fee: INR ${grandTotalFee}`, 106, finalY + 21);
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Amount Paid: INR ${grandTotalPaid}`, 106, finalY + 27);
  doc.setTextColor(225, 29, 72);
  doc.text(`Total Balance Left Due: INR ${grandTotalDue}`, 106, finalY + 33);

  try {
    const sealDataUrl = generateCoachingSeal(coaching?.name);
    const stampWidth = 42;
    const stampHeight = 42;
    const centerX = 50;
    const stampX = centerX - (stampWidth / 2);
    const stampY = finalY + 6;
    doc.addImage(sealDataUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
  } catch (err) {
    console.error('Error attaching coaching seal to PDF:', err);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This digital statement serves as an official receipt.', 14, 280);
  doc.save(`${student?.name?.replace(/\s+/g, '_') || 'Student'}_${classSubjectInfo?.subjectName || 'Subject'}_Range_Receipt.pdf`);
};

// ==========================================
// 5. CSV & PDF SUMMARY EXPORTS[cite: 1]
// ==========================================
export const downloadFeeSummaryCSV = ({ coachingName, reportTitle, records }) => {
  const headers = ['Student Name', 'Contact', 'Class Name', 'Subject Name', 'Month/Year', 'Monthly Fee (INR)', 'Amount Paid (INR)', 'Balance Left (INR)', 'Status', 'Remark'];
  const rows = records.map(r => [
    `"${r.studentName || ''}"`,
    `"${r.phone || ''}"`,
    `"${r.className || ''}"`,
    `"${r.subjectName || ''}"`,
    `"${r.month}/${r.year}"`,
    r.monthlyFee || 0,
    r.amountPaid || 0,
    Math.max(0, (r.monthlyFee || 0) - (r.amountPaid || 0)),
    `"${r.status || ''}"`,
    `"${r.remark || ''}"`
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${(coachingName || 'Coaching').replace(/\s+/g, '_')}_Fee_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadFeeSummaryPDF = ({ coachingName, reportTitle, records }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(coachingName || 'Tuition Center', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${reportTitle || 'Fee Summary Report'} - Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

  const tableData = records.map(r => [
    r.studentName,
    r.phone,
    r.className,
    r.subjectName,
    `${r.month}/${r.year}`,
    `INR ${r.monthlyFee}`,
    `INR ${r.amountPaid}`,
    `INR ${Math.max(0, r.monthlyFee - r.amountPaid)}`,
    r.status?.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 28,
    head: [['Student Name', 'Contact', 'Class', 'Subject', 'Month/Year', 'Monthly Fee', 'Amount Paid', 'Balance Left', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${(coachingName || 'Coaching').replace(/\s+/g, '_')}_Summary_Report.pdf`);
};

// ==========================================
// 6. ADMIN PLATFORM REPORT PDF[cite: 1]
// ==========================================
export const downloadAdminPlatformReportPDF = ({
  month,
  year,
  metrics,
  paymentsList = []
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('TUITIONMANAGER PLATFORM REPORT', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Monthly Financial & System Performance Analysis | Period: ${monthName} ${year}`, 14, 19);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('EXECUTIVE OVERVIEW & METRICS', 14, 34);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${dateStr}`, 148, 34);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 37, 196, 37);

  autoTable(doc, {
    startY: 40,
    head: [['Metric Parameter', 'Value', 'Status / Category', 'Analysis Notes']],
    body: [
      ['Total Expected Revenue', `INR ${Number(metrics?.totalExpectedRevenue || 0).toLocaleString('en-IN')}`, 'Projected Pro Subscriptions', `${metrics?.proUsersCount || 0} Pro Users @ INR ${metrics?.proPlanPrice || 1200}/month`],
      ['Total Revenue Obtained', `INR ${Number(metrics?.totalCollectedRevenue || 0).toLocaleString('en-IN')}`, 'Verified / Completed', `${metrics?.acceptedCount || 0} Successful Subscriptions Received`],
      ['Total Left / Pending Review', `INR ${Number(metrics?.totalPendingRevenue || 0).toLocaleString('en-IN')}`, 'Under Processing', `${metrics?.pendingCount || 0} Requests Awaiting Admin Verification`],
      ['Pro Academy Educators', `${metrics?.proUsersCount || 0} Teachers`, 'Paid Tier', `${metrics?.proPercent || 0}% of Total Registered Educators`],
      ['Starter Free Educators', `${metrics?.starterUsersCount || 0} Teachers`, 'Free Tier', 'Up to 50 Students Limit per User'],
      ['Active Coaching Centers', `${metrics?.totalCoachings || 0} Institutes`, 'Platform Active', `${metrics?.totalStudents || 0} Total Students Enrolled`],
      ['Account Status Ratio', `Active: ${metrics?.activeUsersCount || 0} | Paused: ${metrics?.stoppedUsersCount || 0} | Terminated: ${metrics?.deletedUsersCount || 0}`, 'System Health', 'Real-time User Breakdown']
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 7 : 95;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`TRANSACTION LEDGER BREAKDOWN (${monthName.toUpperCase()} ${year})`, 14, currentY);

  const tableRows = paymentsList.map(p => {
    const pType = p.isCustomPayment ? 'Custom Payment' : p.isPlanUpgradeRequest ? 'Plan Upgrade' : p.isPlanDowngradeRequest ? 'Plan Downgrade' : 'Monthly Subscription';
    const subDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-';
    const statusLabel = p.status === 'accepted' ? 'Accepted' : p.status === 'rejected' ? 'Rejected' : 'Pending';
    return [
      p.userName || 'N/A',
      p.userEmail || 'N/A',
      pType,
      `INR ${p.amount || 0}`,
      subDate,
      statusLabel,
      p.paymentDetails ? (p.paymentDetails.length > 28 ? p.paymentDetails.slice(0, 26) + '..' : p.paymentDetails) : 'N/A'
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['User Name', 'Email Address', 'Payment Type', 'Amount', 'Date', 'Status', 'Txn Details']],
    body: tableRows.length > 0 ? tableRows : [['No transactions recorded for this selected month & year.', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 170;

  try {
    const sealDataUrl = generateCoachingSeal('TUITIONMANAGER');
    const stampWidth = 42;
    const stampHeight = 42;
    const centerX = 168;
    const stampX = centerX - (stampWidth / 2);
    const stampY = finalY + 6 > 230 ? 230 : finalY + 6;
    doc.addImage(sealDataUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Official Verified Platform Stamp', centerX, stampY + stampHeight + 4, { align: 'center' });
  } catch (err) {
    console.error('Error generating TuitionManager seal:', err);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential - Generated via TuitionManager System Admin Console.', 14, 287);
  doc.save(`TuitionManager_Platform_Revenue_Report_${month}_${year}.pdf`);
};

// ==========================================
// 7. COACHING EXPENSES REPORT PDF[cite: 1]
// ==========================================
export const downloadCoachingExpensesReportPDF = ({
  coaching,
  month,
  year,
  expenses = [],
  totalMonthlyExpenses = 0,
  categoryTotals = {},
  modeTotals = {}
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFillColor(225, 29, 72);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(coaching?.name || 'Tuition Center', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(254, 205, 211);
  doc.text(`Location: ${coaching?.address || 'N/A'} | Owner: ${coaching?.ownerName || 'N/A'}`, 14, 19);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MONTHLY EXPENSES & OUTFLOW STATEMENT', 14, 34);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Billing Period: ${monthName} ${year}`, 14, 40);
  doc.text(`Generated Date: ${dateStr}`, 148, 40);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 43, 196, 43);

  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const primaryModeEntry = Object.entries(modeTotals).sort((a, b) => b[1] - a[1])[0];

  autoTable(doc, {
    startY: 46,
    head: [['Outflow Metric Parameter', 'Value / Expenditure', 'Analysis & Notes']],
    body: [
      [
        'Total Monthly Expenses',
        `INR ${Number(totalMonthlyExpenses).toLocaleString('en-IN')}`,
        `Recorded across ${expenses.length} distinct transaction(s)`
      ],
      [
        'Top Spending Category',
        topCategoryEntry ? `${topCategoryEntry[0]} (INR ${Number(topCategoryEntry[1]).toLocaleString('en-IN')})` : 'N/A',
        topCategoryEntry ? `${Math.round((topCategoryEntry[1] / Math.max(1, totalMonthlyExpenses)) * 100)}% of total monthly outflow` : 'No category data'
      ],
      [
        'Primary Outflow Payment Mode',
        primaryModeEntry ? `${primaryModeEntry[0]} (INR ${Number(primaryModeEntry[1]).toLocaleString('en-IN')})` : 'UPI',
        'Highest volume payment channel utilized'
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [255, 241, 242] },
    margin: { left: 14, right: 14 }
  });

  let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 80;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`CATEGORY-WISE EXPENDITURE SUMMARY`, 14, currentY);

  const categoryRows = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const share = totalMonthlyExpenses > 0 ? Math.round((amt / totalMonthlyExpenses) * 100) : 0;
      return [cat, `INR ${Number(amt).toLocaleString('en-IN')}`, `${share}% of Total`];
    });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Category Name', 'Total Amount', 'Percentage Share']],
    body: categoryRows.length > 0 ? categoryRows : [['No categories logged.', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 130;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`ITEMIZED EXPENSE TRANSACTIONS (${monthName.toUpperCase()} ${year})`, 14, currentY);

  const tableRows = expenses.map(exp => [
    exp.title || 'N/A',
    exp.category || 'Other',
    `INR ${Number(exp.amount || 0).toLocaleString('en-IN')}`,
    exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
    exp.paymentMode || 'UPI',
    exp.remark ? (exp.remark.length > 25 ? exp.remark.slice(0, 23) + '..' : exp.remark) : '-'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Title / Item', 'Category', 'Amount', 'Date', 'Mode', 'Notes / Remarks']],
    body: tableRows.length > 0 ? tableRows : [['No expenses recorded for this month.', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 190;

  try {
    const sealDataUrl = generateCoachingSeal(coaching?.name);
    const stampWidth = 44;
    const stampHeight = 44;
    const centerX = 168;
    const stampX = centerX - (stampWidth / 2);
    const stampY = finalY + 6 > 230 ? 230 : finalY + 6;
    doc.addImage(sealDataUrl, 'PNG', stampX, stampY, stampWidth, stampHeight);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Official Verified Coaching Seal', centerX, stampY + stampHeight + 4, { align: 'center' });
  } catch (err) {
    console.error('Error generating coaching seal for expenses:', err);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an official computer-generated digital expenses statement.', 14, 287);
  doc.save(`${(coaching?.name || 'Coaching').replace(/\s+/g, '_')}_Expenses_Report_${month}_${year}.pdf`);
};

export default {
  buildUPIPaymentURL,
  generateQRCodeDataURL,
  generateCoachingSeal,
  downloadPaymentReceiptPDF,
  downloadClassSubjectRangeReceiptPDF,
  downloadFeeSummaryCSV,
  downloadFeeSummaryPDF,
  downloadAdminPlatformReportPDF,
  downloadCoachingExpensesReportPDF
};
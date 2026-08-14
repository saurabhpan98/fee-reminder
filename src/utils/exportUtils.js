// src/utils/exportUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Helper to dynamically generate a circular badge stamp matching the design
 */
const generateCoachingSeal = (coachingName) => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  const centerX = 150;
  const centerY = 150;

  ctx.clearRect(0, 0, 300, 300);

  // 1. Scalloped / Starburst Outer Border (Grey/Slate Stamp edge)
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

  // 2. Inner White & Circle Rings
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

  // 3. Top Arc Text: Coaching Name
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

  // 4. Bottom Arc Text: "AUTHORIZED SIGNATORY"
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

  // 5. Center Diagonal Blue Ribbon
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((-12 * Math.PI) / 180); // Diagonal angle like the reference stamp

  // Ribbon tails
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

  // Ribbon banner main rectangle
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(-120, -25, 240, 50);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(-117, -22, 234, 44);

  // Ribbon Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Truncate if coaching name is too long for center banner
  let bannerText = (coachingName || 'COACHING').toUpperCase();
  if (bannerText.length > 16) {
    bannerText = bannerText.slice(0, 14) + '..';
  }
  ctx.fillText(bannerText, 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png');
};

/**
 * 1. Download Single Month Payment Receipt PDF (Specific Class-Subject)
 */
export const downloadPaymentReceiptPDF = ({ coaching, student, classSubjectInfo, feeRecord }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const receiptNo = feeRecord?.id || `REC-${Date.now().toString().slice(-6)}`;
  const dateStr = feeRecord?.updatedAt 
    ? new Date(feeRecord.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');

  // Header Banner
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
  doc.text('FEE PAYMENT RECEIPT', 10, 34);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${receiptNo}`, 10, 40);
  doc.text(`Date: ${dateStr}`, 105, 40);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(10, 44, 138, 44);

  // Student Profile & Teacher Info Summary
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, 48, 128, 30, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Student Name:', 14, 54);
  doc.text('Contact Phone:', 14, 60);
  doc.text('Class & Subject:', 14, 66);
  doc.text('Teacher Name:', 14, 72);

  doc.setFont('helvetica', 'normal');
  doc.text(student?.name || 'N/A', 45, 54);
  doc.text(student?.phone || 'N/A', 45, 60);
  doc.text(`${classSubjectInfo?.className || 'N/A'} (${classSubjectInfo?.subjectName || 'N/A'})`, 45, 66);
  doc.text(classSubjectInfo?.teacherName || 'N/A', 45, 72);

  // Fee Breakdown Table
  const statusStr = feeRecord?.status === 'paid' ? 'Fully Paid' : feeRecord?.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid';
  const amountPaid = Number(feeRecord?.amountPaid || 0);
  const monthlyFee = Number(classSubjectInfo?.monthlyFee || 0);
  const balanceDue = Math.max(0, monthlyFee - amountPaid);

  autoTable(doc, {
    startY: 83,
    head: [['Description', 'Month/Year', 'Status', 'Amount (INR)']],
    body: [
      [`Monthly Fee - ${classSubjectInfo?.subjectName || ''}`, `${classSubjectInfo?.month}/${classSubjectInfo?.year}`, statusStr, `INR ${monthlyFee}`],
      ['Amount Paid', '-', '-', `INR ${amountPaid}`],
      ['Remaining Balance Due', '-', '-', `INR ${balanceDue}`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 115;

  if (feeRecord?.remark) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Remark: ${feeRecord.remark}`, 10, finalY + 8);
  }

  // --- DYNAMIC COACHING STAMP / SEAL ---
  try {
    const sealDataUrl = generateCoachingSeal(coaching?.name);
    doc.addImage(sealDataUrl, 'PNG', 98, finalY + 12, 38, 38);
  } catch (err) {
    console.error('Error attaching coaching seal to PDF:', err);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated digital payment receipt.', 10, 195);
  doc.text('Thank you!', 125, 195);

  doc.save(`Receipt_${student?.name?.replace(/\s+/g, '_')}_${classSubjectInfo?.month}_${classSubjectInfo?.year}.pdf`);
};

/**
 * 2. Download Range of Months Receipt PDF for a Specific Class-Subject
 */
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
    head: [['Month/Year', 'Monthly Fee', 'Paid Amount', 'Balance Left', 'Status', 'Remark']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 140;

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(110, finalY + 8, 86, 32, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('STATEMENT SUMMARY', 114, finalY + 15);
  doc.setFontSize(8);
  doc.text(`Total Agreed Fee: INR ${grandTotalFee}`, 114, finalY + 21);
  doc.text(`Total Amount Paid: INR ${grandTotalPaid}`, 114, finalY + 26);
  doc.setTextColor(225, 29, 72);
  doc.text(`Total Remaining Left: INR ${grandTotalDue}`, 114, finalY + 31);

  // --- DYNAMIC COACHING STAMP / SEAL ON RANGE RECEIPT ---
  try {
    const sealDataUrl = generateCoachingSeal(coaching?.name);
    doc.addImage(sealDataUrl, 'PNG', 20, finalY + 8, 42, 42);
  } catch (err) {
    console.error('Error attaching coaching seal to PDF:', err);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This digital statement serves as an official receipt.', 14, 280);

  doc.save(`${student?.name?.replace(/\s+/g, '_')}_${classSubjectInfo?.subjectName}_Range_Receipt.pdf`);
};

/**
 * 3. Export Coaching Summary CSV
 */
export const downloadFeeSummaryCSV = ({ coachingName, reportTitle, records }) => {
  const headers = ['Student Name', 'Contact', 'Class Name', 'Subject Name', 'Month/Year', 'Monthly Fee (INR)', 'Amount Paid (INR)', 'Balance Due (INR)', 'Status', 'Remark'];
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

/**
 * 4. Export Coaching Summary PDF
 */
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
    head: [['Student Name', 'Contact', 'Class', 'Subject', 'Month/Year', 'Fee', 'Paid', 'Balance', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${(coachingName || 'Coaching').replace(/\s+/g, '_')}_Summary_Report.pdf`);
};

export default {
  downloadPaymentReceiptPDF,
  downloadClassSubjectRangeReceiptPDF,
  downloadFeeSummaryCSV,
  downloadFeeSummaryPDF
};
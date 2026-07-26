// src/utils/exportUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Title
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

  // Student Profile Summary
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, 48, 128, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Student Name:', 14, 55);
  doc.text('Contact Phone:', 14, 62);
  doc.text('Class & Subject:', 14, 69);

  doc.setFont('helvetica', 'normal');
  doc.text(student?.name || 'N/A', 45, 55);
  doc.text(student?.phone || 'N/A', 45, 62);
  doc.text(`${classSubjectInfo?.className || 'N/A'} (${classSubjectInfo?.subjectName || 'N/A'})`, 45, 69);

  // Fee Breakdown
  const statusStr = feeRecord?.status === 'paid' ? 'Fully Paid' : feeRecord?.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid';
  const amountPaid = Number(feeRecord?.amountPaid || 0);
  const monthlyFee = Number(classSubjectInfo?.monthlyFee || 0);
  const balanceDue = Math.max(0, monthlyFee - amountPaid);

  autoTable(doc, {
    startY: 80,
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

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 110;

  if (feeRecord?.remark) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Remark: ${feeRecord.remark}`, 10, finalY + 8);
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
  doc.roundedRect(14, 50, 182, 28, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Student Name:', 18, 57);
  doc.text('Contact Phone:', 18, 63);
  doc.text('Class & Subject:', 18, 69);

  doc.setFont('helvetica', 'normal');
  doc.text(student?.name || 'N/A', 50, 57);
  doc.text(student?.phone || 'N/A', 50, 63);
  doc.text(`${classSubjectInfo?.className || 'N/A'} — ${classSubjectInfo?.subjectName || 'N/A'}`, 50, 69);

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
    startY: 84,
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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This digital statement serves as an official receipt.', 14, 280);

  doc.save(`${student?.name?.replace(/\s+/g, '_')}_${classSubjectInfo?.subjectName}_Range_Receipt.pdf`);
};

/**
 * 3. Download Multi-Month Fee Statement & Receipt PDF across ALL Enrolled Subjects
 */
export const downloadMultiMonthStudentReceiptPDF = ({ coaching, student, monthRecords, dateRangeText }) => {
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
  doc.text('COMPLETE STUDENT FEE STATEMENT & RECEIPT', 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Statement Period: ${dateRangeText}`, 14, 46);
  doc.text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 46);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 50, 182, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Student Name:', 18, 57);
  doc.text('Contact Phone:', 18, 64);
  doc.text('Email Address:', 18, 71);

  doc.setFont('helvetica', 'normal');
  doc.text(student?.name || 'N/A', 50, 57);
  doc.text(student?.phone || 'N/A', 50, 64);
  doc.text(student?.email || 'N/A', 50, 71);

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
      `${r.className} (${r.subjectName})`,
      `INR ${monthlyFee}`,
      `INR ${amountPaid}`,
      `INR ${balanceDue}`,
      statusLabel
    ];
  });

  autoTable(doc, {
    startY: 82,
    head: [['Month/Year', 'Class & Subject', 'Monthly Fee', 'Paid Amount', 'Balance Due', 'Status']],
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
  doc.text(`Total Agreed Fee: INR ${grandTotalFee}`, 114, finalY + 22);
  doc.text(`Total Amount Paid: INR ${grandTotalPaid}`, 114, finalY + 27);
  
  doc.setTextColor(225, 29, 72);
  doc.text(`Total Balance Due: INR ${grandTotalDue}`, 114, finalY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This statement serves as an official fee summary and receipt.', 14, 280);

  doc.save(`${student?.name?.replace(/\s+/g, '_')}_Overall_Fee_Statement.pdf`);
};

/**
 * 4. Export Coaching Summary CSV
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
  link.setAttribute('download', `${coachingName.replace(/\s+/g, '_')}_Fee_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 5. Export Coaching Summary PDF
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
  doc.text(`${reportTitle} - Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 22);

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

  doc.save(`${coachingName.replace(/\s+/g, '_')}_Summary_Report.pdf`);
};
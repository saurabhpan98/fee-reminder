// src/components/coaching/ExportReportModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { downloadFeeSummaryCSV, downloadFeeSummaryPDF, downloadClassSubjectRangeReceiptPDF } from '../../utils/exportUtils';
import { Download, FileText, FileSpreadsheet, X } from 'lucide-react';

export const ExportReportModal = ({ coaching, onClose }) => {
  const [reportType, setReportType] = useState('monthly'); // 'monthly' | 'range' | 'studentRange'
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [coaching.id]);

  const fetchStudents = async () => {
    const studentSnap = await getDocs(query(collection(db, 'students'), where('coachingId', '==', coaching.id)));
    const studentList = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setStudents(studentList);
    if (studentList.length > 0) setSelectedStudentId(studentList[0].id);
  };

  const fetchReportRecords = async () => {
    setIsGenerating(true);

    try {
      const studentSnap = await getDocs(query(collection(db, 'students'), where('coachingId', '==', coaching.id)));
      const allStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const feeSnap = await getDocs(query(collection(db, 'feeRecords'), where('coachingId', '==', coaching.id)));
      const feeRecords = feeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const compiledRecords = [];

      const targetStudents = reportType === 'studentRange' 
        ? allStudents.filter(s => s.id === selectedStudentId)
        : allStudents;

      targetStudents.forEach(student => {
        student.enrollments?.forEach(enrollment => {
          const matchingFees = feeRecords.filter(f => {
            if (f.studentId !== student.id || f.enrollmentId !== enrollment.enrollmentId) return false;

            if (reportType === 'monthly') {
              return f.month === Number(selectedMonth) && f.year === Number(selectedYear);
            } else {
              const recordVal = f.year * 12 + f.month;
              const startVal = Number(startYear) * 12 + Number(startMonth);
              const endVal = Number(endYear) * 12 + Number(endMonth);
              return recordVal >= startVal && recordVal <= endVal;
            }
          });

          if (matchingFees.length > 0) {
            matchingFees.forEach(fee => {
              compiledRecords.push({
                studentName: student.name,
                phone: student.phone,
                className: enrollment.className,
                subjectName: enrollment.subjectName,
                monthlyFee: enrollment.monthlyFee,
                amountPaid: fee.amountPaid || 0,
                status: fee.status || 'unpaid',
                month: fee.month,
                year: fee.year,
                remark: fee.remark || ''
              });
            });
          } else if (reportType === 'monthly' || reportType === 'studentRange') {
            compiledRecords.push({
              studentName: student.name,
              phone: student.phone,
              className: enrollment.className,
              subjectName: enrollment.subjectName,
              monthlyFee: enrollment.monthlyFee,
              amountPaid: 0,
              status: 'unpaid',
              month: Number(selectedMonth),
              year: Number(selectedYear),
              remark: ''
            });
          }
        });
      });

      return compiledRecords;
    } catch (err) {
      console.error('Error fetching export data:', err);
      alert('Failed to compile report data.');
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    const records = await fetchReportRecords();
    if (records.length === 0) return alert('No fee records found.');

    const title = reportType === 'monthly'
      ? `Monthly Report (${selectedMonth}/${selectedYear})`
      : `Range Report (${startMonth}/${startYear} to ${endMonth}/${endYear})`;

    downloadFeeSummaryCSV({ coachingName: coaching.name, reportTitle: title, records });
  };

  const handleExportPDF = async () => {
    if (reportType === 'studentRange') {
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const records = await fetchReportRecords();
      if (!selectedStudent || records.length === 0) return alert('No records found for selected student.');

      downloadClassSubjectRangeReceiptPDF({
        coaching,
        student: selectedStudent,
        classSubjectInfo: selectedStudent.enrollments?.[0] || {},
        monthRecords: records,
        dateRangeText: `${startMonth}/${startYear} to ${endMonth}/${endYear}`
      });
      return;
    }

    const records = await fetchReportRecords();
    if (records.length === 0) return alert('No fee records found.');

    const title = reportType === 'monthly'
      ? `Monthly Report (${selectedMonth}/${selectedYear})`
      : `Range Report (${startMonth}/${startYear} to ${endMonth}/${endYear})`;

    downloadFeeSummaryPDF({ coachingName: coaching.name, reportTitle: title, records });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <Download size={20} />
            <h3 className="font-extrabold text-slate-800 text-base">Export Reports & Statements</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl text-[11px] font-extrabold">
          <button
            onClick={() => setReportType('monthly')}
            className={`py-2 rounded-xl transition-all ${reportType === 'monthly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'}`}
          >
            Month Summary
          </button>
          <button
            onClick={() => setReportType('range')}
            className={`py-2 rounded-xl transition-all ${reportType === 'range' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'}`}
          >
            Range Summary
          </button>
          <button
            onClick={() => setReportType('studentRange')}
            className={`py-2 rounded-xl transition-all ${reportType === 'studentRange' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'}`}
          >
            Student Receipt
          </button>
        </div>

        {/* Student Selector */}
        {reportType === 'studentRange' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
            </select>
          </div>
        )}

        {/* Timeline Selectors */}
        {reportType === 'monthly' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From (Month/Year)</label>
                <div className="flex gap-1">
                  <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                  </select>
                  <select value={startYear} onChange={(e) => setStartYear(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To (Month/Year)</label>
                <div className="flex gap-1">
                  <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                  </select>
                  <select value={endYear} onChange={(e) => setEndYear(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={handleExportCSV}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
          >
            <FileSpreadsheet size={16} /> Export CSV
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
// src/pages/StudentDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { downloadMultiMonthStudentReceiptPDF } from '../utils/exportUtils';
import { ArrowLeft, User, Phone, Mail, FileText, Download, Calendar, X } from 'lucide-react';

export const StudentDetailsPage = ({ studentId, onBack }) => {
  const [student, setStudent] = useState(null);
  const [coaching, setCoaching] = useState(null);
  const [feeRecords, setFeeRecords] = useState([]);
  
  // Range Receipt Modal State
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId]);

  const fetchStudentDetails = async () => {
    const studentSnap = await getDoc(doc(db, 'students', studentId));
    if (studentSnap.exists()) {
      const studentData = { id: studentSnap.id, ...studentSnap.data() };
      setStudent(studentData);

      if (studentData.coachingId) {
        const coachingSnap = await getDoc(doc(db, 'coachings', studentData.coachingId));
        if (coachingSnap.exists()) {
          setCoaching({ id: coachingSnap.id, ...coachingSnap.data() });
        }
      }

      const feeSnap = await getDocs(query(collection(db, 'feeRecords'), where('studentId', '==', studentId)));
      setFeeRecords(feeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
  };

  const handleDownloadMultiMonthReceipt = () => {
    if (!student || !coaching) return;

    const startVal = Number(startYear) * 12 + Number(startMonth);
    const endVal = Number(endYear) * 12 + Number(endMonth);

    const compiledMonthRecords = [];

    // Compile month records across enrollments
    student.enrollments?.forEach(enr => {
      for (let y = Number(startYear); y <= Number(endYear); y++) {
        const mStart = (y === Number(startYear)) ? Number(startMonth) : 1;
        const mEnd = (y === Number(endYear)) ? Number(endMonth) : 12;

        for (let m = mStart; m <= mEnd; m++) {
          const rec = feeRecords.find(f => f.enrollmentId === enr.enrollmentId && f.month === m && f.year === y);

          compiledMonthRecords.push({
            month: m,
            year: y,
            className: enr.className,
            subjectName: enr.subjectName,
            monthlyFee: enr.monthlyFee,
            amountPaid: rec ? (rec.amountPaid || 0) : 0,
            status: rec ? (rec.status || 'unpaid') : 'unpaid'
          });
        }
      }
    });

    if (compiledMonthRecords.length === 0) {
      alert('No enrollments found for the selected month range.');
      return;
    }

    const dateRangeText = `${startMonth}/${startYear} to ${endMonth}/${endYear}`;
    downloadMultiMonthStudentReceiptPDF({ coaching, student, monthRecords: compiledMonthRecords, dateRangeText });
    setShowRangeModal(false);
  };

  if (!student) return <div className="p-8 text-center text-slate-400">Loading student details...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Feature Trigger Button */}
        <button
          onClick={() => setShowRangeModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
        >
          <Download size={14} /> Download Range Fee Receipt
        </button>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xl">
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{student.name}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-3 mt-1 font-medium">
              <span className="flex items-center gap-1"><Phone size={12}/> {student.phone}</span>
              {student.email && <span className="flex items-center gap-1"><Mail size={12}/> {student.email}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Enrollments Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-base">Active & Past Enrollments</h3>
        <div className="space-y-3">
          {student.enrollments?.map((enr) => (
            <div key={enr.enrollmentId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{enr.className} — {enr.subjectName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Monthly Agreed Fee: ₹{enr.monthlyFee}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                enr.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {enr.status === 'active' ? 'Active' : 'Left'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Month Download Selection Modal */}
      {showRangeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" /> Select Range of Months
              </h3>
              <button onClick={() => setShowRangeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From (Month/Year)</label>
                <div className="flex gap-2">
                  <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Month {i + 1}</option>)}
                  </select>
                  <select value={startYear} onChange={(e) => setStartYear(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To (Month/Year)</label>
                <div className="flex gap-2">
                  <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Month {i + 1}</option>)}
                  </select>
                  <select value={endYear} onChange={(e) => setEndYear(e.target.value)} className="w-1/2 p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setShowRangeModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button onClick={handleDownloadMultiMonthReceipt} className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md">
                Download PDF Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
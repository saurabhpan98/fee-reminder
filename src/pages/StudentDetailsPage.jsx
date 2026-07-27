// src/pages/StudentDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  downloadPaymentReceiptPDF, 
  downloadClassSubjectRangeReceiptPDF 
} from '../utils/exportUtils';
import { 
  Phone, Mail, MapPin, Trash2, AlertTriangle, ArrowLeft, 
  UserCheck, UserMinus, DollarSign, Calendar, Edit3, X, Check,
  BookOpen, Sparkles, FileText
} from 'lucide-react';

export const StudentDetailsPage = ({ studentId, onBack }) => {
  const [student, setStudent] = useState(null);
  const [coaching, setCoaching] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', email: '', address: '' });

  // Original Fee Ledger Modal State
  const [activeModalEnrollment, setActiveModalEnrollment] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [feeRecord, setFeeRecord] = useState({ status: 'unpaid', remark: '', amountPaid: 0 });

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Per Class-Subject Specific Receipt Modal State
  const [receiptModal, setReceiptModal] = useState(null); // { enrollment }
  const [receiptMode, setReceiptMode] = useState('single'); // 'single' | 'range'
  
  // Month / Year States for Receipts
  const [singleMonth, setSingleMonth] = useState(new Date().getMonth() + 1);
  const [singleYear, setSingleYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    const snap = await getDoc(doc(db, 'students', studentId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      setStudent(data);
      setEditFormData({
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || ''
      });

      if (data.coachingId) {
        const coachingSnap = await getDoc(doc(db, 'coachings', data.coachingId));
        if (coachingSnap.exists()) {
          setCoaching({ id: coachingSnap.id, ...coachingSnap.data() });
        }
      }
    }
  };

  const handleConfirmDeleteStudent = async () => {
    setIsDeleting(true);
    try {
      const feeQ = query(collection(db, 'feeRecords'), where('studentId', '==', studentId));
      const feeSnap = await getDocs(feeQ);
      const deletePromises = feeSnap.docs.map(feeDoc => deleteDoc(doc(db, 'feeRecords', feeDoc.id)));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'students', studentId));

      setShowDeleteModal(false);
      onBack();
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("Failed to delete student: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, 'students', studentId), {
      name: editFormData.name,
      phone: editFormData.phone,
      email: editFormData.email,
      address: editFormData.address
    });
    setIsEditing(false);
    fetchStudent();
  };

  const handleToggleEnrollmentStatus = async (enrollmentId) => {
    const updated = student.enrollments.map(e => {
      if (e.enrollmentId === enrollmentId) {
        return { ...e, status: e.status === 'active' ? 'unassigned' : 'active' };
      }
      return e;
    });

    await updateDoc(doc(db, 'students', studentId), { enrollments: updated });
    fetchStudent();
  };

  const openFeeModal = async (enrollment) => {
    setActiveModalEnrollment(enrollment);
    await fetchFeeRecord(enrollment.enrollmentId, selectedYear, selectedMonth);
  };

  const fetchFeeRecord = async (enrollmentId, year, month) => {
    const recordId = `${studentId}_${enrollmentId}_${year}_${month}`;
    const snap = await getDoc(doc(db, 'feeRecords', recordId));
    
    if (snap.exists()) {
      setFeeRecord(snap.data());
    } else {
      setFeeRecord({ status: 'unpaid', remark: '', amountPaid: 0 });
    }
  };

  const handleYearMonthChange = (y, m) => {
    setSelectedYear(y);
    setSelectedMonth(m);
    if (activeModalEnrollment) {
      fetchFeeRecord(activeModalEnrollment.enrollmentId, y, m);
    }
  };

  const handleSaveFee = async (statusOverride = null, amountOverride = null) => {
    if (!activeModalEnrollment) return;

    const finalStatus = statusOverride || feeRecord.status;
    let finalAmountPaid = amountOverride !== null ? amountOverride : Number(feeRecord.amountPaid || 0);

    if (finalStatus === 'paid') {
      finalAmountPaid = activeModalEnrollment.monthlyFee;
    } else if (finalStatus === 'unpaid') {
      finalAmountPaid = 0;
    }

    const recordId = `${studentId}_${activeModalEnrollment.enrollmentId}_${selectedYear}_${selectedMonth}`;
    await setDoc(doc(db, 'feeRecords', recordId), {
      studentId,
      enrollmentId: activeModalEnrollment.enrollmentId,
      coachingId: student.coachingId,
      year: Number(selectedYear),
      month: Number(selectedMonth),
      status: finalStatus,
      amountPaid: finalAmountPaid,
      remark: feeRecord.remark || '',
      updatedAt: new Date().toISOString()
    });

    setActiveModalEnrollment(null);
    fetchStudent();
  };

  // Helper: Checks if student was NOT enrolled during a given month/year
  const isMonthBeforeEnrollment = (enrollment, month, year) => {
    if (!enrollment || !enrollment.joinedAt) return false;
    const joinDate = new Date(enrollment.joinedAt);
    const selectedDate = new Date(Number(year), Number(month) - 1, 1);
    const joinMonthStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
    return selectedDate < joinMonthStart;
  };

  // Download Class-Subject Specific Receipt with Validation & Dynamic Teacher Lookup
  const handleGenerateClassSubjectReceipt = async () => {
    if (!student || !coaching || !receiptModal) return;
    const { enrollment } = receiptModal;

    // Retrieve Teacher Name from enrollment or fallback to fetching class details
    let teacherName = enrollment.teacherName || 'N/A';
    if (teacherName === 'N/A' && enrollment.classId && coaching.id) {
      try {
        const classSnap = await getDoc(doc(db, 'coachings', coaching.id, 'classes', enrollment.classId));
        if (classSnap.exists()) {
          const classData = classSnap.data();
          const sub = classData.subjects?.find(s => s.id === enrollment.subjectId || s.name === enrollment.subjectName);
          if (sub?.teacherName) {
            teacherName = sub.teacherName;
          }
        }
      } catch (err) {
        console.error("Error fetching subject teacher name:", err);
      }
    }

    if (receiptMode === 'single') {
      // Validation Check
      if (isMonthBeforeEnrollment(enrollment, singleMonth, singleYear)) {
        alert("cannot download receipt for month when student was not enrolled");
        return;
      }

      const feeSnap = await getDocs(query(collection(db, 'feeRecords'), where('studentId', '==', studentId)));
      const allFeeRecords = feeSnap.docs.map(d => d.data());
      const rec = allFeeRecords.find(f => f.enrollmentId === enrollment.enrollmentId && f.month === Number(singleMonth) && f.year === Number(singleYear));
      
      downloadPaymentReceiptPDF({
        coaching,
        student,
        classSubjectInfo: {
          className: enrollment.className,
          subjectName: enrollment.subjectName,
          teacherName: teacherName,
          monthlyFee: enrollment.monthlyFee,
          month: singleMonth,
          year: singleYear
        },
        feeRecord: rec || { status: 'unpaid', amountPaid: 0 }
      });
    } else {
      // Range Validation Check
      const startVal = Number(startYear) * 12 + Number(startMonth);
      const endVal = Number(endYear) * 12 + Number(endMonth);

      if (startVal > endVal) {
        alert("Invalid date range selection.");
        return;
      }

      if (isMonthBeforeEnrollment(enrollment, startMonth, startYear)) {
        alert("cannot download receipt for month when student was not enrolled");
        return;
      }

      const feeSnap = await getDocs(query(collection(db, 'feeRecords'), where('studentId', '==', studentId)));
      const allFeeRecords = feeSnap.docs.map(d => d.data());
      const compiledRecords = [];

      for (let y = Number(startYear); y <= Number(endYear); y++) {
        const mStart = (y === Number(startYear)) ? Number(startMonth) : 1;
        const mEnd = (y === Number(endYear)) ? Number(endMonth) : 12;

        for (let m = mStart; m <= mEnd; m++) {
          const currentVal = y * 12 + m;
          if (currentVal >= startVal && currentVal <= endVal) {
            const rec = allFeeRecords.find(f => f.enrollmentId === enrollment.enrollmentId && f.month === m && f.year === y);
            compiledRecords.push({
              month: m,
              year: y,
              monthlyFee: enrollment.monthlyFee,
              amountPaid: rec ? (rec.amountPaid || 0) : 0,
              status: rec ? (rec.status || 'unpaid') : 'unpaid',
              remark: rec ? (rec.remark || '') : ''
            });
          }
        }
      }

      downloadClassSubjectRangeReceiptPDF({
        coaching,
        student,
        classSubjectInfo: {
          ...enrollment,
          teacherName: teacherName
        },
        monthRecords: compiledRecords,
        dateRangeText: `${startMonth}/${startYear} to ${endMonth}/${endYear}`
      });
    }

    setReceiptModal(null);
  };

  if (!student) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Loading profile context...</span>
        </div>
      </div>
    );
  }

  const isPreEnrollment = (enr) => {
    return isMonthBeforeEnrollment(enr, selectedMonth, selectedYear);
  };

  const monthlyFee = activeModalEnrollment?.monthlyFee || 0;
  const currentPaid = Number(feeRecord.amountPaid || 0);
  const amountLeft = Math.max(0, monthlyFee - currentPaid);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-xs hover:shadow-md hover:-translate-x-0.5 active:translate-x-0"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Roster
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <BookOpen className="w-3.5 h-3.5" /> Student Management
        </span>
      </div>

      {/* Main Profile Card */}
      <div className="relative overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/60 p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-gradient-to-br from-indigo-100/40 via-purple-50/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        {!isEditing ? (
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{student.name}</h1>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500 pt-0.5">
                  <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" /> {student.phone}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> {student.email || 'No email provided'}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {student.address || 'No address provided'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit Profile
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 font-semibold text-xs rounded-xl border border-red-100 shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" /> Edit Student Information
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Student Name"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Phone Number"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Email Address"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Class & Subject Enrollments Section */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base tracking-tight">Class & Subject Enrollments</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage subject status, record payments, and download receipts</p>
          </div>
          
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs">
            {student.enrollments?.length || 0} Total Subject(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {student.enrollments?.map((enr) => {
            const isActive = enr.status === 'active';
            return (
              <div 
                key={enr.enrollmentId} 
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300/80 transition-all duration-200 gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{enr.className} — {enr.subjectName}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    }`}>
                      {isActive ? <UserCheck className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                      {isActive ? 'Active' : 'Unassigned'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Monthly Fee: <strong className="text-slate-700">₹{enr.monthlyFee}</strong></span>
                    {enr.joinedAt && (
                      <>
                        <span>•</span>
                        <span>Joined: {enr.joinedAt}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  {/* Interactive Fee Ledger Button */}
                  <button
                    onClick={() => openFeeModal(enr)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 font-bold text-xs rounded-xl border border-indigo-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Fee Ledger
                  </button>

                  {/* Scoped Class-Subject Download Receipt Button */}
                  <button
                    onClick={() => setReceiptModal({ enrollment: enr })}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-slate-700 font-bold text-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 shadow-xs"
                    title="Generate & Download Receipt"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Download Receipt
                  </button>

                  {/* Interactive Re-enroll / Un-enroll Toggle Button */}
                  <button
                    onClick={() => handleToggleEnrollmentStatus(enr.enrollmentId)}
                    className={`px-3.5 py-2 font-bold text-xs rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                    }`}
                  >
                    {isActive ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    {isActive ? 'Un-enroll' : 'Re-enroll'}
                  </button>
                </div>
              </div>
            );
          })}

          {(!student.enrollments || student.enrollments.length === 0) && (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No active or past enrollments found for this student.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl border border-red-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Delete Student Profile?</h3>
                <p className="text-xs text-slate-500">Permanent data deletion warning</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-100">
              Are you sure you want to permanently delete <strong className="text-slate-900">{student.name}</strong>? 
              This will purge personal records, all active/past enrollments, and all monthly fee payment history.
              <br /><br />
              <span className="font-bold text-red-600">This action cannot be undone.</span>
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Purging Records...' : 'Yes, Delete Permanent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Fee Ledger Modal */}
      {activeModalEnrollment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Monthly Fee Ledger
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeModalEnrollment.className} — {activeModalEnrollment.subjectName} (₹{activeModalEnrollment.monthlyFee}/month)
                </p>
              </div>

              <button 
                onClick={() => setActiveModalEnrollment(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Date Picker Selectors */}
            <div className="flex gap-2">
              <select 
                value={selectedYear} 
                onChange={(e) => handleYearMonthChange(e.target.value, selectedMonth)}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <select 
                value={selectedMonth} 
                onChange={(e) => handleYearMonthChange(selectedYear, e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {isPreEnrollment(activeModalEnrollment) ? (
              <div className="p-4 bg-slate-100/80 rounded-2xl text-center text-xs text-slate-500 font-medium">
                Student was not enrolled during this selected month.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Due Breakdown Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Monthly Tuition Fee:</span> <span className="font-bold text-slate-800">₹{monthlyFee}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-emerald-600">
                    <span>Amount Paid:</span> <span className="font-bold">₹{currentPaid}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-rose-600 border-t border-slate-200/80 pt-1.5">
                    <span>Remaining Balance:</span> <span className="font-extrabold text-sm">₹{amountLeft}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fee Status</label>
                  <select
                    value={feeRecord.status}
                    onChange={(e) => setFeeRecord({ ...feeRecord, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>

                {feeRecord.status === 'partially_paid' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Paid So Far (₹)</label>
                    <input
                      type="number"
                      value={feeRecord.amountPaid || ''}
                      onChange={(e) => setFeeRecord({ ...feeRecord, amountPaid: e.target.value })}
                      placeholder="Enter paid amount"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remark (Optional)</label>
                  <input
                    type="text"
                    value={feeRecord.remark || ''}
                    onChange={(e) => setFeeRecord({ ...feeRecord, remark: e.target.value })}
                    placeholder="e.g. Paid via GPay / Cash"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {feeRecord.status === 'partially_paid' && amountLeft > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSaveFee('paid', monthlyFee)}
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Pay Remaining Balance (₹{amountLeft})
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setActiveModalEnrollment(null)} 
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              {!isPreEnrollment(activeModalEnrollment) && (
                <button 
                  onClick={() => handleSaveFee()} 
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Save Status
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Class-Subject Specific Receipt Configuration Modal */}
      {receiptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" /> Fee Receipt Configuration
                </h3>
                <p className="text-xs text-indigo-600 font-bold mt-0.5">
                  {receiptModal.enrollment.className} ({receiptModal.enrollment.subjectName})
                </p>
              </div>
              <button onClick={() => setReceiptModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-extrabold">
              <button
                onClick={() => setReceiptMode('single')}
                className={`py-2 rounded-xl transition-all ${receiptMode === 'single' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'}`}
              >
                Single Month
              </button>
              <button
                onClick={() => setReceiptMode('range')}
                className={`py-2 rounded-xl transition-all ${receiptMode === 'range' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'}`}
              >
                Range of Months
              </button>
            </div>

            {receiptMode === 'single' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
                  <select value={singleMonth} onChange={(e) => setSingleMonth(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Year</label>
                  <select value={singleYear} onChange={(e) => setSingleYear(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold">
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

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setReceiptModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button onClick={handleGenerateClassSubjectReceipt} className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md">
                Download PDF Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetailsPage;
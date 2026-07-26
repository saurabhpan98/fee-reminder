// src/pages/StudentDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Phone, Mail, MapPin, Trash2, AlertTriangle } from 'lucide-react';

export const StudentDetailsPage = ({ studentId, onBack }) => {
  const [student, setStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', email: '', address: '' });

  // Modals State
  const [activeModalEnrollment, setActiveModalEnrollment] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [feeRecord, setFeeRecord] = useState({ status: 'unpaid', remark: '', amountPaid: 0 });

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    }
  };

  // 🗑️ Delete Student & All Associated Data Logic
  const handleConfirmDeleteStudent = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete all fee records associated with this studentId across all months/years
      const feeQ = query(collection(db, 'feeRecords'), where('studentId', '==', studentId));
      const feeSnap = await getDocs(feeQ);
      const deletePromises = feeSnap.docs.map(feeDoc => deleteDoc(doc(db, 'feeRecords', feeDoc.id)));
      await Promise.all(deletePromises);

      // 2. Delete the student document itself (deletes enrollments, personal info, etc.)
      await deleteDoc(doc(db, 'students', studentId));

      // 3. Return back to Coaching View
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

  if (!student) return <div className="p-8 text-center text-slate-500">Loading student profile...</div>;

  const isPreEnrollment = (enr) => {
    const joinDate = new Date(enr.joinedAt);
    const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
    return selectedDate < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
  };

  const monthlyFee = activeModalEnrollment?.monthlyFee || 0;
  const currentPaid = Number(feeRecord.amountPaid || 0);
  const amountLeft = Math.max(0, monthlyFee - currentPaid);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        {!isEditing ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
              <div className="flex flex-wrap gap-4 text-slate-500 text-xs pt-1">
                <span className="flex items-center gap-1"><Phone size={14}/> {student.phone}</span>
                <span className="flex items-center gap-1"><Mail size={14}/> {student.email || 'N/A'}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> {student.address || 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors"
              >
                Edit Details
              </button>
              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete Student
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Update Student Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="p-2.5 border rounded-xl text-xs"
                placeholder="Student Name"
              />
              <input
                type="tel"
                required
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="p-2.5 border rounded-xl text-xs"
                placeholder="Phone Number"
              />
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="p-2.5 border rounded-xl text-xs"
                placeholder="Email Address"
              />
              <input
                type="text"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                className="p-2.5 border rounded-xl text-xs"
                placeholder="Address"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Enrollments Ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Enrolled Classes & Subjects</h3>
        <div className="space-y-3">
          {student.enrollments?.map((enr) => (
            <div key={enr.enrollmentId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-3">
              <div>
                <p className="font-bold text-slate-800 text-sm">{enr.className} — {enr.subjectName}</p>
                <p className="text-xs text-slate-500">Monthly Fee: ₹{enr.monthlyFee} | Joined: {enr.joinedAt}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openFeeModal(enr)}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-semibold text-xs rounded-lg hover:bg-indigo-100"
                >
                  View/Update Fee
                </button>
                <button
                  onClick={() => handleToggleEnrollmentStatus(enr.enrollmentId)}
                  className={`px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors ${
                    enr.status === 'active' 
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {enr.status === 'active' ? 'Un-enroll' : 'Re-enroll'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⚠️ Delete Student Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-red-100">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Delete Student Profile?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800">{student.name}</strong>? 
              This will erase all personal details, current and past subject enrollments, and all associated fee records across all months/years. 
              <br /><br />
              <span className="font-bold text-red-600">This action cannot be undone.</span>
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Ledger Modal */}
      {activeModalEnrollment && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Monthly Fee Ledger</h3>
            <p className="text-xs text-slate-500">{activeModalEnrollment.className} — {activeModalEnrollment.subjectName} (₹{activeModalEnrollment.monthlyFee}/month)</p>

            <div className="flex gap-2">
              <select 
                value={selectedYear} 
                onChange={(e) => handleYearMonthChange(e.target.value, selectedMonth)}
                className="flex-1 p-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                value={selectedMonth} 
                onChange={(e) => handleYearMonthChange(selectedYear, e.target.value)}
                className="flex-1 p-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {isPreEnrollment(activeModalEnrollment) ? (
              <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-500 font-medium">
                Student was not enrolled during this month.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Monthly Fee:</span> <span>₹{monthlyFee}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-emerald-600">
                    <span>Amount Paid:</span> <span>₹{currentPaid}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-red-600 border-t border-slate-200 pt-1">
                    <span>Amount Left:</span> <span>₹{amountLeft}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Set Status</label>
                  <select
                    value={feeRecord.status}
                    onChange={(e) => setFeeRecord({ ...feeRecord, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>

                {feeRecord.status === 'partially_paid' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid So Far (₹)</label>
                    <input
                      type="number"
                      value={feeRecord.amountPaid || ''}
                      onChange={(e) => setFeeRecord({ ...feeRecord, amountPaid: e.target.value })}
                      placeholder="Enter paid amount"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remark</label>
                  <input
                    type="text"
                    value={feeRecord.remark || ''}
                    onChange={(e) => setFeeRecord({ ...feeRecord, remark: e.target.value })}
                    placeholder="e.g. Paid via GPay / Cash"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                {feeRecord.status === 'partially_paid' && amountLeft > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSaveFee('paid', monthlyFee)}
                    className="w-full py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    Pay Remaining Balance (₹{amountLeft})
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setActiveModalEnrollment(null)} className="px-4 py-2 text-xs font-semibold text-slate-500">
                Cancel
              </button>
              {!isPreEnrollment(activeModalEnrollment) && (
                <button onClick={() => handleSaveFee()} className="px-4 py-2 text-xs bg-indigo-600 text-white font-semibold rounded-xl">
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
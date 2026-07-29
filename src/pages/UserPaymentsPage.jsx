// src/pages/UserPaymentsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  addDoc, updateDoc, doc, getDocs 
} from 'firebase/firestore';
import { 
  Plus, CreditCard, Clock, CheckCircle, XCircle, 
  ArrowLeft, Edit3, X, MessageSquare, History, Filter, Building2, Check 
} from 'lucide-react';

export const UserPaymentsPage = ({ currentUser, userData, onBack }) => {
  const [payments, setPayments] = useState([]);
  const [coachings, setCoachings] = useState([]);
  const [selectedCoachingFilter, setSelectedCoachingFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [formData, setFormData] = useState({
    coachingId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    paymentDetails: '',
    userRemarks: ''
  });

  // Fetch all coachings owned/registered by this user
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchUserCoachings = async () => {
      const combinedDocs = new Map();
      const coachingRef = collection(db, 'coachings');
      const idsToTest = Array.from(new Set([
        currentUser.uid,
        currentUser.email
      ].filter(Boolean)));

      for (const testId of idsToTest) {
        const fieldQueries = [
          getDocs(query(coachingRef, where('userId', '==', testId))),
          getDocs(query(coachingRef, where('teacherId', '==', testId))),
          getDocs(query(coachingRef, where('ownerId', '==', testId))),
          getDocs(query(coachingRef, where('userEmail', '==', testId))),
          getDocs(query(coachingRef, where('email', '==', testId)))
        ];
        const results = await Promise.all(fieldQueries);
        results.forEach(snap => {
          snap.docs.forEach(d => combinedDocs.set(d.id, { id: d.id, ...d.data() }));
        });
      }
      const coachingList = Array.from(combinedDocs.values());
      setCoachings(coachingList);

      if (coachingList.length === 1) {
        setFormData(prev => ({ ...prev, coachingId: coachingList[0].id }));
      }
    };

    fetchUserCoachings();
  }, [currentUser.uid, currentUser.email]);

  // Real-time Payments Listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'payments'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => {
        const data = d.data();
        
        if (data.userRead === false) {
          updateDoc(doc(db, 'payments', d.id), { userRead: true }).catch(console.error);
        }

        return { id: d.id, ...data };
      });

      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPayments(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  const handleOpenAdd = () => {
    setEditingPayment(null);
    setFormData({
      coachingId: coachings.length > 0 ? coachings[0].id : '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: '',
      paymentDetails: '',
      userRemarks: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      coachingId: payment.coachingId || (coachings.length > 0 ? coachings[0].id : ''),
      month: payment.month,
      year: payment.year,
      amount: payment.amount,
      paymentDetails: payment.paymentDetails || '',
      userRemarks: payment.userRemarks || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.coachingId) {
      alert("Please select a coaching center for this payment.");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const selectedCoachingObj = coachings.find(c => c.id === formData.coachingId);
    const coachingName = selectedCoachingObj?.name || selectedCoachingObj?.coachingName || 'Tuition Center';

    try {
      const nowISO = new Date().toISOString();

      if (editingPayment) {
        const updatedUserHistory = editingPayment.userRemarksHistory || [];
        if (formData.userRemarks) {
          updatedUserHistory.push({
            remark: formData.userRemarks,
            timestamp: nowISO
          });
        }

        await updateDoc(doc(db, 'payments', editingPayment.id), {
          coachingId: formData.coachingId,
          coachingName: coachingName,
          month: Number(formData.month),
          year: Number(formData.year),
          amount: Number(formData.amount),
          paymentDetails: formData.paymentDetails,
          userRemarks: formData.userRemarks,
          userRemarksHistory: updatedUserHistory,
          status: 'pending',
          userRead: true,
          updatedAt: nowISO
        });
      } else {
        const initialUserHistory = formData.userRemarks ? [{ remark: formData.userRemarks, timestamp: nowISO }] : [];

        await addDoc(collection(db, 'payments'), {
          userId: currentUser.uid,
          userName: userData?.name || currentUser.email,
          userEmail: currentUser.email,
          coachingId: formData.coachingId,
          coachingName: coachingName,
          month: Number(formData.month),
          year: Number(formData.year),
          amount: Number(formData.amount),
          paymentDetails: formData.paymentDetails,
          userRemarks: formData.userRemarks,
          userRemarksHistory: initialUserHistory,
          adminRemarks: '',
          adminRemarksHistory: [],
          status: 'pending',
          userRead: true,
          createdAt: nowISO
        });
      }

      setShowAddModal(false);
      setEditingPayment(null);
    } catch (err) {
      console.error("Error saving payment:", err);
      alert("Failed to submit payment: " + err.message);
    }
  };

  // Filter Payments based on Coaching selection if user has multiple coachings
  const filteredPayments = payments.filter(p => {
    if (coachings.length <= 1 || selectedCoachingFilter === 'all') return true;
    return p.coachingId === selectedCoachingFilter;
  });

  // Separate Active Processing/Rejected (Box View) from Accepted Payments (List View)
  const activeProcessingPayments = filteredPayments.filter(p => p.status === 'pending' || p.status === 'rejected');
  const acceptedPayments = filteredPayments.filter(p => p.status === 'accepted');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all"
        >
          <Plus size={16} /> Add Payment
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment History & Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">Submit payment details for admin approval and view transaction history</p>
          </div>

          {/* Render Filter ONLY if user has more than 1 coaching */}
          {coachings.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
              <Filter size={14} className="text-slate-400 ml-1" />
              <label className="text-xs font-bold text-slate-500">Coaching:</label>
              <select
                value={selectedCoachingFilter}
                onChange={(e) => setSelectedCoachingFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer pr-2"
              >
                <option value="all">All Coachings ({coachings.length})</option>
                {coachings.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.coachingName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">Loading payments...</div>
        ) : (
          <>
            {/* 1. UNDER PROCESSING & REJECTED PAYMENTS (BOX CARDS VIEW) */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Active Requests & Processing ({activeProcessingPayments.length})
              </h3>

              {activeProcessingPayments.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs font-medium border border-slate-100">
                  No active pending or rejected payment requests.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeProcessingPayments.map((p) => {
                    const isPending = p.status === 'pending';
                    const isRejected = p.status === 'rejected';

                    const monthName = new Date(0, p.month - 1).toLocaleString('default', { month: 'long' });
                    const adminHistory = p.adminRemarksHistory || [];

                    return (
                      <div
                        key={p.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                          isPending
                            ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                            : 'bg-rose-50/80 border-rose-300 text-rose-900'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                                {monthName} {p.year}
                              </span>
                              <h3 className="text-xl font-black mt-0.5">₹{p.amount}</h3>
                              <p className="text-[11px] font-extrabold text-indigo-700 flex items-center gap-1 mt-1">
                                <Building2 size={12} /> {p.coachingName || 'Tuition Center'}
                              </p>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 border uppercase ${
                              isPending
                                ? 'bg-amber-200/80 text-amber-900 border-amber-300'
                                : 'bg-rose-200/80 text-rose-900 border-rose-300'
                            }`}>
                              {isPending ? <Clock size={12} /> : <XCircle size={12} />}
                              {isPending ? 'Under Processing' : 'Rejected'}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 bg-white/60 p-3 rounded-xl border border-black/5">
                            <p><strong>Payment Details:</strong> {p.paymentDetails || 'N/A'}</p>
                            {p.userRemarks && <p><strong>Your Remark:</strong> {p.userRemarks}</p>}
                            <p className="text-[10px] opacity-60 pt-1">
                              Submitted on: {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>

                          {/* Admin Remarks Thread */}
                          {adminHistory.length > 0 ? (
                            <div className="p-3 rounded-xl text-xs space-y-2 border bg-white/80 border-slate-200">
                              <p className="font-bold flex items-center gap-1 text-[11px] text-slate-700">
                                <History size={12} className="text-indigo-600" /> Admin Feedback History:
                              </p>
                              <div className="space-y-1.5 divide-y divide-slate-100">
                                {adminHistory.map((item, idx) => (
                                  <div key={idx} className="pt-1 text-[11px]">
                                    <p className="font-semibold text-slate-800">{item.remark}</p>
                                    <p className="text-[9px] text-slate-400">
                                      {new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : p.adminRemarks ? (
                            <div className="p-3 rounded-xl text-xs space-y-0.5 border bg-white/80 border-slate-200">
                              <p className="font-bold flex items-center gap-1 text-[11px]">
                                <MessageSquare size={12} /> Admin Remark:
                              </p>
                              <p>{p.adminRemarks}</p>
                            </div>
                          ) : null}
                        </div>

                        {isRejected && (
                          <div className="pt-2 border-t border-rose-200 flex justify-end">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <Edit3 size={14} /> Edit & Resubmit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. ACCEPTED PAYMENTS HISTORY (TABLE LIST VIEW LIKE ADMIN PORTAL) */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" /> Approved Payments History ({acceptedPayments.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-bold">Coaching Name</th>
                      <th className="px-4 py-3 font-bold">Month/Year</th>
                      <th className="px-4 py-3 font-bold">Amount</th>
                      <th className="px-4 py-3 font-bold">Date of Payment</th>
                      <th className="px-4 py-3 font-bold">Details</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {acceptedPayments.map(p => {
                      const acceptanceDate = p.updatedAt 
                        ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-';

                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-extrabold text-indigo-700">
                            {p.coachingName || 'Tuition Center'}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {new Date(0, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900">₹{p.amount}</td>
                          <td className="px-4 py-3 font-bold text-emerald-700">
                            {acceptanceDate}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.paymentDetails || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                              <Check size={10} /> Accepted
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.adminRemarks || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {acceptedPayments.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-slate-100/80">
                    No approved payments found.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-600" />
                {editingPayment ? 'Resubmit Payment Details' : 'Add New Payment'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Coaching / Tuition</label>
                <select
                  required
                  value={formData.coachingId}
                  onChange={(e) => setFormData({ ...formData, coachingId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>-- Select Coaching Center --</option>
                  {coachings.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.coachingName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
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
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Details (Mode / Txn ID)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via UPI Txn ID: 9876XXXX"
                  value={formData.paymentDetails}
                  onChange={(e) => setFormData({ ...formData, paymentDetails: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Your Remark (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Add any extra notes..."
                  value={formData.userRemarks}
                  onChange={(e) => setFormData({ ...formData, userRemarks: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:bg-indigo-700"
                >
                  {editingPayment ? 'Resubmit Payment' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPaymentsPage;
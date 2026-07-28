// src/pages/UserPaymentsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  addDoc, updateDoc, doc, arrayUnion 
} from 'firebase/firestore';
import { 
  Plus, CreditCard, Clock, CheckCircle, XCircle, 
  ArrowLeft, Edit3, X, MessageSquare, History 
} from 'lucide-react';

export const UserPaymentsPage = ({ currentUser, userData, onBack }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    paymentDetails: '',
    userRemarks: ''
  });

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
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      const nowISO = new Date().toISOString();

      if (editingPayment) {
        // Prepare historical entry for user remarks if updated
        const updatedUserHistory = editingPayment.userRemarksHistory || [];
        if (formData.userRemarks) {
          updatedUserHistory.push({
            remark: formData.userRemarks,
            timestamp: nowISO
          });
        }

        // Resubmit rejected payment preserving admin remarks history
        await updateDoc(doc(db, 'payments', editingPayment.id), {
          month: Number(formData.month),
          year: Number(formData.year),
          amount: Number(formData.amount),
          paymentDetails: formData.paymentDetails,
          userRemarks: formData.userRemarks,
          userRemarksHistory: updatedUserHistory,
          status: 'pending', // Reset status to Orange for processing
          userRead: true,
          updatedAt: nowISO
        });
      } else {
        // New Payment Request
        const initialUserHistory = formData.userRemarks ? [{ remark: formData.userRemarks, timestamp: nowISO }] : [];

        await addDoc(collection(db, 'payments'), {
          userId: currentUser.uid,
          userName: userData?.name || currentUser.email,
          userEmail: currentUser.email,
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
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

      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment History & Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">Submit payment details for admin approval</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
            {payments.length} Record(s)
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-3">
            <CreditCard size={32} className="mx-auto text-slate-300" />
            <p>No payment records added yet. Click "+ Add Payment" to create a request.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payments.map((p) => {
              const isPending = p.status === 'pending';
              const isAccepted = p.status === 'accepted';
              const isRejected = p.status === 'rejected';

              const monthName = new Date(0, p.month - 1).toLocaleString('default', { month: 'long' });
              const adminHistory = p.adminRemarksHistory || [];

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                    isPending
                      ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                      : isRejected
                      ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                          {monthName} {p.year}
                        </span>
                        <h3 className="text-xl font-black mt-0.5">₹{p.amount}</h3>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 border uppercase ${
                        isPending
                          ? 'bg-amber-200/80 text-amber-900 border-amber-300'
                          : isRejected
                          ? 'bg-rose-200/80 text-rose-900 border-rose-300'
                          : 'bg-emerald-200/80 text-emerald-900 border-emerald-300'
                      }`}>
                        {isPending && <Clock size={12} />}
                        {isAccepted && <CheckCircle size={12} />}
                        {isRejected && <XCircle size={12} />}
                        {isPending ? 'Under Processing' : isAccepted ? 'Approved' : 'Rejected'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 bg-white/60 p-3 rounded-xl border border-black/5">
                      <p><strong>Payment Details:</strong> {p.paymentDetails || 'N/A'}</p>
                      {p.userRemarks && <p><strong>Your Remark:</strong> {p.userRemarks}</p>}
                      <p className="text-[10px] opacity-60 pt-1">
                        Submitted on: {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Admin Remarks Section & Historical Audit Thread */}
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
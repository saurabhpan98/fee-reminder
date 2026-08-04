// src/pages/UserPaymentsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { 
  Plus, CreditCard, Clock, CheckCircle, XCircle, 
  ArrowLeft, Edit3, X, MessageSquare, History, Check, Sparkles, Shield, Trash2, AlertTriangle, AlertCircle
} from 'lucide-react';
import { getUserPlanConfig, PLAN_CONFIG, PLANS } from '../utils/planUtils';

export const UserPaymentsPage = ({ currentUser, userData, onBack }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Cancel Confirmation Modal State
  const [cancellingPayment, setCancellingPayment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastInfo, setToastInfo] = useState(null); // { message }

  const currentPlan = getUserPlanConfig(userData);

  const [formData, setFormData] = useState({
    paymentType: 'monthly', // 'monthly' | 'upgrade'
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: currentPlan.price,
    paymentDetails: '',
    userRemarks: ''
  });

  // Auto-dismiss Toast Notification after 4 seconds
  useEffect(() => {
    if (toastInfo) {
      const timer = setTimeout(() => {
        setToastInfo(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastInfo]);

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

  // Check if user already has an active (pending OR rejected) request for plan upgrade
  const hasExistingUpgradeRequest = payments.some(
    p => p.isPlanUpgradeRequest && (p.status === 'pending' || p.status === 'rejected')
  );

  const handlePaymentTypeChange = (type) => {
    setToastInfo(null);
    const targetAmount = type === 'upgrade' ? PLAN_CONFIG[PLANS.PRO].price : currentPlan.price;
    setFormData(prev => ({
      ...prev,
      paymentType: type,
      amount: targetAmount
    }));
  };

  const handleOpenAdd = () => {
    setEditingPayment(null);
    setToastInfo(null);
    setFormData({
      paymentType: 'monthly',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: currentPlan.price,
      paymentDetails: '',
      userRemarks: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (payment) => {
    setEditingPayment(payment);
    setToastInfo(null);
    const isUpgrade = payment.isPlanUpgradeRequest;
    setFormData({
      paymentType: isUpgrade ? 'upgrade' : 'monthly',
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
    setToastInfo(null);

    const isUpgrade = formData.paymentType === 'upgrade';

    // Show Red Toast Notification at bottom if already submitted
    if (isUpgrade && !editingPayment && hasExistingUpgradeRequest) {
      setToastInfo({ message: 'Request already submitted.' });
      return;
    }

    if (!formData.amount || Number(formData.amount) < 0) {
      setToastInfo({ message: 'Please enter a valid payment amount.' });
      return;
    }

    const planName = isUpgrade ? PLAN_CONFIG[PLANS.PRO].name : currentPlan.name;

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
          coachingId: null,
          coachingName: isUpgrade ? 'User Account Plan Upgrade' : `Monthly Subscription (${planName})`,
          isPlanUpgradeRequest: isUpgrade,
          targetPlan: isUpgrade ? PLANS.PRO : (userData?.plan || PLANS.STARTER),
          planName: planName,
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
          coachingId: null,
          coachingName: isUpgrade ? 'User Account Plan Upgrade' : `Monthly Subscription (${planName})`,
          isPlanUpgradeRequest: isUpgrade,
          targetPlan: isUpgrade ? PLANS.PRO : (userData?.plan || PLANS.STARTER),
          planName: planName,
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
      setToastInfo({ message: "Failed to submit payment: " + err.message });
    }
  };

  // Delete/Cancel Payment Request directly from Database
  const handleConfirmCancelRequest = async () => {
    if (!cancellingPayment) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'payments', cancellingPayment.id));
      setCancellingPayment(null);
    } catch (err) {
      console.error("Error cancelling payment request:", err);
      alert("Failed to cancel request: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeProcessingPayments = payments.filter(p => p.status === 'pending' || p.status === 'rejected');
  const acceptedPayments = payments.filter(p => p.status === 'accepted');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300 relative">
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
            <p className="text-xs text-slate-500 mt-0.5">Submit subscription payment details for admin approval and view transaction history</p>
          </div>
          <div className="px-3.5 py-1.5 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span>Current Plan: {currentPlan.name}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">Loading payments...</div>
        ) : (
          <>
            {/* 1. ACTIVE REQUESTS & PROCESSING (CARDS VIEW) */}
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
                              <h3 className="text-xl font-black mt-0.5">₹ {p.amount}</h3>

                              {p.isPlanUpgradeRequest ? (
                                <p className="text-[11px] font-extrabold text-indigo-700 flex items-center gap-1.5 mt-1 bg-indigo-100/80 px-2.5 py-1 rounded-lg w-fit">
                                  <Sparkles size={13} className="text-indigo-600 shrink-0" />
                                  <span>User Account Plan Upgrade (Pro Academy)</span>
                                </p>
                              ) : (
                                <p className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5 mt-1 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
                                  <Shield size={13} className="text-indigo-600 shrink-0" />
                                  <span>Monthly Payment ({p.planName || currentPlan.name})</span>
                                </p>
                              )}
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

                        {/* Card Actions: Edit (if rejected) & Cancel Request */}
                        <div className="pt-2 border-t border-slate-200/60 flex justify-end items-center gap-2">
                          <button
                            onClick={() => setCancellingPayment(p)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <Trash2 size={13} /> Cancel Request
                          </button>

                          {isRejected && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            >
                              <Edit3 size={13} /> Edit & Resubmit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. ACCEPTED PAYMENTS HISTORY TABLE */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" /> Approved Payments History ({acceptedPayments.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-bold">Type of Payment</th>
                      <th className="px-4 py-3 font-bold">Month/Year</th>
                      <th className="px-4 py-3 font-bold">Amount</th>
                      <th className="px-4 py-3 font-bold">Date of Payment</th>
                      <th className="px-4 py-3 font-bold">Date of Acceptance</th>
                      <th className="px-4 py-3 font-bold">Details</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {acceptedPayments.map(p => {
                      const submissionDate = p.createdAt 
                        ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
                        : '-';
                      const acceptanceDate = p.updatedAt 
                        ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
                        : '-';

                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-extrabold text-indigo-700">
                            {p.isPlanUpgradeRequest ? (
                              <span className="flex items-center gap-1.5 text-indigo-700">
                                <Sparkles size={13} className="text-amber-500" /> Plan Upgrade to Pro Academy
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-slate-700">
                                <Shield size={13} className="text-indigo-600" /> Monthly Payment (Current Plan: {p.planName || currentPlan.name})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {new Date(0, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900">₹ {p.amount}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {submissionDate}
                          </td>
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

      {/* Cancel Request Confirmation Modal */}
      {cancellingPayment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl"><AlertTriangle size={22}/></div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Cancel Payment Request?</h3>
                <p className="text-xs text-slate-500">Delete request from database</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs text-slate-700 space-y-1">
              <p>Type: <strong>{cancellingPayment.isPlanUpgradeRequest ? 'User Account Plan Upgrade' : 'Monthly Subscription'}</strong></p>
              <p>Amount: <strong>₹ {cancellingPayment.amount}</strong></p>
              <p>Details: <strong>{cancellingPayment.paymentDetails || 'N/A'}</strong></p>
              <p className="text-rose-600 font-bold pt-1">
                This request will be permanently removed from both your portal and the Admin Dashboard.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingPayment(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRequest}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                {isDeleting ? 'Deleting...' : 'Yes, Delete & Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-600" />
                {editingPayment ? 'Resubmit Payment Details' : 'Add Subscription Payment'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Payment Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('monthly')}
                    className={`py-2 rounded-xl transition-all ${
                      formData.paymentType === 'monthly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Monthly Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('upgrade')}
                    className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                      formData.paymentType === 'upgrade' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <Sparkles size={12} /> Plan Upgrade
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900 text-white rounded-2xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Target Account Subscription Plan:</span>
                <p className="font-extrabold text-sm flex items-center gap-1.5">
                  <Shield size={14} className="text-amber-400" />
                  {formData.paymentType === 'upgrade' ? PLAN_CONFIG[PLANS.PRO].name : currentPlan.name}
                </p>
                <p className="text-[11px] text-slate-300">
                  Default price: {formData.paymentType === 'upgrade' ? PLAN_CONFIG[PLANS.PRO].priceLabel : currentPlan.priceLabel}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Month</label>
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Year</label>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (Auto-set by plan)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1200"
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

      {/* Red Notification Toast at Bottom Right */}
      {toastInfo && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="px-4 py-3 rounded-2xl shadow-2xl border bg-rose-600 border-rose-700 text-white flex items-center gap-3 max-w-sm text-xs font-bold">
            <div className="p-1.5 bg-white/20 rounded-xl shrink-0">
              <AlertCircle size={18} />
            </div>
            <p className="flex-1 leading-snug">{toastInfo.message}</p>
            <button
              onClick={() => setToastInfo(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPaymentsPage;
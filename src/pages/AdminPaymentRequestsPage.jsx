// src/pages/AdminPaymentRequestsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Check, XCircle, CreditCard, MessageSquare, History, Building2, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { PLANS, PLAN_CONFIG } from '../utils/planUtils';

export const AdminPaymentRequestsPage = ({ onBack }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [adminRemark, setAdminRemark] = useState('');

  // Toast Notification State
  const [toastInfo, setToastInfo] = useState(null); // { message, isError }

  // Auto-dismiss Toast after 4 seconds
  useEffect(() => {
    if (toastInfo) {
      const timer = setTimeout(() => {
        setToastInfo(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastInfo]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPayments(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openActionModal = (payment, action) => {
    setActiveModal({ payment, action });
    setAdminRemark('');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!activeModal) return;

    const { payment, action } = activeModal;
    const isAccept = action === 'accept';
    const nowISO = new Date().toISOString();
    const currentHistory = payment.adminRemarksHistory || [];
    const newRemarkText = adminRemark || (isAccept ? 'Approved by Admin' : 'Rejected by Admin');

    // Append current decision & remark to admin history thread
    const updatedHistory = [
      ...currentHistory,
      {
        action: isAccept ? 'accepted' : 'rejected',
        remark: newRemarkText,
        timestamp: nowISO
      }
    ];

    try {
      const paymentRef = doc(db, 'payments', payment.id);
      await updateDoc(paymentRef, {
        status: isAccept ? 'accepted' : 'rejected',
        adminRemarks: newRemarkText,
        adminRemarksHistory: updatedHistory,
        userRead: false,
        updatedAt: nowISO
      });

      // If this was a user account plan upgrade or downgrade request and accepted, activate target plan and set notification
      if (isAccept && (payment.isPlanUpgradeRequest || payment.isPlanDowngradeRequest) && payment.userId) {
        const targetPlanId = payment.targetPlan || PLANS.PRO;
        const targetPlanConfig = PLAN_CONFIG[targetPlanId];
        const userRef = doc(db, 'users', payment.userId);
        
        await updateDoc(userRef, {
          plan: targetPlanId,
          planNotification: {
            show: true,
            planName: targetPlanConfig?.name || 'Pro Academy'
          }
        });
      }

      const userName = payment.userName || 'User';

      // Trigger respective Toast Message
      if (isAccept) {
        if (payment.isPlanUpgradeRequest) {
          setToastInfo({
            message: `Plan upgrade request accepted for ${userName}`,
            isError: false
          });
        } else if (payment.isPlanDowngradeRequest) {
          setToastInfo({
            message: `Plan downgrade request accepted for ${userName}`,
            isError: false
          });
        } else if(payment.isCustomPayment) {
          setToastInfo({
            message: `Custom payment accepted for ${userName}`,
            isError: false
          });
        } else {
          setToastInfo({
            message: `Monthly payment accepted for ${userName}`,
            isError: false
          });
        }
      } else {
        if (payment.isPlanUpgradeRequest) {
          setToastInfo({
            message: `Plan upgrade request rejected for ${userName}`,
            isError: true
          });
        } else if (payment.isPlanDowngradeRequest) {
          setToastInfo({
            message: `Plan downgrade request rejected for ${userName}`,
            isError: true
          });
        } else if(payment.isCustomPayment) {
          setToastInfo({
            message: `Custom payment request rejected for ${userName}`,
            isError: true
          });
        } else {
          setToastInfo({
            message: `Monthly Payment request rejected for ${userName}`,
            isError: true
          });
        }
      }

      setActiveModal(null);
      setAdminRemark('');
    } catch (err) {
      console.error("Error updating payment status:", err);
      setToastInfo({
        message: `Failed to update status: ${err.message}`,
        isError: true
      });
    }
  };

  const activeRequests = payments.filter(p => p.status === 'pending' || p.status === 'rejected');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300 relative">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Back to Users List
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment Verification Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">Review, accept, or reject fee payment submissions & user plan upgrade requests</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
            {activeRequests.length} Pending / Rejected
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">Loading requests...</div>
        ) : activeRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
            <CreditCard size={32} className="mx-auto text-slate-300" />
            <p>No active pending payment requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRequests.map((p) => {
              const isPending = p.status === 'pending';
              const isRejected = p.status === 'rejected';
              const monthName = new Date(0, p.month - 1).toLocaleString('default', { month: 'long' });
              const adminHistory = p.adminRemarksHistory || [];

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                    isRejected
                      ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                      : 'bg-amber-50/70 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b border-black/5 pb-2">
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{p.userName}</p>
                        <p className="text-[11px] text-slate-500">{p.userEmail}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isRejected ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-amber-200 text-amber-900 border border-amber-300'
                      }`}>
                        {isPending ? 'Pending Review' : 'Rejected'}
                      </span>
                    </div>

                    {/* Differentiate User Plan Upgrade vs Coaching Payment */}
                    {p.isPlanUpgradeRequest ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-xs">
                        <Sparkles size={14} className="shrink-0 text-amber-300" />
                        <span>USER PLAN UPGRADE → PRO ACADEMY</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700">
                        <Building2 size={14} className="shrink-0 text-indigo-600" />
                        <span className="truncate">{p.coachingName || 'Tuition Center'}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-extrabold uppercase opacity-70">
                        {monthName} {p.year}
                      </span>
                      <p className="text-2xl font-black text-slate-900">₹{p.amount}</p>
                    </div>

                    <div className="text-xs space-y-1 bg-white/70 p-3 rounded-xl border border-black/5">
                      {!p.isPlanUpgradeRequest && <p><strong>Coaching:</strong> {p.coachingName || 'N/A'}</p>}
                      <p><strong>Details:</strong> {p.paymentDetails || 'N/A'}</p>
                      {p.userRemarks && <p><strong>User Remark:</strong> {p.userRemarks}</p>}
                    </div>

                    {/* Historical Remarks Thread */}
                    {adminHistory.length > 0 && (
                      <div className="p-3 bg-white/90 rounded-xl border border-black/10 space-y-2 text-xs">
                        <p className="font-bold flex items-center gap-1 text-[11px] text-slate-700">
                          <History size={12} className="text-indigo-600" /> Previous Admin Remarks:
                        </p>
                        <div className="space-y-1.5 divide-y divide-slate-100">
                          {adminHistory.map((item, idx) => (
                            <div key={idx} className="pt-1 text-[11px]">
                              <p className={`font-bold ${item.action === 'rejected' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                [{item.action?.toUpperCase()}] <span className="font-medium text-slate-800">{item.remark}</span>
                              </p>
                              <p className="text-[9px] text-slate-400">
                                {new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                    <button
                      onClick={() => openActionModal(p, 'accept')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <Check size={14} /> Accept
                    </button>
                    {isPending && (
                      <button
                        onClick={() => openActionModal(p, 'reject')}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 transition-all"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <MessageSquare size={18} className={activeModal.action === 'accept' ? 'text-emerald-600' : 'text-rose-600'} />
              {activeModal.action === 'accept' ? 'Accept Request' : 'Reject Request'}
            </h3>
            <div className="text-xs text-slate-600 space-y-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p>User: <strong>{activeModal.payment.userName}</strong></p>
              {!activeModal.payment.isPlanUpgradeRequest && (
                <p>Coaching: <strong>{activeModal.payment.coachingName || 'Tuition Center'}</strong></p>
              )}
              <p>Amount: <strong>₹{activeModal.payment.amount}</strong></p>
              {activeModal.payment.isPlanUpgradeRequest && (
                <p className="text-indigo-600 font-extrabold pt-1">
                  ★ Will automatically upgrade user account plan to PRO ACADEMY upon acceptance!
                </p>
              )}
            </div>
            <form onSubmit={handleConfirmAction} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Admin Remark / Note
                </label>
                <textarea
                  rows="3"
                  placeholder={activeModal.action === 'accept' ? 'e.g. Activated Pro Plan for User Account' : 'e.g. Transaction ID invalid'}
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all ${
                    activeModal.action === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {activeModal.action === 'accept' ? 'Acceptance' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification at Bottom Right */}
      {toastInfo && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-sm text-xs font-bold text-white ${
            toastInfo.isError
              ? 'bg-rose-600 border-rose-700'
              : 'bg-emerald-600 border-emerald-700'
          }`}>
            <div className="p-1.5 bg-white/20 rounded-xl shrink-0">
              {toastInfo.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
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
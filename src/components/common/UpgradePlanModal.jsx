// src/components/common/UpgradePlanModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Sparkles, CheckCircle2, X, AlertCircle, Send, ArrowDownCircle, CreditCard } from 'lucide-react';
import { PLANS, PLAN_CONFIG } from '../../utils/planUtils';

export const UpgradePlanModal = ({ isOpen, onClose, currentUser, userData }) => {
  const isCurrentPro = userData?.plan === PLANS.PRO;
  const [selectedPlan, setSelectedPlan] = useState(isCurrentPro ? PLANS.STARTER : PLANS.PRO);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [userRemarks, setUserRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRequests, setPayments] = useState([]);
  const [toastInfo, setToastInfo] = useState(null);

  useEffect(() => {
    if (isCurrentPro) {
      setSelectedPlan(PLANS.STARTER);
    } else {
      setSelectedPlan(PLANS.PRO);
    }
  }, [isCurrentPro, isOpen]);

  useEffect(() => {
    if (toastInfo) {
      const timer = setTimeout(() => setToastInfo(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastInfo]);

  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPayments(list);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, isOpen]);

  const existingUpgradeRequest = pendingRequests.find(
    p => p.isPlanUpgradeRequest && (p.status === 'pending' || p.status === 'rejected')
  );
  const existingDowngradeRequest = pendingRequests.find(
    p => p.isPlanDowngradeRequest && p.status === 'pending'
  );

  if (!isOpen) return null;

  const proConfig = PLAN_CONFIG[PLANS.PRO];
  const isDowngradeMode = isCurrentPro && selectedPlan === PLANS.STARTER;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToastInfo(null);

    const nowISO = new Date().toISOString();

    if (isDowngradeMode) {
      if (existingDowngradeRequest) {
        setToastInfo({ message: 'Downgrade request already submitted and pending admin approval.' });
        return;
      }

      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'payments'), {
          userId: currentUser.uid,
          userName: userData?.name || currentUser.email,
          userEmail: currentUser.email,
          coachingId: null,
          coachingName: 'User Account Plan Downgrade Request',
          isPlanUpgradeRequest: false,
          isPlanDowngradeRequest: true,
          targetPlan: PLANS.STARTER,
          planName: PLAN_CONFIG[PLANS.STARTER].name,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          amount: 0,
          paymentDetails: 'Plan Downgrade Request (No Payment Required)',
          userRemarks: userRemarks.trim() || 'Requesting downgrade to Starter Free Plan',
          userRemarksHistory: userRemarks.trim() ? [{ remark: userRemarks.trim(), timestamp: nowISO }] : [],
          adminRemarks: '',
          adminRemarksHistory: [],
          status: 'pending',
          userRead: true,
          createdAt: nowISO
        });

        setIsSubmitting(false);
        setUserRemarks('');
        onClose();
      } catch (err) {
        console.error('Error submitting downgrade request:', err);
        setToastInfo({ message: 'Failed to submit downgrade request: ' + err.message });
        setIsSubmitting(false);
      }
      return;
    }

    // Upgrade Request Flow
    if (existingUpgradeRequest) {
      setToastInfo({ message: 'already submitted.' });
      return;
    }

    if (!paymentDetails.trim()) {
      setToastInfo({ message: 'Please enter transaction or payment mode details.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const initialHistory = userRemarks.trim() ? [{ remark: userRemarks.trim(), timestamp: nowISO }] : [];

      await addDoc(collection(db, 'payments'), {
        userId: currentUser.uid,
        userName: userData?.name || currentUser.email,
        userEmail: currentUser.email,
        coachingId: null,
        coachingName: 'User Account Plan Upgrade',
        isPlanUpgradeRequest: true,
        isPlanDowngradeRequest: false,
        targetPlan: PLANS.PRO,
        planName: proConfig.name,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: proConfig.price,
        paymentDetails: paymentDetails.trim(),
        userRemarks: userRemarks.trim(),
        userRemarksHistory: initialHistory,
        adminRemarks: '',
        adminRemarksHistory: [],
        status: 'pending',
        userRead: true,
        createdAt: nowISO
      });

      setIsSubmitting(false);
      setPaymentDetails('');
      setUserRemarks('');
      onClose();
    } catch (err) {
      console.error('Error submitting plan upgrade request:', err);
      setToastInfo({ message: 'Failed to submit request: ' + err.message });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-100 relative">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Sparkles size={22} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Subscription Plan Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">Switch or manage your user account tier</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Plan Selector Buttons */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedPlan(PLANS.STARTER)}
              className={`py-2.5 rounded-xl transition-all ${
                selectedPlan === PLANS.STARTER ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Starter Teacher (Free)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan(PLANS.PRO)}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedPlan === PLANS.PRO ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
              }`}
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>Pro Academy (₹1200)</span>
            </button>
          </div>

          {/* Plan Summary Card */}
          {isDowngradeMode ? (
            <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-sm text-amber-800">
                <ArrowDownCircle size={18} />
                <span>Request Downgrade to Starter Free Plan</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                No payment is required to downgrade. Upon submitting, a request will be sent to the Admin. Once accepted, your account will be moved to the Starter Free Plan.
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-3 shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">
                  {proConfig.name} Plan Features
                </span>
                <span className="text-base font-black text-emerald-400">{proConfig.priceLabel}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-300 pt-1">
                {proConfig.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isDowngradeMode && (
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Payment Transaction Details / UPI Ref ID (₹{proConfig.price})
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paid via UPI Ref ID: 9876XXXXXX"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Note / Remark (Optional)
              </label>
              <input
                type="text"
                placeholder={isDowngradeMode ? "Reason for downgrading..." : "e.g. Please activate Pro Plan for my user account"}
                value={userRemarks}
                onChange={(e) => setUserRemarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Form Controls */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 ${
                  isDowngradeMode ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {isDowngradeMode ? <Send size={15} /> : <CreditCard size={15} />}
                <span>
                  {isSubmitting 
                    ? 'Submitting...' 
                    : isDowngradeMode 
                      ? 'Submit Downgrade Request' 
                      : 'Submit Upgrade Request'
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Red Toast Notification */}
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
    </>
  );
};

export default UpgradePlanModal;
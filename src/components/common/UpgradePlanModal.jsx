// src/components/common/UpgradePlanModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Sparkles, CheckCircle, ShieldCheck, CreditCard } from 'lucide-react';
import { PLAN_CONFIG, PLANS } from '../../utils/planUtils';

export const UpgradePlanModal = ({ isOpen, onClose, currentUser, userData }) => {
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [userRemarks, setUserRemarks] = useState('');
  const [submitted, setContactSubmitted] = useState(false);

  if (!isOpen) return null;

  const proPlan = PLAN_CONFIG[PLANS.PRO];

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!paymentDetails.trim()) {
      alert("Please provide payment details or transaction ID.");
      return;
    }

    setLoading(true);
    try {
      const nowISO = new Date().toISOString();

      // Submit an upgrade request attached directly to the USER (not to any specific coaching)
      await addDoc(collection(db, 'payments'), {
        userId: currentUser.uid,
        userName: userData?.name || currentUser.email,
        userEmail: currentUser.email,
        coachingId: null, // User-level request
        coachingName: 'User Account Plan Upgrade',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: proPlan.price,
        paymentDetails: paymentDetails,
        userRemarks: userRemarks || 'Requested Pro Academy plan upgrade.',
        isPlanUpgradeRequest: true,
        targetPlan: PLANS.PRO,
        adminRemarks: '',
        adminRemarksHistory: [],
        status: 'pending',
        userRead: true,
        createdAt: nowISO
      });

      setContactSubmitted(true);
      setTimeout(() => {
        setContactSubmitted(false);
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Error submitting upgrade request:", err);
      alert("Failed to request upgrade: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Upgrade to Pro Academy</h3>
            <p className="text-xs text-slate-500 font-medium">Upgrade your personal user account</p>
          </div>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
            <CheckCircle size={36} className="mx-auto text-emerald-600" />
            <h4 className="font-extrabold text-emerald-900 text-sm">Upgrade Request Submitted!</h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Your user account upgrade request for <strong>Pro Academy</strong> has been sent to the admin. Your plan will activate as soon as the admin approves the request.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Feature Highlights */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-indigo-400 uppercase">Pro Academy Plan Features</span>
                <span className="text-sm font-black text-emerald-400">{proPlan.priceLabel}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-300">
                {proPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-indigo-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Verification Form */}
            <form onSubmit={handleUpgradeSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Payment Transaction Details / UPI Ref ID (₹ 1,200)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paid ₹1200 via UPI ID: 9876543210@upi (Txn: 123456)"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Note / Remark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please activate Pro Plan for my user account"
                  value={userRemarks}
                  onChange={(e) => setUserRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <CreditCard size={14} /> {loading ? 'Submitting...' : 'Submit Upgrade Request'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
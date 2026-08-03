// src/components/common/UpgradePlanModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { X, Sparkles, CheckCircle, ShieldCheck, CreditCard, AlertTriangle, ArrowLeft } from 'lucide-react';
import { PLAN_CONFIG, PLANS } from '../../utils/planUtils';

export const UpgradePlanModal = ({ isOpen, onClose, currentUser, userData }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(PLANS.PRO);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [userRemarks, setUserRemarks] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentPlanId = userData?.plan || PLANS.STARTER;
  const proPlan = PLAN_CONFIG[PLANS.PRO];
  const starterPlan = PLAN_CONFIG[PLANS.STARTER];

  // Execute Downgrade to Starter Plan
  const handleConfirmDowngrade = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        plan: PLANS.STARTER,
        planNotification: {
          show: true,
          planName: starterPlan.name
        }
      });
      setShowDowngradeConfirm(false);
      onClose();
    } catch (err) {
      console.error("Error switching plan:", err);
      alert("Failed to change plan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Upgrade Request for Pro Academy
  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!paymentDetails.trim()) {
      alert("Please provide payment details or transaction ID.");
      return;
    }

    setLoading(true);
    try {
      const nowISO = new Date().toISOString();

      await addDoc(collection(db, 'payments'), {
        userId: currentUser.uid,
        userName: userData?.name || currentUser.email,
        userEmail: currentUser.email,
        coachingId: null,
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

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
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
            <h3 className="font-extrabold text-slate-900 text-lg">Subscription Plan Management</h3>
            <p className="text-xs text-slate-500 font-medium">Switch or upgrade your user account tier</p>
          </div>
        </div>

        {/* VIEW 1: DOWNGRADE CONFIRMATION MODAL STATE */}
        {showDowngradeConfirm ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>Confirm Plan Downgrade</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Are you sure you want to switch back to the <strong className="font-bold">Starter Teacher Plan (Free)</strong>?
              </p>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 text-[11px] text-slate-700 space-y-1.5 font-medium">
                <p className="font-bold text-slate-900">What happens after downgrading:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Student capacity will be capped at <strong>50 students</strong>.</li>
                  <li>Coaching institute creation limit reduces to <strong>1 coaching</strong>.</li>
                  <li>WhatsApp payload messaging & Date Range PDF receipts will be locked.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDowngradeConfirm(false)}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1 transition-all"
              >
                <ArrowLeft size={14} /> Keep Pro Plan
              </button>
              <button
                type="button"
                onClick={handleConfirmDowngrade}
                disabled={loading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Switching...' : 'Yes, Downgrade Plan'}
              </button>
            </div>
          </div>
        ) : submitted ? (
          /* VIEW 2: SUBMITTED SUCCESS STATE */
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
            <CheckCircle size={36} className="mx-auto text-emerald-600" />
            <h4 className="font-extrabold text-emerald-900 text-sm">Upgrade Request Submitted!</h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Your request for <strong>Pro Academy</strong> has been sent to the admin. Your plan will activate as soon as the admin approves the request.
            </p>
          </div>
        ) : (
          /* VIEW 3: DEFAULT PLAN SELECTOR VIEW */
          <div className="space-y-5">
            {/* Plan Switch Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedPlanId(PLANS.STARTER)}
                className={`py-2.5 rounded-xl transition-all ${
                  selectedPlanId === PLANS.STARTER
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Starter Teacher (Free)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlanId(PLANS.PRO)}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  selectedPlanId === PLANS.PRO
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={13} /> Pro Academy (₹1200)
              </button>
            </div>

            {/* Selected Plan Details Card */}
            {selectedPlanId === PLANS.STARTER ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{starterPlan.name}</h4>
                    <p className="text-[10px] text-slate-500">Standard Free Educator Tier</p>
                  </div>
                  <span className="text-xs font-black text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full">Free</span>
                </div>

                <div className="space-y-2 text-xs font-medium text-slate-600">
                  {starterPlan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-slate-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {currentPlanId === PLANS.STARTER ? (
                  <div className="p-3 bg-slate-200/60 rounded-xl text-center text-xs font-bold text-slate-600">
                    You are currently using the Starter Teacher Plan.
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                      <span>Switching back will lock Pro features like WhatsApp messages and range receipts.</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDowngradeConfirm(true)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      Switch Back to Starter Teacher Plan
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
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

                {currentPlanId === PLANS.PRO ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-xs font-bold">
                    ★ You are actively subscribed to Pro Academy Plan!
                  </div>
                ) : (
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
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
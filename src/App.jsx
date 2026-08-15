// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AddStudentPage } from './pages/AddStudentPage';
import { StudentDetailsPage } from './pages/StudentDetailsPage';
import { ClassDetailsPage } from './pages/ClassDetailsPage';
import SubjectDetailsPage from './pages/SubjectDetailsPage';
import { UserPaymentsPage } from './pages/UserPaymentsPage';
import { StaffTeacherDashboard } from './pages/StaffTeacherDashboard';
import { CoachingView } from './components/coaching/CoachingView';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { ChatModal } from './components/ChatModal';
import { UpgradePlanModal } from './components/common/UpgradePlanModal';
import { getUserPlanConfig, PLANS } from './utils/planUtils';
import { downloadPaymentReceiptPDF } from './utils/exportUtils';
import { MONTHS, CURRENT_YEAR } from './utils/helpers';
import {
  LogOut, BookOpen, User, ChevronRight,
  Home, ArrowLeft, MessageSquare, ShieldAlert,
  Bell, CreditCard, MoreVertical, Shield, Calendar, Mail, Sparkles, CheckCircle2, Lock,
  ShieldCheck, Phone, Download, QrCode, Search
} from 'lucide-react';
import './App.css';

const ADMIN_EMAIL = 'saurabh@gmail.com';
const ADMIN_ACCOUNT = {
  uid: 'ADMIN_SUPER_USER_ID',
  email: ADMIN_EMAIL,
  name: 'System Admin'
};

// -------------------------------------------------------------
// 1. PUBLIC COMPONENT: PARENT / STUDENT PORTAL (WITH MONTH & YEAR FILTER)
// -------------------------------------------------------------
const ParentPortalView = ({ onBack }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [searched, setSearched] = useState(false);
  const [studentRecords, setStudentRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (rawDigits.length < 8) {
      alert('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const last10Digits = rawDigits.slice(-10);
      const possibleFormats = [
        last10Digits,
        `+91${last10Digits}`,
        `+91 ${last10Digits}`,
        `+91 ${last10Digits.slice(0, 5)} ${last10Digits.slice(5)}`
      ];

      const q = query(
        collection(db, 'students'),
        where('phone', 'in', possibleFormats)
      );
      const snap = await getDocs(q);
      const matched = [];

      for (const sDoc of snap.docs) {
        const studentData = sDoc.data();
        let coachingData = { name: 'Tuition Center', upiId: '' };

        if (studentData.coachingId) {
          const cSnap = await getDoc(doc(db, 'coachings', studentData.coachingId));
          if (cSnap.exists()) coachingData = cSnap.data();
        }

        // Fetch monthly fee records for the student
        const feeQuery = query(
          collection(db, 'feeRecords'),
          where('studentId', '==', sDoc.id),
          where('month', '==', Number(selectedMonth)),
          where('year', '==', Number(selectedYear))
        );
        const feeSnap = await getDocs(feeQuery);
        const feeMap = {};
        feeSnap.docs.forEach(fDoc => {
          const fData = fDoc.data();
          feeMap[fData.enrollmentId || fData.subjectId] = fData;
        });

        matched.push({
          id: sDoc.id,
          ...studentData,
          coaching: coachingData,
          feeRecordsMap: feeMap
        });
      }

      setStudentRecords(matched);
      setSearched(true);
    } catch (err) {
      console.error(err);
      alert('Error searching records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (student, enrollment, feeRecord) => {
    const amountPaid = Number(feeRecord?.amountPaid || 0);
    const monthlyFee = Number(enrollment.monthlyFee || 0);
    const feeStatus = feeRecord?.status || (amountPaid >= monthlyFee && monthlyFee > 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid');

    await downloadPaymentReceiptPDF({
      coaching: student.coaching,
      student,
      upiId: student.coaching?.upiId || '',
      classSubjectInfo: {
        className: enrollment.className,
        subjectName: enrollment.subjectName,
        teacherName: enrollment.teacherName || 'Faculty',
        monthlyFee,
        month: Number(selectedMonth),
        year: Number(selectedYear)
      },
      feeRecord: {
        id: feeRecord?.id || `REC-${Date.now().toString().slice(-6)}`,
        status: feeStatus,
        amountPaid,
        remark: feeRecord?.remark || 'Official Parent Portal Download',
        updatedAt: feeRecord?.updatedAt || new Date().toISOString()
      }
    });
  };

  const monthName = MONTHS[selectedMonth - 1] || 'Current Month';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Parent & Student Portal</h1>
              <p className="text-xs text-slate-500">Filter by billing period, inspect balance dues, and download official PDF receipts</p>
            </div>
          </div>

          {/* Search & Month-Year Filter Controls */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registered Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 text-slate-400" size={16} />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search size={15} /> {loading ? 'Searching Records...' : `Search Fee Details for ${monthName} ${selectedYear}`}
            </button>
          </form>

          {searched && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700">
                  Showing Records for: <span className="text-emerald-700 font-black">{monthName} {selectedYear}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400">{studentRecords.length} Student Profile(s) Found</span>
              </div>

              {studentRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No registered student found for phone number "{phoneNumber}".
                </div>
              ) : (
                studentRecords.map((student) => (
                  <div key={student.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{student.name}</h2>
                        <p className="text-xs text-indigo-600 font-bold">{student.coaching?.name || 'Tuition Center'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase">
                          Enrolled Student
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase">Subject Ledger & Status ({monthName} {selectedYear})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {student.enrollments?.map((enr, idx) => {
                          const feeRec = student.feeRecordsMap[enr.enrollmentId] || student.feeRecordsMap[enr.subjectId];
                          const amountPaid = Number(feeRec?.amountPaid || 0);
                          const monthlyFee = Number(enr.monthlyFee || 0);
                          const balance = Math.max(0, monthlyFee - amountPaid);
                          const isPaid = feeRec?.status === 'paid' || (amountPaid >= monthlyFee && monthlyFee > 0);
                          const isPartial = feeRec?.status === 'partially_paid' || (amountPaid > 0 && balance > 0);

                          return (
                            <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between shadow-xs">
                              <div className="space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-extrabold text-xs text-slate-900">{enr.className} - {enr.subjectName}</p>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                    isPaid ? 'bg-emerald-100 text-emerald-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {isPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">Agreed Fee: <strong>₹{monthlyFee}</strong></p>
                                <p className="text-[11px] text-emerald-600 font-semibold">Paid Amount: <strong>₹{amountPaid}</strong></p>
                                {balance > 0 && (
                                  <p className="text-[11px] text-rose-600 font-bold">Balance Left: <strong>₹{balance}</strong></p>
                                )}
                              </div>

                              <button
                                onClick={() => handleDownloadReceipt(student, enr, feeRec)}
                                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Download size={13} /> Download {monthName} PDF Receipt
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. USER PROFILE VIEW WITH UPI SETUP & PLAN STATUS
// -------------------------------------------------------------
const UserProfileView = ({ userData, currentUser, onBack, onOpenUpgradeModal }) => {
  const planConfig = getUserPlanConfig(userData);
  const [upiIdInput, setUpiIdInput] = useState(userData?.upiId || '');
  const [savingUpi, setSavingUpi] = useState(false);

  const createdDate = userData?.createdAt 
    ? new Date(userData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    setSavingUpi(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        upiId: upiIdInput.trim()
      });
      alert('Coaching UPI ID successfully saved! All generated receipts and reminders will now embed this QR code.');
    } catch (err) {
      alert('Error updating UPI ID: ' + err.message);
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              {(userData?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {userData?.name || 'User Profile'}
                </h1>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  userData?.status === 'stopped' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : userData?.status === 'deleted'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {userData?.status || 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">{currentUser?.email}</p>
            </div>
          </div>
        </div>

        {/* UPI CONFIGURATION CARD */}
        <div className="p-6 rounded-3xl bg-indigo-50/70 border border-indigo-100 space-y-3">
          <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
            <QrCode size={18} className="text-indigo-600" />
            <span>Coaching Dynamic UPI Payment Configuration</span>
          </div>
          <p className="text-xs text-slate-600">
            Enter your UPI ID (e.g. <code>teacher@upi</code> or <code>9876543210@paytm</code>). This auto-generates scan-and-pay QR codes with exact balance amounts on PDF receipts and reminders.
          </p>
          <form onSubmit={handleSaveUpi} className="flex gap-2 pt-1">
            <input
              type="text"
              required
              value={upiIdInput}
              onChange={(e) => setUpiIdInput(e.target.value)}
              placeholder="e.g. yourname@okhdfcbank"
              className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={savingUpi}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {savingUpi ? 'Saving...' : 'Save UPI ID'}
            </button>
          </form>
        </div>

        {/* PLAN SECTION */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">Current Subscribed Plan</span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" /> {planConfig.name}
              </h2>
            </div>
            <button
              onClick={onOpenUpgradeModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 cursor-pointer"
            >
              {planConfig.id === PLANS.STARTER ? 'Upgrade to Pro Academy' : 'Manage / Switch Plan'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium pt-1">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Included Features & Limits:</p>
              {planConfig.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            {planConfig.restrictedFeatures.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Plan Limits / Upgrade Required:</p>
                {planConfig.restrictedFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-400">
                    <Lock size={14} className="text-amber-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile Attributes Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-indigo-600" /> Full Name
            </p>
            <p className="text-sm font-extrabold text-slate-800">{userData?.name || 'N/A'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={13} className="text-indigo-600" /> Email Address
            </p>
            <p className="text-sm font-extrabold text-slate-800">{currentUser?.email || 'N/A'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={13} className="text-indigo-600" /> Account Role
            </p>
            <p className="text-sm font-extrabold text-indigo-700 capitalize">{userData?.role || 'Teacher / Educator'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-600" /> Registered Date
            </p>
            <p className="text-sm font-extrabold text-slate-800">{createdDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. MAIN CENTRAL APP ROUTER
// -------------------------------------------------------------
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userCoachings, setUserCoachings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Screen View States
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [showParentPortal, setShowParentPortal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUserChat, setShowUserChat] = useState(false);

  // Notification States
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadPayments, setUnreadPayments] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const notifRef = useRef(null);
  const menuRef = useRef(null);

  // Navigation History Stack
  const [navigationHistory, setNavigationHistory] = useState([
    { screen: 'dashboard', state: {} }
  ]);
  const currentNav = navigationHistory[navigationHistory.length - 1] || { screen: 'dashboard', state: {} };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenuDropdown(false);
      }
    };
    if (showNotifDropdown || showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifDropdown, showMenuDropdown]);

  useEffect(() => {
    let unsubProfile = () => {};
    let unsubUnreadChat = () => {};
    let unsubPayments = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        if (user.email !== ADMIN_EMAIL) {
          unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
            if (docSnap.exists()) {
              const uData = { uid: docSnap.id, ...docSnap.data() };
              
              const now = new Date();
              const currentDay = now.getDate();
              const currentMonth = now.getMonth() + 1;
              const currentYear = now.getFullYear();

              if (uData.plan === PLANS.PRO) {
                const paymentsRef = collection(db, 'payments');
                const pQuery = query(
                  paymentsRef,
                  where('userId', '==', user.uid),
                  where('status', '==', 'accepted'),
                  where('month', '==', currentMonth),
                  where('year', '==', currentYear)
                );
                const pSnap = await getDocs(pQuery);
                const hasPaid = pSnap.docs.some(d => {
                  const p = d.data();
                  return p.coachingName === 'Monthly Subscription (Pro Academy)' || p.isPlanUpgradeRequest === true;
                });

                const statusBy = uData.statusChangedBy?.split(' ')[0] || 'system';

                if (currentDay > 7 && !hasPaid) {
                  if (uData.status !== 'stopped') {
                    await updateDoc(doc(db, 'users', user.uid), { status: 'stopped', statusChangedBy: 'system' });
                    uData.status = 'stopped';
                    uData.statusChangedBy = 'system';
                  }
                } else if (hasPaid && uData.status === 'stopped' && statusBy === 'system') {
                  await updateDoc(doc(db, 'users', user.uid), { status: 'active', statusChangedBy: 'system' });
                  uData.status = 'active';
                  uData.statusChangedBy = 'system';
                }
              }
              setUserData(uData);
            }
          });

          // Fetch Coachings
          const coachingRef = collection(db, 'coachings');
          const coachingSnap = await getDocs(query(coachingRef, where('teacherId', '==', user.uid)));
          setUserCoachings(coachingSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Chat listener
          const chatId = [user.uid, ADMIN_ACCOUNT.uid].sort().join('_');
          const unreadQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            where('receiverId', '==', user.uid),
            where('isRead', '==', false)
          );
          unsubUnreadChat = onSnapshot(unreadQuery, (snap) => {
            setUnreadMsgCount(snap.size);
          });

          // Payments listener
          const paymentsQuery = query(
            collection(db, 'payments'),
            where('userId', '==', user.uid),
            where('userRead', '==', false)
          );
          unsubPayments = onSnapshot(paymentsQuery, (snap) => {
            setUnreadPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubProfile();
      unsubUnreadChat();
      unsubPayments();
    };
  }, []);

  const handleLogout = () => {
    signOut(auth);
    setNavigationHistory([{ screen: 'dashboard', state: {} }]);
    setShowUserChat(false);
    setShowMenuDropdown(false);
    setShowAuthScreen(true);
  };

  const navigateTo = (screen, state = {}) => {
    setNavigationHistory(prev => [...prev, { screen, state }]);
  };

  const updateCurrentState = (newState) => {
    setNavigationHistory(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      updated[lastIndex] = {
        ...updated[lastIndex],
        state: { ...updated[lastIndex].state, ...newState }
      };
      return updated;
    });
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      setNavigationHistory(prev => prev.slice(0, -1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-sm">
        <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 font-bold text-slate-700 animate-pulse">
          Loading TuitionManager...
        </div>
      </div>
    );
  }

  // View: Parent Portal
  if (showParentPortal) {
    return <ParentPortalView onBack={() => setShowParentPortal(false)} />;
  }

  // View: Non-authenticated User
  if (!currentUser) {
    if (showAuthScreen) {
      return (
        <div className="relative">
          <button 
            onClick={() => setShowAuthScreen(false)}
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
          <AuthPage onAuthSuccess={(data) => setUserData(data)} />
        </div>
      );
    }
    return (
      <LandingPage 
        onGetStarted={() => setShowAuthScreen(true)}
        onLogin={() => setShowAuthScreen(true)}
        onOpenParentPortal={() => setShowParentPortal(true)}
      />
    );
  }

  // View: Admin Super User
  if (currentUser.email === ADMIN_EMAIL || userData?.role === 'admin') {
    return (
      <AdminDashboard 
        adminUser={ADMIN_ACCOUNT} 
        onLogout={handleLogout} 
      />
    );
  }

  // View: Staff Teacher Dedicated Dashboard
  if (userData?.role === 'staff_teacher') {
    return (
      <StaffTeacherDashboard
        staffUser={userData}
        onLogout={handleLogout}
      />
    );
  }

  // View: Account Terminated / Access Revoked
  if (!userData || userData?.status === 'deleted' || userData?.role === 'deleted_staff') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-rose-100">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Access Revoked</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account access has been revoked or removed.
          </p>
          <button 
            onClick={handleLogout}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const selectedCoaching = currentNav.state?.coaching;
  const selectedStudent = currentNav.state?.student;
  const totalNotifCount = (unreadMsgCount > 0 ? 1 : 0) + unreadPayments.length;
  const planConfig = getUserPlanConfig(userData);
  const isAccountPaused = userData?.status === 'stopped';
  const isAccessibleTab = currentNav.screen === 'payments' || currentNav.screen === 'profile';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div 
            onClick={() => setNavigationHistory([{ screen: 'dashboard', state: {} }])}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-100">
              <BookOpen size={18} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">TuitionManager</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full relative transition-colors text-slate-600 cursor-pointer"
                title="Notifications"
              >
                <Bell size={16} />
                {totalNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {totalNotifCount}
                  </span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800">
                  <div className="px-4 py-2 border-b border-slate-100 font-extrabold text-xs text-slate-500">
                    Notifications
                  </div>
                  {unreadMsgCount > 0 && (
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        if (planConfig.allowDirectChat) setShowUserChat(true);
                        else setShowUpgradeModal(true);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 flex items-center justify-between border-b border-slate-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">Admin Message</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">{unreadMsgCount} new message(s)</p>
                      </div>
                      <MessageSquare size={16} className="text-indigo-600" />
                    </button>
                  )}
                  {unreadPayments.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setShowNotifDropdown(false);
                        navigateTo('payments');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 flex items-center justify-between border-b border-slate-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">Payment {p.status === 'accepted' ? 'Accepted' : 'Rejected'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">₹{p.amount} ({p.status})</p>
                      </div>
                      <CreditCard size={16} className={p.status === 'accepted' ? 'text-emerald-600' : 'text-rose-600'} />
                    </button>
                  ))}
                  {totalNotifCount === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">No new notifications</div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600 cursor-pointer"
                title="More options"
              >
                <MoreVertical size={16} />
              </button>
              {showMenuDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 text-slate-800 divide-y divide-slate-100">
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      navigateTo('profile');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-slate-800 font-bold text-xs flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <User size={15} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{userData?.name || currentUser.email}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      if (planConfig.allowDirectChat) setShowUserChat(true);
                      else setShowUpgradeModal(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare size={15} />
                      <span>Message Admin</span>
                    </div>
                    {!planConfig.allowDirectChat && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[9px] font-black uppercase">
                        PRO
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      navigateTo('payments');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <CreditCard size={15} />
                    <span>Payments Portal</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors p-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Account Paused Banner */}
      {isAccountPaused && (
        <div className="p-4 bg-amber-500 text-white text-center flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldAlert size={18} className="text-amber-300" />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight">
                {userData?.statusChangedBy?.split(' ')[0] === 'admin' 
                  ? 'Your account has been paused by an administrator.' 
                  : 'Your account has been paused due to non-payment. Please pay to activate.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="bg-white border-b border-slate-100 py-2.5 shadow-xs sticky top-[57px] z-30">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {navigationHistory.length > 1 && (
              <button
                onClick={goBack}
                className="mr-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button 
              onClick={() => setNavigationHistory([{ screen: 'dashboard', state: {} }])}
              className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Home size={14} /> Dashboard
            </button>
            {selectedCoaching && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className={currentNav.screen === 'coaching' ? 'text-indigo-600 font-bold' : ''}>
                  {selectedCoaching.name}
                </span>
              </>
            )}
            {currentNav.screen === 'classDetails' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Class Details</span>
              </>
            )}
            {currentNav.screen === 'subjectDetails' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Subject Details</span>
              </>
            )}
            {currentNav.screen === 'addStudent' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Add Student</span>
              </>
            )}
            {currentNav.screen === 'studentDetails' && selectedStudent && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">{selectedStudent.name}</span>
              </>
            )}
            {currentNav.screen === 'payments' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Payments</span>
              </>
            )}
            {currentNav.screen === 'profile' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">My Profile</span>
              </>
            )}
          </div>
        </div>
      </div>

      <main className={`p-6 ${isAccountPaused && !isAccessibleTab ? 'pointer-events-none opacity-50 select-none' : ''}`}>
        {currentNav.screen === 'dashboard' && (
          <TeacherDashboard 
            userId={currentUser.uid} 
            userData={userData}
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
            onSelectCoaching={(coaching) => {
              navigateTo('coaching', { 
                coaching, 
                selectedClassId: '', 
                selectedSubjectId: '', 
                activeTab: 'roster' 
              });
            }}
          />
        )}
        {currentNav.screen === 'coaching' && selectedCoaching && (
          <CoachingView 
            coaching={selectedCoaching} 
            userData={userData}
            initialState={currentNav.state}
            onUpdateState={updateCurrentState}
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
            onOpenAddStudent={() => navigateTo('addStudent', { coaching: selectedCoaching })}
            onOpenClassDetails={(classId) => navigateTo('classDetails', { coaching: selectedCoaching, classId })}
            onOpenSubjectDetails={({ classId, subjectId }) => navigateTo('subjectDetails', { coaching: selectedCoaching, classId, subjectId })}
            onOpenStudentDetails={(student) => navigateTo('studentDetails', { coaching: selectedCoaching, student })}
            onGoBack={goBack}
          />
        )}
        {currentNav.screen === 'classDetails' && selectedCoaching && (
          <ClassDetailsPage
            coachingId={selectedCoaching.id}
            classId={currentNav.state.classId}
            onBack={goBack}
            onOpenStudentDetails={(student) => navigateTo('studentDetails', { coaching: selectedCoaching, student })}
            onOpenSubjectDetails={({ classId, subjectId }) => navigateTo('subjectDetails', { coaching: selectedCoaching, classId, subjectId })}
          />
        )}
        {currentNav.screen === 'subjectDetails' && selectedCoaching && (
          <SubjectDetailsPage
            coachingId={selectedCoaching.id}
            classId={currentNav.state.classId}
            subjectId={currentNav.state.subjectId}
            onBack={goBack}
            onOpenStudentDetails={(student) => navigateTo('studentDetails', { coaching: selectedCoaching, student })}
            onOpenClassDetails={(classId) => navigateTo('classDetails', { coaching: selectedCoaching, classId })}
          />
        )}
        {currentNav.screen === 'addStudent' && selectedCoaching && (
          <AddStudentPage 
            coachingId={selectedCoaching.id}
            userData={userData}
            classes={selectedCoaching.classes || []}
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
            onComplete={goBack}
            onCancel={goBack}
            onGoBack={goBack}
          />
        )}
        {currentNav.screen === 'studentDetails' && selectedStudent && (
          <StudentDetailsPage 
            studentId={selectedStudent.id} 
            userData={userData}
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
            onBack={goBack} 
          />
        )}
        {currentNav.screen === 'payments' && (
          <UserPaymentsPage
            currentUser={currentUser}
            userData={userData}
            onBack={goBack}
          />
        )}
        {currentNav.screen === 'profile' && (
          <UserProfileView
            userData={userData}
            currentUser={currentUser}
            onBack={goBack}
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
          />
        )}
      </main>

      {/* User Encrypted Chat Modal */}
      {showUserChat && (
        <ChatModal
          currentUser={{ 
            uid: currentUser.uid, 
            name: userData?.name || currentUser.email, 
            email: currentUser.email 
          }}
          chatPartner={ADMIN_ACCOUNT}
          onClose={() => setShowUserChat(false)}
        />
      )}

      {/* Plan Upgrade Modal */}
      <UpgradePlanModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentUser={currentUser}
        userData={userData}
        userCoachings={userCoachings}
      />
    </div>
  );
}
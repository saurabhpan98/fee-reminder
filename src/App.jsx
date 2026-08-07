// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AddStudentPage } from './pages/AddStudentPage';
import { StudentDetailsPage } from './pages/StudentDetailsPage';
import { ClassDetailsPage } from './pages/ClassDetailsPage';
import SubjectDetailsPage from './pages/SubjectDetailsPage';
import { UserPaymentsPage } from './pages/UserPaymentsPage';
import { CoachingView } from './components/coaching/CoachingView';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { ChatModal } from './components/ChatModal';
import { UpgradePlanModal } from './components/common/UpgradePlanModal';
import { getUserPlanConfig, PLANS } from './utils/planUtils';
import { 
  LogOut, BookOpen, User, ChevronRight, 
  Home, ArrowLeft, MessageSquare, ShieldAlert, 
  Bell, CreditCard, MoreVertical, Shield, Calendar, Mail, Sparkles, CheckCircle2, Lock
} from 'lucide-react';
import './App.css';

const ADMIN_EMAIL = 'saurabh@gmail.com';
const ADMIN_ACCOUNT = {
  uid: 'ADMIN_SUPER_USER_ID',
  email: ADMIN_EMAIL,
  name: 'System Admin'
};

// Internal Page Component: User Profile Details View with Plan Details
const UserProfileView = ({ userData, currentUser, onBack, onOpenUpgradeModal }) => {
  const planConfig = getUserPlanConfig(userData);
  const createdDate = userData?.createdAt 
    ? new Date(userData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Profile Header */}
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
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
              <Calendar size={13} className="text-indigo-600" /> Joined / Registered Date
            </p>
            <p className="text-sm font-extrabold text-slate-800">{createdDate}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
          <p className="font-bold">Account User ID:</p>
          <p className="font-mono text-[11px] text-indigo-700 select-all">{currentUser?.uid}</p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userCoachings, setUserCoachings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Landing / Auth View Toggle State
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Upgrade Plan Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Notifications & Header Menus State
  const [showUserChat, setShowUserChat] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadPayments, setUnreadPayments] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  // Router history
  const [navigationHistory, setNavigationHistory] = useState([
    { screen: 'dashboard', state: {} }
  ]);
  const currentNav = navigationHistory[navigationHistory.length - 1] || { screen: 'dashboard', state: {} };

  // Click Outside Listener for Notifications and Three-Dots Menu Dropdown
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
          unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
              setUserData({ uid: docSnap.id, ...docSnap.data() });
            }
          });

          // Fetch User Coachings List
          const coachingRef = collection(db, 'coachings');
          const coachingSnap = await getDocs(query(coachingRef, where('teacherId', '==', user.uid)));
          setUserCoachings(coachingSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // 1. Unread Admin Messages Listener
          const chatId = [user.uid, ADMIN_ACCOUNT.uid].sort().join('_');
          const unreadQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            where('receiverId', '==', user.uid),
            where('isRead', '==', false)
          );
          unsubUnreadChat = onSnapshot(unreadQuery, (snap) => {
            setUnreadMsgCount(snap.size);
          });

          // 2. Unread Payment Notifications Listener
          const paymentsQuery = query(
            collection(db, 'payments'),
            where('userId', '==', user.uid),
            where('userRead', '==', false)
          );
          unsubPayments = onSnapshot(paymentsQuery, (snap) => {
            const unreadP = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUnreadPayments(unreadP);
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
        
          <svg className="pl" width={240} height={240} viewBox="0 0 240 240">
            <circle className="pl__ring pl__ring--a" cx={120} cy={120} r={105} fill="none" stroke="#000" strokeWidth={20} strokeDasharray="0 660" strokeDashoffset={-330} strokeLinecap="round" />
            <circle className="pl__ring pl__ring--b" cx={120} cy={120} r={35} fill="none" stroke="#000" strokeWidth={20} strokeDasharray="0 220" strokeDashoffset={-110} strokeLinecap="round" />
            <circle className="pl__ring pl__ring--c" cx={85} cy={120} r={70} fill="none" stroke="#000" strokeWidth={20} strokeDasharray="0 440" strokeLinecap="round" />
            <circle className="pl__ring pl__ring--d" cx={155} cy={120} r={70} fill="none" stroke="#000" strokeWidth={20} strokeDasharray="0 440" strokeLinecap="round" />
          </svg>
        
      </div>
    );
  }

  // If user is not logged in, show Auth Screen or Landing Page
  if (!currentUser) {
    if (showAuthScreen) {
      return (
        <div className="relative">
          <button 
            onClick={() => setShowAuthScreen(false)}
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
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
      />
    );
  }

  if (currentUser.email === ADMIN_EMAIL || userData?.role === 'admin') {
    return (
      <AdminDashboard 
        adminUser={ADMIN_ACCOUNT} 
        onLogout={handleLogout} 
      />
    );
  }

  if (userData?.status === 'deleted') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-rose-100">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Account Terminated</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account has been deleted by the system administrator.
          </p>
          <button 
            onClick={handleLogout}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const selectedCoaching = currentNav.state?.coaching;
  const selectedStudent = currentNav.state?.student;

  // Total Unclicked Notification Count
  const totalNotifCount = (unreadMsgCount > 0 ? 1 : 0) + unreadPayments.length;
  const planConfig = getUserPlanConfig(userData);

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
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full relative transition-colors text-slate-600"
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

                  {/* Message Notification */}
                  {unreadMsgCount > 0 && (
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        if (planConfig.allowDirectChat) {
                          setShowUserChat(true);
                        } else {
                          setShowUpgradeModal(true);
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 flex items-center justify-between border-b border-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">Admin Message</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">{unreadMsgCount} new message(s)</p>
                      </div>
                      <MessageSquare size={16} className="text-indigo-600" />
                    </button>
                  )}

                  {/* Payment Notifications */}
                  {unreadPayments.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setShowNotifDropdown(false);
                        navigateTo('payments');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 flex items-center justify-between border-b border-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">Payment {p.status === 'accepted' ? 'Accepted' : 'Rejected'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">₹ {p.amount} ({p.status})</p>
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

            {/* Three-Dots Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                title="More options"
              >
                <MoreVertical size={16} />
              </button>

              {showMenuDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 text-slate-800 divide-y divide-slate-100">
                  {/* 1. First Item: Profile Button */}
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      navigateTo('profile');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-slate-800 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <User size={15} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{userData?.name || currentUser.email}</span>
                  </button>

                  {/* 2. Message Admin Button (Gated) */}
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      if (planConfig.allowDirectChat) {
                        setShowUserChat(true);
                      } else {
                        setShowUpgradeModal(true);
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-between transition-colors"
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

                  {/* 3. Payments Portal Button */}
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      navigateTo('payments');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2.5 transition-colors"
                  >
                    <CreditCard size={15} />
                    <span>Payments Portal</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors p-1"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Account Paused Banner */}
      {userData?.status === 'stopped' && (
        <div className="bg-amber-500 text-white p-2.5 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
          <ShieldAlert size={16} />
          <span>Your account is paused by the administrator. Work actions inside coachings are disabled, but messaging with admin is active.</span>
        </div>
      )}

      {/* Navigation Header */}
      <div className="bg-white border-b border-slate-100 py-2.5 shadow-xs sticky top-[57px] z-30">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {navigationHistory.length > 1 && (
              <button
                onClick={goBack}
                className="mr-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button 
              onClick={() => setNavigationHistory([{ screen: 'dashboard', state: {} }])}
              className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
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

      <main className={`p-6 ${userData?.status === 'stopped' ? 'pointer-events-none opacity-50 select-none' : ''}`}>
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
// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
   collection, onSnapshot, getDocs, doc, updateDoc, 
   deleteDoc, query, where 
 } from 'firebase/firestore';
import { ChatModal } from '../components/ChatModal';
import { AdminPaymentRequestsPage } from './AdminPaymentRequestsPage';
import { AdminAnalyticsSection } from '../components/admin/AdminAnalyticsSection';
import { PLAN_CONFIG, PLANS } from '../utils/planUtils';
import { 
   Users, Bell, LogOut, MessageSquare, PauseCircle, 
   PlayCircle, Info, Trash2, ArrowLeft, Building2, AlertOctagon, Filter, MoreVertical, CreditCard, Calendar, ArrowUpDown, Sparkles, Shield, CheckCircle2, AlertCircle, X, BarChart3
} from 'lucide-react';

export const AdminDashboard = ({ adminUser, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCoachings, setUserCoachings] = useState([]);
  const [userPayments, setUserPayments] = useState([]);
  const [paymentSortOrder, setPaymentSortOrder] = useState('latest'); // 'latest' | 'oldest'
  const [viewingRequests, setViewingRequests] = useState(false);

  // Admin View Sub-Tab State: 'users' | 'analytics'
  const [activeAdminTab, setActiveAdminTab] = useState('users');

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationRef = useRef(null);

  // Pending Payments Count for Admin Badge
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  // Chat State
  const [chatPartner, setChatPartner] = useState(null);

  // Delete User Modal State
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Delete payment modal 
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState({ show: false, paymentId: null });
  const [isProcessingPaymentDelete, setIsProcessingPaymentDelete] = useState(false);

  // See payment detail modal
  const [viewPaymentModal, setViewPaymentModal] = useState({ show: false, payment: null });

  // Green Toast Notification State
  const [toastInfo, setToastInfo] = useState(null);

  // User Actions Dropdown Menu State
  const [showUserActionsDropdown, setShowUserActionsDropdown] = useState(false);
  const userActionsRef = useRef(null);

  useEffect(() => {
    if (toastInfo) {
      const timer = setTimeout(() => {
        setToastInfo(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastInfo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
      if (userActionsRef.current && !userActionsRef.current.contains(event.target)) {
        setShowUserActionsDropdown(false);
      }
    };
    if (showNotificationDropdown || showUserActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown, showUserActionsDropdown]);

  const fetchCoachingsForUser = async (userObj) => {
    const combinedDocs = new Map();
    const coachingRef = collection(db, 'coachings');
    const idsToTest = Array.from(new Set([
      userObj.uid,
      userObj.id,
      userObj.userId,
      userObj.email
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
    return Array.from(combinedDocs.values());
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), async (snapshot) => {
      const rawUsers = snapshot.docs.map(uDoc => ({
        uid: uDoc.id,
        ...uDoc.data()
      }));
      const nonAdminUsers = rawUsers.filter(u => u.email !== 'saurabh@gmail.com');
      const updatedUsersList = await Promise.all(
        nonAdminUsers.map(async (u) => {
          const coachings = await fetchCoachingsForUser(u);
          return {
            ...u,
            coachingCount: coachings.length
          };
        })
      );
      setUsers(updatedUsersList);
    });

    const unsubChats = onSnapshot(collection(db, 'chats'), async () => {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const unreadList = [];

      for (const uDoc of allUsersSnap.docs) {
        if (uDoc.data().email === 'saurabh@gmail.com') continue;
        const chatId = [adminUser.uid, uDoc.id].sort().join('_');
        const msgSnap = await getDocs(query(
          collection(db, 'chats', chatId, 'messages'),
          where('receiverId', '==', adminUser.uid),
          where('isRead', '==', false)
        ));
        if (!msgSnap.empty) {
          unreadList.push({
            user: { uid: uDoc.id, ...uDoc.data() },
            unreadCount: msgSnap.size
          });
        }
      }
      setNotifications(unreadList);
    });

    const unsubPendingPay = onSnapshot(
      query(collection(db, 'payments'), where('status', '==', 'pending')),
      (snap) => {
        setPendingPaymentsCount(snap.size);
      }
    );

    return () => {
      unsubUsers();
      unsubChats();
      unsubPendingPay();
    };
  }, [adminUser.uid]);

  const handleSelectNotification = (user) => {
    setNotifications(prev => prev.filter(n => n.user.uid !== user.uid));
    setShowNotificationDropdown(false);
    setChatPartner(user);
  };

  const handleOpenUserProfile = async (user) => {
    setSelectedUser(user);
    setViewingRequests(false);
    setPaymentSortOrder('latest');
    setShowUserActionsDropdown(false); // Reset dropdown
    
    const coachings = await fetchCoachingsForUser(user);
    setUserCoachings(coachings);

    // Fetch user payment history
    const paySnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', user.uid)));
    const userPayList = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setUserPayments(userPayList);
  };

  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'stopped' ? 'active' : 'stopped';
    await updateDoc(doc(db, 'users', selectedUser.uid), {
      status: newStatus
    });
    setSelectedUser(prev => ({ ...prev, status: newStatus }));
    setShowUserActionsDropdown(false); // Close dropdown
  };

  const handleAdminChangePlan = async (newPlanId) => {
    if (!selectedUser) return;
    try {
      const planConfig = PLAN_CONFIG[newPlanId];
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        plan: newPlanId,
        planNotification: {
          show: true,
          planName: planConfig?.name || 'Starter Teacher'
        }
      });
      setSelectedUser(prev => ({ ...prev, plan: newPlanId }));
      setToastInfo({
        message: `User plan successfully updated to ${planConfig?.name || 'Selected Plan'}.`,
        isError: false
      });
    } catch (err) {
      console.error("Error changing user plan:", err);
      setToastInfo({
        message: `Failed to update user plan: ${err.message}`,
        isError: true
      });
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const coachings = await fetchCoachingsForUser(selectedUser);
      for (const c of coachings) {
        await deleteDoc(doc(db, 'coachings', c.id));
      }
      const studentSnap = await getDocs(query(collection(db, 'students'), where('userId', '==', selectedUser.uid)));
      for (const sDoc of studentSnap.docs) {
        await deleteDoc(doc(db, 'students', sDoc.id));
      }

      await updateDoc(doc(db, 'users', selectedUser.uid), {
        status: 'deleted',
        isLoginDisabled: true
      });

      setShowDeleteUserModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error purging user data:", err);
      alert("Failed to delete user: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusWeight = (status) => {
    const s = (status || 'active').toLowerCase();
    if (s === 'active') return 1;
    if (s === 'stopped') return 2;
    if (s === 'deleted') return 3;
    return 4;
  };

  const filteredUsers = users.filter(u => {
    const s = u.status || 'active';
    if (statusFilter === 'all') return true;
    return s === statusFilter;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    return getStatusWeight(a.status) - getStatusWeight(b.status);
  });

  // Sort payments according to Billing Month/Year
  const sortedUserPayments = [...userPayments].sort((a, b) => {
    const timeA = new Date(a.paymentDate || a.createdAt).getTime() || 0;
    const timeB = new Date(b.paymentDate || b.createdAt).getTime() || 0;

    return paymentSortOrder === 'latest' ? timeB - timeA : timeA - timeB;
  });

  const handleDeletePayment = async (paymentId) => {
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
      setUserPayments(prev => prev.filter(p => p.id !== paymentId));
      setShowDeletePaymentModal({ show: false, paymentId: null });
      setIsProcessingPaymentDelete(false);
      setToastInfo({
        message: 'Payment deleted successfully.',
        isError: false
      });
    } catch (err) {
      console.error("Error deleting payment submission:", err);
      setIsProcessingPaymentDelete(false);
      setShowDeletePaymentModal({ show: false, paymentId: null });
      setToastInfo({
        message: `Failed to delete payment: ${err.message}`,
        isError: true
      });
    }
  };

  const selectedUserPlanConfig = PLAN_CONFIG[selectedUser?.plan || PLANS.STARTER];

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-800 pb-12">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl"><Users size={18}/></div>
            <h1 className="font-extrabold text-base tracking-tight">Admin System Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setViewingRequests(true)}
              className="relative px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <CreditCard size={15} />
              <span>Payment Requests</span>
              {pendingPaymentsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-slate-900 font-extrabold text-[10px] rounded-full">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl relative transition-colors"
              >
                <Bell size={18} className="text-slate-300" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800">
                  <div className="px-4 py-2 border-b border-slate-100 font-extrabold text-xs text-slate-500">
                    Message Notifications
                  </div>
                  {notifications.map(({ user, unreadCount }) => (
                    <button
                      key={user.uid}
                      onClick={() => handleSelectNotification(user)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 flex items-center justify-between border-b border-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">{user.name || user.email}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">{unreadCount} new encrypted message(s)</p>
                      </div>
                      <MessageSquare size={14} className="text-indigo-600" />
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium">No unread messages</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      {viewingRequests ? (
        <div className="min-h-screen bg-slate-100/70 font-sans text-slate-800 pb-12 pt-6 px-4 sm:px-6">
          <AdminPaymentRequestsPage onBack={() => setViewingRequests(false)} />
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          {!selectedUser ? (
            <div className="space-y-6">
              {/* Admin Dashboard Sub-Tab Switcher */}
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 w-fit text-xs font-bold shadow-xs">
                <button
                  onClick={() => setActiveAdminTab('users')}
                  className={`cursor-pointer px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeAdminTab === 'users'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users size={16} />
                  <span>Registered Users ({users.length})</span>
                </button>

                <button
                  onClick={() => setActiveAdminTab('analytics')}
                  className={`cursor-pointer px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeAdminTab === 'analytics'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 size={16} />
                  <span>Platform Analytics & Insights</span>
                </button>
              </div>

              {/* Tab 1: Users List */}
              {activeAdminTab === 'users' && (
                <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">Registered System Users</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Click on any user row to manage profile, view payments, or change plan</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-400" />
                      <label className="text-xs font-bold text-slate-500">Filter:</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="all">All Accounts ({users.length})</option>
                        <option value="active">Active Only</option>
                        <option value="stopped">Stopped Only</option>
                        <option value="deleted">Deleted Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5 font-bold">Name</th>
                          <th className="px-5 py-3.5 font-bold">Email</th>
                          <th className="px-5 py-3.5 font-bold">Active Plan</th>
                          <th className="px-5 py-3.5 font-bold">Coachings</th>
                          <th className="px-5 py-3.5 font-bold">Account Status</th>
                          <th className="px-5 py-3.5 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-xs">
                        {sortedUsers.map((u) => {
                          const planInfo = PLAN_CONFIG[u.plan || PLANS.STARTER];
                          return (
                            <tr
                              key={u.uid}
                              onClick={() => handleOpenUserProfile(u)}
                              className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                            >
                              <td className="px-5 py-4 font-bold text-slate-900">{u.name || 'Unnamed User'}</td>
                              <td className="px-5 py-4 text-slate-600">{u.email}</td>
                              <td className="px-5 py-4 font-bold">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                  u.plan === PLANS.PRO ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {planInfo.name}
                                </span>
                              </td>
                              <td className="px-5 py-4 font-bold text-indigo-600">{u.coachingCount ?? 0} Registered</td>
                              <td className="px-5 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                  u.status === 'stopped' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                  u.status === 'deleted' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                  'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                }`}>
                                  {u.status || 'active'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button className="cursor-pointer px-3.5 py-1.5 border border-slate-200 rounded-xl font-bold hover:bg-white text-slate-600">
                                  Manage Profile
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {sortedUsers.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-xs font-medium">
                        No users found matching the selected filter.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: System Analytics */}
              {activeAdminTab === 'analytics' && (
                <AdminAnalyticsSection users={users} />
              )}
            </div>
          ) : (
            <div>
              {selectedUser.status === 'deleted' ? (
                /* Deleted User Profile Sub-Page */
                <div className="space-y-6 animate-in fade-in duration-300">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
                  >
                    <ArrowLeft size={16} /> Back to Users List
                  </button>

                  <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-xs space-y-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 font-extrabold text-2xl flex items-center justify-center shrink-0">
                          {(selectedUser?.name || selectedUser?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                              {selectedUser.name || 'Unnamed User'}
                            </h2>
                            <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[10px] font-extrabold uppercase">
                              Deleted
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{selectedUser.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Callout Banner */}
                    <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
                      <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0 mt-0.5">
                        <AlertOctagon size={18} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-sm text-rose-900">Account Terminated & Data Purged</p>
                        <p className="text-rose-700/90 leading-relaxed font-medium">
                          This user account has been permanently deleted by the administrator. User login access is disabled, and all associated coaching centers, subject batches, and student rosters have been purged.
                        </p>
                      </div>
                    </div>

                    {/* Basic Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={13} className="text-indigo-600" /> Full Name
                        </p>
                        <p className="text-sm font-extrabold text-slate-800">{selectedUser?.name || 'N/A'}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield size={13} className="text-indigo-600" /> Email Address
                        </p>
                        <p className="text-sm font-extrabold text-slate-800">{selectedUser?.email || 'N/A'}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-rose-600" /> Account Status
                        </p>
                        <p className="text-sm font-extrabold text-rose-600 uppercase">{selectedUser?.status || 'Deleted'}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={13} className="text-indigo-600" /> Last Active Plan
                        </p>
                        <p className="text-sm font-extrabold text-slate-800 uppercase">{selectedUser?.plan || 'Starter'}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2 lg:col-span-2">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-600" /> Account User ID
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-700 select-all">{selectedUser?.uid || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Deleted User Payment Submissions History */}
                    <div className="space-y-3 pt-6 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <CreditCard size={16} className="text-indigo-600" /> Payment Submissions History ({userPayments.length})
                        </h3>
                        
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                          <ArrowUpDown size={13} className="text-slate-400" />
                          <label className="font-bold text-slate-500">Sort Month/Year:</label>
                          <select
                            value={paymentSortOrder}
                            onChange={(e) => setPaymentSortOrder(e.target.value)}
                            className="bg-transparent border-none font-bold text-slate-800 outline-none cursor-pointer"
                          >
                            <option value="latest">Latest Month/Year First</option>
                            <option value="oldest">Oldest Month/Year First</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 font-bold">Type of Payment</th>
                              <th className="px-4 py-3 font-bold">Month/Year</th>
                              <th className="px-4 py-3 font-bold">Amount</th>
                              <th className="px-4 py-3 font-bold">Date of Acceptance</th>
                              <th className="px-4 py-3 font-bold">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {sortedUserPayments.map(p => {
                              const submissionDate = p.createdAt 
                                ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '-';
                              const isAccepted = p.status === 'accepted';
                              const acceptanceDate = isAccepted && p.updatedAt 
                                ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '-';
                              return (
                                <tr key={p.id}>
                                  <td className="px-4 py-3 font-extrabold text-indigo-700">
                                    {p.isCustomPayment ? (
                                      <span className="flex items-center gap-1.5 text-amber-700">
                                        <CreditCard size={13} className="text-amber-500" /> Custom Payment
                                      </span>
                                    ) : p.isPlanUpgradeRequest ? (
                                      <span className="flex items-center gap-1.5 text-indigo-700">
                                        <Sparkles size={13} className="text-amber-500" /> User Plan Upgrade
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                                        <Shield size={13} className="text-indigo-600" /> Monthly Subscription ({selectedUserPlanConfig.name})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-800">
                                    {new Date(0, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                                  </td>
                                  <td className="px-4 py-3 font-black text-slate-900">₹{p.amount}</td>
                                  <td className="px-4 py-3 font-bold text-emerald-700">
                                    {acceptanceDate}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => setViewPaymentModal({ show: true, payment: p })}
                                      className="p-1 cursor-pointer text-blue-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors mr-2"
                                    >
                                      <Info size={12}/>
                                    </button>
                                    <button
                                      onClick={() => setShowDeletePaymentModal({ show: true, paymentId: p.id })}
                                      className="p-1 cursor-pointer text-rose-700 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {sortedUserPayments.length === 0 && (
                          <div className="p-6 text-center text-slate-400 text-xs font-medium">
                            No payment submissions found for this user.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* User Profile Sub-Page */
                <div className="space-y-6">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
                  >
                    <ArrowLeft size={16} /> Back to Users List
                  </button>

                  <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-extrabold text-slate-900">{selectedUser.name || 'User Profile'}</h2>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            selectedUser.status === 'stopped' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            selectedUser.status === 'deleted' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {selectedUser.status || 'active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{selectedUser.email}</p>
                      </div>

                      {/* Dropdown Menu for Open Direct Chat, Pause, and Delete Actions */}
                      <div className="relative" ref={userActionsRef}>
                        <button
                          onClick={() => setShowUserActionsDropdown(!showUserActionsDropdown)}
                          className="cursor-pointer p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-700 flex items-center justify-center border border-slate-200"
                          title="Actions"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {showUserActionsDropdown && (
                          <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 text-slate-800 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={() => {
                                setShowUserActionsDropdown(false);
                                setChatPartner(selectedUser);
                              }}
                              className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center gap-2.5 transition-colors"
                            >
                              <MessageSquare size={15} />
                              <span>Open Direct Chat</span>
                            </button>

                            {selectedUser.status !== 'deleted' && (
                              <button
                                onClick={handleToggleUserStatus}
                                className={`cursor-pointer w-full text-left px-4 py-2.5 font-bold text-xs flex items-center gap-2.5 transition-colors ${
                                  selectedUser.status === 'stopped' 
                                    ? 'hover:bg-emerald-50 text-emerald-700'
                                    : 'hover:bg-amber-50 text-amber-700'
                                }`}
                              >
                                {selectedUser.status === 'stopped' ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                                <span>{selectedUser.status === 'stopped' ? 'Resume User Activity' : 'Pause User Activity'}</span>
                              </button>
                            )}

                            {selectedUser.status !== 'deleted' && (
                              <button
                                onClick={() => {
                                  setShowUserActionsDropdown(false);
                                  setShowDeleteUserModal(true);
                                }}
                                className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 size={15} />
                                <span>Delete Account</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ADMIN PLAN MANAGEMENT BOX */}
                    <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-indigo-400">Current User Subscribed Plan</span>
                        <h3 className="text-lg font-extrabold text-white mt-0.5 flex items-center gap-2">
                          <Sparkles size={16} className="text-amber-400" /> {selectedUserPlanConfig.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Max Coachings: {selectedUserPlanConfig.maxCoachings} | Max Students: {selectedUserPlanConfig.maxStudents === Infinity ? 'Unlimited' : selectedUserPlanConfig.maxStudents}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-300">Set Plan:</label>
                        <select
                          value={selectedUser.plan || PLANS.STARTER}
                          onChange={(e) => handleAdminChangePlan(e.target.value)}
                          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                        >
                          <option value={PLANS.STARTER}>Starter Teacher (Free)</option>
                          <option value={PLANS.PRO}>Pro Academy (₹1,200/mo)</option>
                        </select>
                      </div>
                    </div>

                    {/* Registered Coachings */}
                    <div className="space-y-3">
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600" /> Registered Coachings/Tuitions ({userCoachings.length})
                      </h3>
                      <div className="overflow-x-auto overflow-x-auto max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 font-bold">Coaching Center Name</th>
                              <th className="px-4 py-3 font-bold">Owner Name</th>
                              <th className="px-4 py-3 font-bold">Address</th>
                              <th className="px-4 py-3 font-bold">Date Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {userCoachings.map(c => {
                              const createdDate = c.createdAt 
                                ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'N/A';
                              return (
                                <tr key={c.id}>
                                  <td className="px-4 py-3 font-bold text-slate-800">{c.name || c.coachingName || 'N/A'}</td>
                                  <td className="px-4 py-3 text-slate-600">{c.ownerName || c.teacherName || 'N/A'}</td>
                                  <td className="px-4 py-3 text-slate-500">{c.address || 'N/A'}</td>
                                  <td className="px-4 py-3 font-bold text-indigo-700 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-indigo-500 shrink-0" />
                                    {createdDate}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {userCoachings.length === 0 && (
                          <div className="p-6 text-center text-slate-400 text-xs font-medium">
                            No coachings found for this user.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Subscription Payment Submissions History */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <CreditCard size={16} className="text-indigo-600" /> Account Payment Submissions ({userPayments.length})
                        </h3>
                        
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                          <ArrowUpDown size={13} className="text-slate-400" />
                          <label className="font-bold text-slate-500">Sort Month/Year:</label>
                          <select
                            value={paymentSortOrder}
                            onChange={(e) => setPaymentSortOrder(e.target.value)}
                            className="bg-transparent border-none font-bold text-slate-800 outline-none cursor-pointer"
                          >
                            <option value="latest">Latest Month/Year First</option>
                            <option value="oldest">Oldest Month/Year First</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto overflow-x-auto max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 font-bold">Type of Payment</th>
                              <th className="px-4 py-3 font-bold">Month/Year</th>
                              <th className="px-4 py-3 font-bold">Amount</th>
                              <th className="px-4 py-3 font-bold">Date of Acceptance</th>
                              <th className="px-4 py-3 font-bold">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {sortedUserPayments.map(p => {
                              const submissionDate = p.createdAt 
                                ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '-';
                              const isAccepted = p.status === 'accepted';
                              const acceptanceDate = isAccepted && p.updatedAt 
                                ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '-';
                              return (
                                <tr key={p.id}>
                                  <td className="px-4 py-3 font-extrabold text-indigo-700">
                                    {p.isPlanUpgradeRequest ? (
                                      <span className="flex items-center gap-1.5 text-indigo-700">
                                        <Sparkles size={13} className="text-amber-500" /> User Plan Upgrade ({p.planName})
                                      </span>
                                    ) : p.isPlanDowngradeRequest ? (
                                      <span className="flex items-center gap-1.5 text-indigo-700">
                                        <Sparkles size={13} className="text-amber-500" /> User Plan Downgrade ({p.planName})
                                      </span>
                                    ) : p.isCustomPlan ? (
                                      <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                                        <Shield size={13} className="text-indigo-600" /> Custom Plan
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                                        <Shield size={13} className="text-indigo-600" /> Monthly Subscription ({selectedUserPlanConfig.name})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-800">
                                    {new Date(0, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                                  </td>
                                  <td className="px-4 py-3 font-black text-slate-900">₹{p.amount}</td>
                                  <td className="px-4 py-3 font-bold text-emerald-700">
                                    {acceptanceDate}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => setViewPaymentModal({ show: true, payment: p })}
                                      className="p-1 cursor-pointer text-blue-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors mr-2"
                                    >
                                      <Info size={12}/>
                                    </button>
                                    <button
                                      onClick={() => setShowDeletePaymentModal({ show: true, paymentId: p.id })}
                                      className="p-1 cursor-pointer text-rose-700 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {sortedUserPayments.length === 0 && (
                          <div className="p-6 text-center text-slate-400 text-xs font-medium">
                            No payment submissions found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl"><AlertOctagon size={22}/></div>
              <h3 className="font-extrabold text-slate-900 text-base">Purge User Account?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
              Are you sure you want to delete <strong className="text-slate-900">{selectedUser.name}</strong>? 
              This will permanently purge all created coachings, classes, subjects, and student records. The user status will be marked as <strong className="text-rose-600">Deleted</strong>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowDeleteUserModal(false)} disabled={isProcessing} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button onClick={handleConfirmDeleteUser} disabled={isProcessing} className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md">
                {isProcessing ? 'Purging Data...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {showDeletePaymentModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl"><AlertOctagon size={22}/></div>
              <h3 className="font-extrabold text-slate-900 text-base">Purge Payment Submission?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
              Are you sure you want to delete this payment submission? 
              This will permanently remove the submission.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowDeletePaymentModal({ show: false, paymentId: null })} disabled={isProcessingPaymentDelete} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-blue-200 rounded-xl cursor-pointer">Cancel</button>
              <button onClick={() => handleDeletePayment(showDeletePaymentModal.paymentId)} disabled={isProcessingPaymentDelete} className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                {isProcessingPaymentDelete ? 'Purging Data...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Details Modal */}
      {viewPaymentModal.show && viewPaymentModal.payment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-slate-100 relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setViewPaymentModal({ show: false, payment: null })} 
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Header Section */}
            <div className="flex items-center gap-3 pr-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <Info size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  Payment Details
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Submitted transaction breakdown
                </p>
              </div>
            </div>

            {/* Hero Amount & Billing Month Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-indigo-50/30 to-slate-50 border border-indigo-100/80 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider block">
                  Billing Period
                </span>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                  {new Date(0, viewPaymentModal.payment.month - 1).toLocaleString('default', { month: 'long' })} {viewPaymentModal.payment.year}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider block">
                  Amount
                </span>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  ₹{viewPaymentModal.payment.amount}
                </p>
              </div>
            </div>

            {/* Key-Value Details Grid */}
            <div className="space-y-3 text-xs">
              
              {/* Payment Type & Status Badges */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Payment Type
                  </span>
                  <span className="font-bold text-slate-800 block truncate">
                    {viewPaymentModal.payment.isPlanUpgradeRequest ? 'Plan Upgrade' : 
                    viewPaymentModal.payment.isPlanDowngradeRequest ? 'Plan Downgrade' : 
                    viewPaymentModal.payment.isCustomPlan ? 'Custom Plan' : 'Monthly Subscription'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Status
                  </span>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      viewPaymentModal.payment.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      viewPaymentModal.payment.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {viewPaymentModal.payment.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamps Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Submission Date
                  </span>
                  <p className="font-bold text-slate-700">
                    {viewPaymentModal.payment.createdAt ? new Date(viewPaymentModal.payment.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Acceptance Date
                  </span>
                  <p className="font-bold text-emerald-700">
                    {viewPaymentModal.payment.status === 'accepted' && viewPaymentModal.payment.updatedAt 
                      ? new Date(viewPaymentModal.payment.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Payment Details / Txn ID
                </span>
                <p className="font-medium text-slate-700 break-words leading-relaxed">
                  {viewPaymentModal.payment.paymentDetails || 'N/A'}
                </p>
              </div>

              {/* Admin Remarks */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Admin Remarks
                </span>
                <p className="font-medium text-slate-700 leading-relaxed">
                  {viewPaymentModal.payment.adminRemarks || 'No remarks provided'}
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Floating Green Toast Notification at Bottom Right */}
      {toastInfo && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 max-w-sm text-xs font-bold ${
            toastInfo.isError
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-600 text-white border-emerald-700'
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

      {/* Chat Modal */}
      {chatPartner && (
        <ChatModal
          currentUser={adminUser}
          chatPartner={chatPartner}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
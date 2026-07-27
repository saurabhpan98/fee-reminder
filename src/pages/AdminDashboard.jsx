// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, onSnapshot, getDocs, doc, updateDoc, 
  deleteDoc, query, where 
} from 'firebase/firestore';
import { ChatModal } from '../components/ChatModal';
import { 
  Users, Bell, LogOut, MessageSquare, ShieldAlert, PauseCircle, 
  PlayCircle, Trash2, ArrowLeft, Building2, AlertOctagon 
} from 'lucide-react';

export const AdminDashboard = ({ adminUser, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCoachings, setUserCoachings] = useState([]);
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationRef = useRef(null);

  // Chat State
  const [chatPartner, setChatPartner] = useState(null);

  // Delete User Modal State
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fix 1: Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown]);

  /**
   * Comprehensive Multi-Field & Subcollection Search for User Coachings
   */
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

    if (combinedDocs.size === 0 && userObj.uid) {
      try {
        const subSnap = await getDocs(collection(db, 'users', userObj.uid, 'coachings'));
        subSnap.docs.forEach(d => combinedDocs.set(d.id, { id: d.id, ...d.data() }));
      } catch (e) {
        // Subcollection doesn't exist or permitted
      }
    }

    return Array.from(combinedDocs.values());
  };

  useEffect(() => {
    // 1. Realtime listener on 'users' collection
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

    // 2. Realtime listener for Unread Admin Notifications
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

    return () => {
      unsubUsers();
      unsubChats();
    };
  }, [adminUser.uid]);

  // Fix 2: Remove clicked notification entry immediately & open chat
  const handleSelectNotification = (user) => {
    setNotifications(prev => prev.filter(n => n.user.uid !== user.uid));
    setShowNotificationDropdown(false);
    setChatPartner(user);
  };

  const handleOpenUserProfile = async (user) => {
    setSelectedUser(user);
    const coachings = await fetchCoachingsForUser(user);
    setUserCoachings(coachings);
  };

  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'stopped' ? 'active' : 'stopped';
    
    await updateDoc(doc(db, 'users', selectedUser.uid), {
      status: newStatus
    });

    setSelectedUser(prev => ({ ...prev, status: newStatus }));
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

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-800 pb-12">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl"><Users size={18}/></div>
            <h1 className="font-extrabold text-base tracking-tight">Admin System Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Container with ref */}
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

              {/* Notifications Dropdown */}
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
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">No unread messages</div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {!selectedUser ? (
          /* User Table */
          <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Registered System Users</h2>
                <p className="text-xs text-slate-500 mt-0.5">Click on any user row to manage profiles, pause activity, or chat</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
                {users.length} Users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Name</th>
                    <th className="px-5 py-3.5 font-bold">Email</th>
                    <th className="px-5 py-3.5 font-bold">Coachings/Tuitions</th>
                    <th className="px-5 py-3.5 font-bold">Account Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {users.map((u) => (
                    <tr
                      key={u.uid}
                      onClick={() => handleOpenUserProfile(u)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-slate-900">{u.name || 'Unnamed User'}</td>
                      <td className="px-5 py-4 text-slate-600">{u.email}</td>
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
                        <button className="px-3.5 py-1.5 border border-slate-200 rounded-xl font-bold hover:bg-white text-slate-600">
                          Manage Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <p className="text-xs text-slate-500 mt-1 font-medium">{selectedUser.email} • Phone: {selectedUser.phone || 'N/A'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setChatPartner(selectedUser)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare size={14} /> Open Direct Chat
                  </button>

                  {selectedUser.status !== 'deleted' && (
                    <button
                      onClick={handleToggleUserStatus}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        selectedUser.status === 'stopped' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {selectedUser.status === 'stopped' ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                      {selectedUser.status === 'stopped' ? 'Resume User Activity' : 'Pause User Activity'}
                    </button>
                  )}

                  {selectedUser.status !== 'deleted' && (
                    <button
                      onClick={() => setShowDeleteUserModal(true)}
                      className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete Account
                    </button>
                  )}
                </div>
              </div>

              {/* Registered Coachings List */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600" /> Registered Coachings/Tuitions ({userCoachings.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-bold">Coaching Center Name</th>
                        <th className="px-4 py-3 font-bold">Owner Name</th>
                        <th className="px-4 py-3 font-bold">Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {userCoachings.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 font-bold text-slate-800">{c.name || c.coachingName || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-600">{c.ownerName || c.teacherName || 'N/A'}</td>
                          <td className="px-4 py-3 text-slate-500">{c.address || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {userCoachings.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs font-medium">
                      No coachings found for this user.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
              This will permanently purge all their created coachings, classes, subjects, and student records. The user status will be marked as <strong className="text-rose-600">Deleted</strong>.
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
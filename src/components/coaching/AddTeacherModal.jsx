// src/components/coaching/AddTeacherModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserCheck, Lock, Mail, User, BookOpen, X, Loader2 } from 'lucide-react';

export const AddTeacherModal = ({ isOpen, onClose, coaching, classes, onTeacherAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    assignedClassId: '',
    assignedSubjectId: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);

    let secondaryApp = null;
    try {
      // 1. Firebase Config current app se retrieve karein
      const primaryApp = getApps()[0];
      const firebaseConfig = primaryApp.options;

      // 2. Secondary app instance banayein taaki Owner ka session disturb na ho
      const secondaryAppName = `SecondaryApp_${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // 3. Secondary instance par Teacher account banayein
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email.trim(),
        formData.password
      );

      // 4. Firestore me Staff Teacher role store karein
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || 'N/A',
        role: 'staff_teacher',
        coachingId: coaching.id,
        coachingName: coaching.name,
        assignedClassId: formData.assignedClassId,
        assignedSubjectId: formData.assignedSubjectId,
        createdByOwnerId: coaching.teacherId || coaching.userId || '',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // 5. Secondary instance se sign out karke clean karein
      await signOut(secondaryAuth);

      alert(`Staff Teacher account successfully created for "${formData.name}". Owner session will remain active.`);
      
      // Form reset karein
      setFormData({
        name: '',
        email: '',
        password: '',
        assignedClassId: '',
        assignedSubjectId: '',
        phone: ''
      });

      if (onTeacherAdded) onTeacherAdded();
      onClose();
    } catch (err) {
      console.error('Error creating staff account:', err);
      alert('Failed to create teacher account: ' + err.message);
    } finally {
      // Secondary App Instance ko memory se delete karein
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 relative">
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Add Staff Teacher</h3>
            <p className="text-xs text-slate-500">Create login credentials without switching your session</p>
          </div>
        </div>

        <form onSubmit={handleCreateTeacher} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teacher Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Login Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                placeholder="teacher@domain.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone (Optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Login Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Class</label>
              <select
                required
                value={formData.assignedClassId}
                onChange={(e) => setFormData({ ...formData, assignedClassId: e.target.value, assignedSubjectId: '' })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Subject</label>
              <select
                required
                disabled={!formData.assignedClassId}
                value={formData.assignedSubjectId}
                onChange={(e) => setFormData({ ...formData, assignedSubjectId: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer disabled:bg-slate-100"
              >
                <option value="">Select Subject</option>
                {(classes.find(c => c.id === formData.assignedClassId)?.subjects || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
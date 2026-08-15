// src/components/coaching/AddTeacherModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserCheck, Lock, Mail, User, BookOpen, X, Loader2, CheckCircle2, Link2 } from 'lucide-react';

export const AddTeacherModal = ({ isOpen, onClose, coaching, classes = [], onTeacherAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    assignedClassId: '',
    assignedSubjectId: '',
    phone: ''
  });

  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingUser, setExistingUser] = useState(null);

  if (!isOpen) return null;

  // Check if email already exists in users collection
  const handleEmailBlur = async () => {
    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setExistingUser(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const uDoc = snap.docs[0];
        const uData = { id: uDoc.id, ...uDoc.data() };
        setExistingUser(uData);
        // Pre-fill Name & Phone if available
        setFormData(prev => ({
          ...prev,
          name: uData.name || prev.name,
          phone: uData.phone || prev.phone
        }));
      } else {
        setExistingUser(null);
      }
    } catch (err) {
      console.error('Error checking email:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    if (!formData.assignedClassId || !formData.assignedSubjectId) {
      alert('Please select both Class and Subject.');
      return;
    }

    const selectedClassObj = classes.find(c => c.id === formData.assignedClassId);
    const selectedSubjectObj = selectedClassObj?.subjects?.find(s => s.id === formData.assignedSubjectId);

    const newBatchAssignment = {
      coachingId: coaching.id,
      coachingName: coaching.name || 'Coaching Institute',
      classId: formData.assignedClassId,
      className: selectedClassObj?.className || 'Class',
      subjectId: formData.assignedSubjectId,
      subjectName: selectedSubjectObj?.name || 'Subject',
      assignedAt: new Date().toISOString()
    };

    setLoading(true);

    // -------------------------------------------------------------
    // CASE A: EXISTING TEACHER (ATTACH NEW BATCH TO EXISTING ACCOUNT)
    // -------------------------------------------------------------
    if (existingUser) {
      try {
        const userRef = doc(db, 'users', existingUser.id || existingUser.uid);
        const currentBatches = existingUser.assignedBatches || [];

        // Check if already assigned to this exact batch
        const isDuplicate = currentBatches.some(
          b => b.coachingId === coaching.id && b.classId === formData.assignedClassId && b.subjectId === formData.assignedSubjectId
        );

        if (isDuplicate) {
          alert('This teacher is already assigned to this Class and Subject batch.');
          setLoading(false);
          return;
        }

        const updatedBatches = [...currentBatches, newBatchAssignment];

        await updateDoc(userRef, {
          role: 'staff_teacher',
          assignedBatches: updatedBatches,
          // Backward compatibility fallback fields
          assignedClassId: formData.assignedClassId,
          assignedSubjectId: formData.assignedSubjectId,
          coachingId: coaching.id,
          updatedAt: new Date().toISOString()
        });

        alert(`Success! Batch "${selectedClassObj?.className} - ${selectedSubjectObj?.name}" has been attached to existing teacher account (${formData.email}).`);
        if (onTeacherAdded) onTeacherAdded();
        onClose();
      } catch (err) {
        console.error('Error attaching batch to existing teacher:', err);
        alert('Failed to attach batch: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // -------------------------------------------------------------
    // CASE B: NEW TEACHER (CREATE ACCOUNT VIA SECONDARY INSTANCE)
    // -------------------------------------------------------------
    let secondaryApp = null;
    try {
      const primaryApp = getApps()[0];
      const firebaseConfig = primaryApp.options;

      const secondaryAppName = `SecondaryApp_${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email.trim(),
        formData.password
      );

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password, // Plain text ref for owner visibility
        phone: formData.phone.trim() || 'N/A',
        role: 'staff_teacher',
        coachingId: coaching.id,
        coachingName: coaching.name,
        assignedBatches: [newBatchAssignment],
        assignedClassId: formData.assignedClassId,
        assignedSubjectId: formData.assignedSubjectId,
        createdByOwnerId: coaching.teacherId || coaching.userId || '',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      await signOut(secondaryAuth);

      alert(`New Faculty account created successfully for "${formData.name}". Owner login remains active.`);

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
      console.error('Error creating new teacher:', err);
      alert('Failed to create teacher account: ' + err.message);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
      setLoading(false);
    }
  };

  const selectedClassObj = classes.find(c => c.id === formData.assignedClassId);

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
            <h3 className="font-extrabold text-slate-900 text-base">Assign Faculty Teacher</h3>
            <p className="text-xs text-slate-500">Create new login or attach to an existing teacher account</p>
          </div>
        </div>

        <form onSubmit={handleSaveTeacher} className="space-y-3.5">
          {/* Email Address & Auto-Detection Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teacher Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (existingUser) setExistingUser(null);
                }}
                onBlur={handleEmailBlur}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                placeholder="teacher@domain.com"
              />
              {checkingEmail && (
                <Loader2 size={14} className="animate-spin text-slate-400 absolute right-3.5 top-3" />
              )}
            </div>

            {/* Existing User Notification Callout */}
            {existingUser && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <Link2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Existing Account Found!</p>
                  <p className="text-[11px] text-emerald-700">
                    This teacher already has login credentials. This class batch will simply be added to their existing account.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone (Optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                placeholder="9876543210"
              />
            </div>
          </div>

          {/* Password only required if creating a NEW account */}
          {!existingUser && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Create Login Password</label>
              <input
                type="password"
                required={!existingUser}
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Minimum 6 characters"
              />
            </div>
          )}

          {/* Batch Assignment Dropdowns */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign Class</label>
              <select
                required
                value={formData.assignedClassId}
                onChange={(e) => setFormData({ ...formData, assignedClassId: e.target.value, assignedSubjectId: '' })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assign Subject</label>
              <select
                required
                disabled={!formData.assignedClassId}
                value={formData.assignedSubjectId}
                onChange={(e) => setFormData({ ...formData, assignedSubjectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer disabled:bg-slate-100"
              >
                <option value="">Select Subject</option>
                {(selectedClassObj?.subjects || []).map(s => (
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
                  <Loader2 size={14} className="animate-spin" /> Processing...
                </>
              ) : existingUser ? (
                <>
                  <Link2 size={14} /> Attach to Existing Account
                </>
              ) : (
                'Create New Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
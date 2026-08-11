// src/components/dashboard/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { Building, Plus, Lock, Sparkles, X, BarChart3, Building2 } from 'lucide-react';
import { canCreateCoaching, getUserPlanConfig } from '../../utils/planUtils';
import { AnalyticsSection } from './AnalyticsSection';

export const TeacherDashboard = ({ userId, userData, onOpenUpgradeModal, onSelectCoaching }) => {
  const [coachings, setCoachings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', ownerName: '', address: '' });
  
  // Tab Switcher State: 'coachings' | 'analytics'
  const [activeDashboardTab, setActiveDashboardTab] = useState('coachings');

  useEffect(() => {
    fetchCoachings();
  }, [userId]);

  const fetchCoachings = async () => {
    const q = query(collection(db, 'coachings'), where('teacherId', '==', userId));
    const snap = await getDocs(q);
    setCoachings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleDismissNotification = async () => {
    if (userData?.uid || userId) {
      try {
        await updateDoc(doc(db, 'users', userData?.uid || userId), {
          'planNotification.show': false
        });
      } catch (err) {
        console.error("Error clearing plan notification:", err);
      }
    }
  };

  const handleOpenAddModal = () => {
    if (!canCreateCoaching(userData, coachings.length)) {
      onOpenUpgradeModal();
    } else {
      setShowAddModal(true);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canCreateCoaching(userData, coachings.length)) {
      alert("Plan limit reached. Please upgrade to Pro Plan.");
      return;
    }
    await addDoc(collection(db, 'coachings'), {
      ...formData,
      teacherId: userId,
      createdAt: new Date().toISOString()
    });
    setFormData({ name: '', ownerName: '', address: '' });
    setShowAddModal(false);
    fetchCoachings();
  };

  const planConfig = getUserPlanConfig(userData);
  const canAddMoreCoaching = canCreateCoaching(userData, coachings.length);
  const planNotif = userData?.planNotification;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* ONE-TIME PLAN CHANGE ALERT BANNER */}
      {planNotif?.show && (
        <div className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Sparkles size={18} className="text-amber-300" />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight">
                Your plan has been changed to <span className="underline decoration-amber-300 underline-offset-2">{planNotif.planName}</span>.
              </p>
              <p className="text-[11px] text-indigo-100 font-medium">
                Your account feature limits and capabilities have been updated accordingly.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismissNotification}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dashboard Top Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveDashboardTab('coachings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeDashboardTab === 'coachings' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={16} />
            <span>My Coachings ({coachings.length})</span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('analytics')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeDashboardTab === 'analytics' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={16} />
            <span>Analytics & Financial Insights</span>
          </button>
        </div>

        {activeDashboardTab === 'coachings' && (
          <button
            onClick={handleOpenAddModal}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              canAddMoreCoaching 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-200 font-extrabold'
            }`}
          >
            {canAddMoreCoaching ? <Plus size={16} /> : <Lock size={16} />}
            {canAddMoreCoaching ? 'New Coaching' : 'Upgrade to Add Coaching'}
          </button>
        )}
      </div>

      {/* TAB 1: COACHINGS LIST */}
      {activeDashboardTab === 'coachings' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Your Coaching Institutes</h1>
              <p className="text-xs text-slate-500 mt-1">
                Managing {coachings.length} of {planConfig.maxCoachings} allowed Coaching(s) ({planConfig.name})
              </p>
            </div>
          </div>

          {coachings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Building size={24} />
              </div>
              <p className="text-slate-600 font-medium">No coaching institutes added yet.</p>
              <button
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Add Your First Coaching
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coachings.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCoaching(c)}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{c.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Owner: {c.ownerName}</p>
                  <p className="text-xs text-slate-500 mt-3 truncate">{c.address}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: FINANCIAL ANALYTICS */}
      {activeDashboardTab === 'analytics' && (
        <AnalyticsSection 
          userId={userId} 
          coachings={coachings} 
          userData={userData} 
          onOpenUpgradeModal={onOpenUpgradeModal} 
        />
      )}

      {/* Add Coaching Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800">Add Coaching Institute</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Coaching Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Owner Name"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
              <textarea
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
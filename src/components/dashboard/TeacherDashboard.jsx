// src/components/dashboard/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Building, Plus } from 'lucide-react';

export const TeacherDashboard = ({ userId, onSelectCoaching }) => {
  const [coachings, setCoachings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', ownerName: '', address: '' });

  useEffect(() => {
    fetchCoachings();
  }, [userId]);

  const fetchCoachings = async () => {
    const q = query(collection(db, 'coachings'), where('teacherId', '==', userId));
    const snap = await getDocs(q);
    setCoachings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'coachings'), {
      ...formData,
      teacherId: userId,
      createdAt: new Date().toISOString()
    });
    setFormData({ name: '', ownerName: '', address: '' });
    setShowAddModal(false);
    fetchCoachings();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your Coaching Institutes</h1>
          <p className="text-xs text-slate-500 mt-1">Select a coaching to manage classes, subjects, and fees</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-100"
        >
          <Plus size={16} /> New Coaching
        </button>
      </div>

      {coachings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Building size={24} />
          </div>
          <p className="text-slate-600 font-medium">No coaching institutes added yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
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
              <p className="text-xs text-slate-500 mt-3 truncate">📍 {c.address}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
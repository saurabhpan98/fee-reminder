// src/components/coaching/EditCoachingModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Building2, User, MapPin, QrCode, X, Check, Loader2 } from 'lucide-react';

export const EditCoachingModal = ({ isOpen, onClose, coaching, onUpdated }) => {
  const [formData, setFormData] = useState({
    name: coaching?.name || '',
    ownerName: coaching?.ownerName || '',
    address: coaching?.address || '',
    upiId: coaching?.upiId || coaching?.upi || ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Coaching Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const coachingRef = doc(db, 'coachings', coaching.id);
      const updatedFields = {
        name: formData.name.trim(),
        ownerName: formData.ownerName.trim(),
        address: formData.address.trim(),
        upiId: formData.upiId.trim(),
        upi: formData.upiId.trim(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(coachingRef, updatedFields);

      // Local state update callback
      if (onUpdated) {
        onUpdated({ ...coaching, ...updatedFields });
      }

      onClose();
    } catch (err) {
      console.error('Error updating coaching details:', err);
      alert('Failed to update coaching: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Coaching Details</h3>
            <p className="text-xs text-slate-400 font-medium">View & update institute profile</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdate} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 size={12} className="text-indigo-600" /> Coaching Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Logic Tutors"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User size={12} className="text-indigo-600" /> Owner / Director Name
            </label>
            <input
              type="text"
              required
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              placeholder="e.g. Gunjan"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin size={12} className="text-indigo-600" /> Address / Location
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Delhi, Sector 12"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <QrCode size={12} className="text-indigo-600" /> Dynamic UPI ID (For Receipts & QR)
            </label>
            <input
              type="text"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              placeholder="e.g. yourname@okhdfcbank"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={14} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Shield, Trash2, UserCheck } from 'lucide-react';

export const AdminDashboard = () => {
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setTeachers(list.filter(u => u.role === 'teacher'));
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this teacher profile?')) {
      await deleteDoc(doc(db, 'users', userId));
      fetchUsers();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Website Admin Console</h1>
          <p className="text-xs text-slate-500">System oversight for registered educators</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <th className="p-4 font-semibold">Teacher Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Joined Date</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map(teacher => (
              <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-800">{teacher.name}</td>
                <td className="p-4 text-slate-600">{teacher.email}</td>
                <td className="p-4 text-slate-400 text-xs">{new Date(teacher.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDeleteUser(teacher.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
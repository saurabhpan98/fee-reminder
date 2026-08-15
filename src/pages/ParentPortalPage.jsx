// src/pages/ParentPortalPage.jsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { downloadPaymentReceiptPDF } from '../utils/exportUtils';
import { buildUPIPaymentURL } from '../utils/upiUtils';
import QRCode from 'qrcode';
import { ShieldCheck, Phone, Download, CreditCard, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ParentPortalPage = ({ onBack }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searched, setSearched] = useState(false);
  const [studentRecords, setStudentRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (phoneNumber.trim().length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber.trim()}`;
      const q = query(collection(db, 'students'), where('phone', '==', formattedPhone));
      const snap = await getDocs(q);
      
      const list = [];
      for (const sDoc of snap.docs) {
        const data = sDoc.data();
        const coachingSnap = await getDoc(doc(db, 'coachings', data.coachingId));
        const coachingData = coachingSnap.exists() ? coachingSnap.data() : { name: 'Tuition Center' };
        list.push({ id: sDoc.id, ...data, coaching: coachingData });
      }
      setStudentRecords(list);
      setSearched(true);
    } catch (err) {
      console.error(err);
      alert('Error fetching student details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1.5"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Parent & Student Fee Portal</h1>
              <p className="text-xs text-slate-500">Check monthly payment records and download official PDF receipts</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter Registered Mobile Number (e.g. 9876543210)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              {loading ? 'Searching...' : 'Search Record'}
            </button>
          </form>

          {searched && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {studentRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No registered student found with this mobile number.
                </div>
              ) : (
                studentRecords.map((student) => (
                  <div key={student.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{student.name}</h2>
                        <p className="text-xs text-indigo-600 font-bold">{student.coaching?.name}</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase">
                        Enrolled
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase">Enrolled Subject Batches</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {student.enrollments?.map((enr, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                            <p className="font-extrabold text-xs text-slate-800">{enr.className} - {enr.subjectName}</p>
                            <p className="text-xs text-slate-500">Monthly Fee: <strong>₹{enr.monthlyFee}</strong></p>
                          </div>
                        ))}
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
// src/pages/AddStudentPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ArrowLeft, AlertTriangle, PlusCircle, Lock } from 'lucide-react';
import { canAddStudent, getUserPlanConfig } from '../utils/planUtils';

const COUNTRY_CODES = [
  { code: '+91', flag: ' ', country: 'India' },
  { code: '+1', flag: ' ', country: 'USA' },
  { code: '+44', flag: ' ', country: 'UK' },
  { code: '+61', flag: ' ', country: 'Australia' }
];

export const AddStudentPage = ({ coachingId, userData, classes, onOpenUpgradeModal, onComplete, onCancel, onGoBack }) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matchingStudents, setMatchingStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [coachingStudentCount, setCoachingStudentCount] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: 'Male',
    address: '',
    classId: '',
    subjectId: '',
    monthlyFee: '',
    joiningDate: new Date().toISOString().split('T')[0]
  });

  const fullPhone = `${countryCode}${phoneNumber}`;

  useEffect(() => {
    const fetchTotalStudents = async () => {
      const q = query(collection(db, 'students'), where('coachingId', '==', coachingId));
      const snap = await getDocs(q);
      setCoachingStudentCount(snap.size);
    };
    fetchTotalStudents();
  }, [coachingId]);

  useEffect(() => {
    const searchExistingPhone = async () => {
      if (phoneNumber.length < 8) {
        setMatchingStudents([]);
        return;
      }
      
      const q = query(
        collection(db, 'students'),
        where('phone', '==', fullPhone),
        where('coachingId', '==', coachingId)
      );
      
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatchingStudents(list);
    };
    searchExistingPhone();
  }, [phoneNumber, countryCode, coachingId]);

  const canAddMore = canAddStudent(userData, coachingStudentCount);
  const planConfig = getUserPlanConfig(userData);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudentId && !canAddMore) {
      alert(`Starter Plan allows up to 50 active students. Please upgrade to Pro Plan for unlimited students.`);
      onOpenUpgradeModal();
      return;
    }

    const selectedClass = classes.find(c => c.id === formData.classId);
    const selectedSubject = selectedClass?.subjects?.find(s => s.id === formData.subjectId);

    if (!selectedClass || !selectedSubject) {
      alert("Please select a valid class and subject.");
      return;
    }

    const newEnrollment = {
      enrollmentId: `enr_${Date.now()}`,
      classId: formData.classId,
      className: selectedClass.className,
      subjectId: formData.subjectId,
      subjectName: selectedSubject.name,
      monthlyFee: Number(formData.monthlyFee),
      joinedAt: formData.joiningDate,
      status: 'active'
    };

    if (selectedStudentId) {
      const student = matchingStudents.find(s => s.id === selectedStudentId);
      await updateDoc(doc(db, 'students', selectedStudentId), {
        enrollments: [...(student.enrollments || []), newEnrollment]
      });
    } else {
      await addDoc(collection(db, 'students'), {
        name: formData.name,
        email: formData.email,
        gender: formData.gender,
        phone: fullPhone,
        address: formData.address,
        coachingId,
        enrollments: [newEnrollment],
        createdAt: new Date().toISOString()
      });
    }
    onComplete();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Go Back
        </button>

        {!canAddMore && !selectedStudentId && (
          <button
            onClick={onOpenUpgradeModal}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Lock size={14} /> Limit Exceeded (50/50 Students) - Upgrade
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Register New Student</h2>
        
        {!canAddMore && !selectedStudentId && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900 flex justify-between items-center">
            <span>You have reached the maximum 50 students limit for Starter Plan.</span>
            <button
              onClick={onOpenUpgradeModal}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold"
            >
              Upgrade Now
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Phone Number</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Student Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Class</label>
              <select
                name="classId"
                required
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: '' })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Subject</label>
              <select
                name="subjectId"
                required
                disabled={!formData.classId}
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
              >
                <option value="">Select Subject</option>
                {(classes.find(c => c.id === formData.classId)?.subjects || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.teacherName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Monthly Fee (₹)</label>
              <input
                type="number"
                required
                value={formData.monthlyFee}
                onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                placeholder="1500"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedStudentId && !canAddMore}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
            >
              Confirm & Save Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
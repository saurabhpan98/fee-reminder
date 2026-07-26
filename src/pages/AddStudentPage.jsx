// src/pages/AddStudentPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ArrowLeft, AlertTriangle, PlusCircle } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', country: 'India' },
  { code: '+1', flag: '🇺🇸', country: 'USA' },
  { code: '+44', flag: '🇬🇧', country: 'UK' },
  { code: '+61', flag: '🇦🇺', country: 'Australia' }
];

export const AddStudentPage = ({ coachingId, classes, onComplete, onCancel, onGoBack }) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matchingStudents, setMatchingStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  
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

  const handleSelectStudent = (student) => {
    if (selectedStudentId === student.id) {
      setSelectedStudentId(null);
      setFormData(prev => ({ ...prev, name: '', email: '', gender: 'Male', address: '' }));
      setWarningMessage('');
    } else {
      setSelectedStudentId(student.id);
      setFormData(prev => ({
        ...prev,
        name: student.name,
        email: student.email,
        gender: student.gender,
        address: student.address
      }));
      checkDuplicateEnrollment(student, formData.classId, formData.subjectId);
    }
  };

  const checkDuplicateEnrollment = (student, classId, subjectId) => {
    if (!classId || !subjectId) return false;

    const isDuplicate = student.enrollments?.some(
      e => e.classId === classId && e.subjectId === subjectId && e.status === 'active'
    );

    if (isDuplicate) {
      setWarningMessage('⚠️ Student is already actively enrolled in this exact Class and Subject!');
      return true;
    } else {
      setWarningMessage('');
      return false;
    }
  };

  const handleClassSubjectChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    if (selectedStudentId) {
      const student = matchingStudents.find(s => s.id === selectedStudentId);
      if (student) {
        checkDuplicateEnrollment(
          student, 
          name === 'classId' ? value : formData.classId,
          name === 'subjectId' ? value : formData.subjectId
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      if (checkDuplicateEnrollment(student, formData.classId, formData.subjectId)) return;

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

  const currentClassSubjects = classes.find(c => c.id === formData.classId)?.subjects || [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Register New Student</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {matchingStudents.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
              <p className="text-xs font-semibold text-amber-800 uppercase flex items-center gap-1.5">
                <AlertTriangle size={16} /> Existing Registered Students with this Number:
              </p>
              <div className="grid gap-2">
                {matchingStudents.map(student => (
                  <div
                    key={student.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      selectedStudentId === student.id
                        ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                        : 'bg-white border-amber-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">
                        Enrolled in: {student.enrollments?.map(e => `${e.className} (${e.subjectName})`).join(', ') || 'None'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedStudentId === student.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {selectedStudentId === student.id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
              {selectedStudentId && (
                <button
                  type="button"
                  onClick={() => handleSelectStudent({ id: selectedStudentId })}
                  className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1"
                >
                  <PlusCircle size={14} /> Register new sibling/student with same phone number
                </button>
              )}
            </div>
          )}

          {warningMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
              {warningMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Student Name</label>
              <input
                type="text"
                required
                disabled={!!selectedStudentId}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                disabled={!!selectedStudentId}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gender</label>
              <select
                disabled={!!selectedStudentId}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-100 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Joining Date</label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Address</label>
            <textarea
              disabled={!!selectedStudentId}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows="2"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Class</label>
              <select
                name="classId"
                required
                value={formData.classId}
                onChange={handleClassSubjectChange}
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
                onChange={handleClassSubjectChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
              >
                <option value="">Select Subject</option>
                {currentClassSubjects.map(s => (
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
              disabled={!!warningMessage}
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
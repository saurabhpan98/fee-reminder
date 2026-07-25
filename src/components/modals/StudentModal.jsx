// src/components/modals/StudentModal.jsx
import React, { useState, useEffect } from "react";
import { Icons } from "../Icons";
import { COUNTRY_CODES } from "../../utils/helpers";

export function StudentModal({
  isStudentModalOpen,
  setIsStudentModalOpen,
  editingStudentId,
  handleSaveStudent,
  studentFormData,
  setStudentFormData,
  coachings,
  classes,
  subjects
}) {
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");

  // Parse phone number into Country Code + Local Number when modal opens
  useEffect(() => {
    if (isStudentModalOpen) {
      const rawPhone = studentFormData.phone || "";
      const matchedCode = COUNTRY_CODES.find(c => rawPhone.startsWith(c.code));

      if (matchedCode) {
        setCountryCode(matchedCode.code);
        setLocalPhone(rawPhone.replace(matchedCode.code, "").trim());
      } else {
        setCountryCode("+91");
        setLocalPhone(rawPhone.trim());
      }
    }
  }, [isStudentModalOpen, studentFormData.phone]);

  if (!isStudentModalOpen) return null;

  const handlePhoneChange = (code, number) => {
    setCountryCode(code);
    setLocalPhone(number);
    const fullPhone = number.trim() ? `${code} ${number.trim()}` : "";
    setStudentFormData(prev => ({ ...prev, phone: fullPhone }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-scale-up">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900">
            {editingStudentId ? "Edit Student Details" : "Add New Student"}
          </h3>
          <button 
            onClick={() => setIsStudentModalOpen(false)} 
            className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSaveStudent} className="space-y-3">
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coaching</label>
            <select 
              required
              value={studentFormData.coachingId}
              onChange={(e) => setStudentFormData({ ...studentFormData, coachingId: e.target.value, classId: "", subjectId: "" })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="">Select Coaching</option>
              {coachings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class Level</label>
              <select 
                required
                value={studentFormData.classId}
                onChange={(e) => setStudentFormData({ ...studentFormData, classId: e.target.value, subjectId: "" })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="">Select Class</option>
                {classes.filter(cl => cl.coachingId === studentFormData.coachingId).map(cl => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
              <select 
                required
                value={studentFormData.subjectId}
                onChange={(e) => setStudentFormData({ ...studentFormData, subjectId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="">Select Subject</option>
                {subjects.filter(sb => sb.classId === studentFormData.classId).map(sb => (
                  <option key={sb.id} value={sb.id}>{sb.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Full Name</label>
            <input 
              type="text" required placeholder="Rahul Sharma"
              value={studentFormData.name}
              onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          {/* Phone Input with Country Flag Picker */}
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => handlePhoneChange(e.target.value, localPhone)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input 
                type="tel"
                placeholder="9876543210"
                value={localPhone}
                onChange={(e) => handlePhoneChange(countryCode, e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Fees (₹)</label>
              <input 
                type="number" required placeholder="1500"
                value={studentFormData.monthlyFees}
                onChange={(e) => setStudentFormData({ ...studentFormData, monthlyFees: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Joining Date</label>
              <input 
                type="date" required
                value={studentFormData.joiningDate}
                onChange={(e) => setStudentFormData({ ...studentFormData, joiningDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {editingStudentId && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Enrollment Status</label>
              <select 
                value={studentFormData.status}
                onChange={(e) => setStudentFormData({ ...studentFormData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="enrolled">🟢 Enrolled</option>
                <option value="left">🚫 Left Class</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address</label>
            <input 
              type="text" placeholder="Street / Area details"
              value={studentFormData.address}
              onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsStudentModalOpen(false)} 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl font-semibold cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs rounded-xl font-semibold shadow-xs cursor-pointer transition-all duration-150"
            >
              {editingStudentId ? "Update Student" : "Save Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
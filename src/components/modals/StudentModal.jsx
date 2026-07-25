// src/components/modals/StudentModal.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  subjects,
  students = []
}) {
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");
  const [autofilledStudentId, setAutofilledStudentId] = useState(null);
  const [isSibling, setIsSibling] = useState(false);

  // Parse phone number into Country Code + Local Number when modal opens
  useEffect(() => {
    if (isStudentModalOpen) {
      setAutofilledStudentId(null);
      setIsSibling(false);
      const rawPhone = studentFormData.phone || "";
      const matchedCode = COUNTRY_CODES.find((c) => rawPhone.startsWith(c.code));

      if (matchedCode) {
        setCountryCode(matchedCode.code);
        setLocalPhone(rawPhone.replace(matchedCode.code, "").trim());
      } else {
        setCountryCode("+91");
        setLocalPhone(rawPhone.trim());
      }
    }
  }, [isStudentModalOpen, editingStudentId]);

  const fullPhone = useMemo(() => {
    return localPhone.trim() ? `${countryCode} ${localPhone.trim()}` : "";
  }, [countryCode, localPhone]);

  // Find existing students in the SAME coaching with the SAME phone number
  const existingMatchesInCoaching = useMemo(() => {
    if (editingStudentId || !studentFormData.coachingId || !localPhone.trim()) {
      return [];
    }
    return students.filter(
      (s) =>
        s.coachingId === studentFormData.coachingId &&
        s.phone &&
        s.phone.trim() === fullPhone.trim()
    );
  }, [students, studentFormData.coachingId, fullPhone, editingStudentId, localPhone]);

  // Check if current form selections match an ALREADY ENROLLED Class + Subject for this phone
  const isDuplicateEnrollment = useMemo(() => {
    if (
      editingStudentId ||
      isSibling || // If marked as a sibling, ignore duplicate block
      !studentFormData.coachingId ||
      !studentFormData.classId ||
      !studentFormData.subjectId ||
      !localPhone.trim()
    ) {
      return false;
    }
    return students.some(
      (s) =>
        s.coachingId === studentFormData.coachingId &&
        s.classId === studentFormData.classId &&
        s.subjectId === studentFormData.subjectId &&
        s.phone &&
        s.phone.trim() === fullPhone.trim()
    );
  }, [students, studentFormData, fullPhone, editingStudentId, localPhone, isSibling]);

  if (!isStudentModalOpen) return null;

  const handlePhoneChange = (code, number) => {
    setCountryCode(code);
    setLocalPhone(number);
    const updatedFullPhone = number.trim() ? `${code} ${number.trim()}` : "";
    setStudentFormData((prev) => ({ ...prev, phone: updatedFullPhone }));
    setAutofilledStudentId(null);
    setIsSibling(false);
  };

  const handleSelectExistingStudent = (existingStudent) => {
    setStudentFormData((prev) => ({
      ...prev,
      name: existingStudent.name || "",
      address: existingStudent.address || "",
      monthlyFees: existingStudent.monthlyFees || "",
      joiningDate: existingStudent.joiningDate || new Date().toISOString().split("T")[0]
    }));
    setAutofilledStudentId(existingStudent.id);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (isDuplicateEnrollment) return;
    handleSaveStudent(e);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coaching</label>
            <select 
              required
              value={studentFormData.coachingId}
              onChange={(e) => setStudentFormData({ ...studentFormData, coachingId: e.target.value, classId: "", subjectId: "" })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="">Select Coaching</option>
              {coachings.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                {classes.filter((cl) => cl.coachingId === studentFormData.coachingId).map((cl) => (
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
                {subjects.filter((sb) => sb.classId === studentFormData.classId).map((sb) => (
                  <option key={sb.id} value={sb.id}>{sb.name}</option>
                ))}
              </select>
            </div>
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

          {/* EXISTING MATCHES PROMPT */}
          {existingMatchesInCoaching.length > 0 && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                <Icons.AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Existing Student(s) Found ({existingMatchesInCoaching.length})</span>
              </div>
              <p className="text-3xs text-amber-800 leading-relaxed font-medium">
                Student(s) with this phone number are already registered in this coaching center. Choose one to autofill their profile for enrolling in a new class/subject:
              </p>

              <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
                {existingMatchesInCoaching.map((st) => {
                  const classObj = classes.find((cl) => cl.id === st.classId);
                  const subjectObj = subjects.find((sb) => sb.id === st.subjectId);
                  const isSelected = autofilledStudentId === st.id;

                  return (
                    <div 
                      key={st.id} 
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected 
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900" 
                          : "bg-white border-amber-200 text-slate-800"
                      }`}
                    >
                      <div className="text-3xs space-y-0.5">
                        <div className="font-bold text-xs text-slate-900">{st.name}</div>
                        <div className="text-slate-500">
                          Class: {classObj?.name || "N/A"} • Subject: {subjectObj?.name || "N/A"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectExistingStudent(st)}
                        className={`px-2.5 py-1 text-3xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-amber-100 hover:bg-amber-200 text-amber-900"
                        }`}
                      >
                        {isSelected ? "✓ Selected" : `Enroll ${st.name.split(" ")[0]}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DUPLICATE ENROLLMENT WARNING BANNER WITH SIBLING CHECKBOX */}
          {(isDuplicateEnrollment || isSibling) && (
            <div className={`p-3.5 border rounded-2xl space-y-2.5 animate-fade-in ${
              isSibling 
                ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <div className="flex items-start gap-2 text-xs font-semibold">
                <Icons.AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isSibling ? "text-emerald-600" : "text-rose-600"}`} />
                <span>
                  {isSibling 
                    ? "Sibling enrollment enabled! You can now proceed to save." 
                    : "A student with this phone number is already enrolled in this exact Class and Subject."}
                </span>
              </div>

              {/* Sibling Checkbox Option */}
              <label className="flex items-center gap-2 pt-1 border-t border-slate-200/60 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input 
                  type="checkbox"
                  checked={isSibling}
                  onChange={(e) => setIsSibling(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Are you adding a sibling?</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Full Name</label>
            <input 
              type="text" required placeholder="Rahul Sharma"
              value={studentFormData.name}
              onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
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
              disabled={isDuplicateEnrollment}
              className={`px-4 py-2 text-white text-xs rounded-xl font-semibold shadow-xs transition-all duration-150 ${
                isDuplicateEnrollment 
                  ? "bg-slate-300 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
              }`}
            >
              {editingStudentId ? "Update Student" : "Save Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
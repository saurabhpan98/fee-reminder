// src/components/modals/StudentModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Icons } from "../Icons";
import { COUNTRY_CODES } from "../../utils/helpers";

export function StudentModal({
  isStudentModalOpen,
  setIsStudentModalOpen,
  editingStudent,
  editingEnrollmentId,
  handleSaveStudent,
  coachings,
  classes,
  subjects,
  students = []
}) {
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");

  const [studentSelectionMode, setStudentSelectionMode] = useState("none"); // "none" | "existing" | "new_sibling"
  const [selectedStudentDoc, setSelectedStudentDoc] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    coachingId: "",
    classId: "",
    subjectId: "",
    monthlyFees: "",
    joiningDate: new Date().toISOString().split("T")[0],
    status: "enrolled",
    siblingIndex: 1
  });

  useEffect(() => {
    if (isStudentModalOpen) {
      setStudentSelectionMode("none");
      setSelectedStudentDoc(null);

      if (editingStudent) {
        // Editing an existing enrollment
        const rawPhone = editingStudent.phone || "";
        const matchedCode = COUNTRY_CODES.find((c) => rawPhone.startsWith(c.code));
        if (matchedCode) {
          setCountryCode(matchedCode.code);
          setLocalPhone(rawPhone.replace(matchedCode.code, "").trim());
        } else {
          setCountryCode("+91");
          setLocalPhone(rawPhone.trim());
        }

        const currentEnr = (editingStudent.enrollments || []).find((e) => e.enrollmentId === editingEnrollmentId) || {};

        setFormData({
          name: editingStudent.name || "",
          address: editingStudent.address || "",
          coachingId: currentEnr.coachingId || "",
          classId: currentEnr.classId || "",
          subjectId: currentEnr.subjectId || "",
          monthlyFees: currentEnr.monthlyFees || "",
          joiningDate: currentEnr.joiningDate || new Date().toISOString().split("T")[0],
          status: currentEnr.status || "enrolled",
          siblingIndex: editingStudent.siblingIndex || 1
        });
      } else {
        // Adding new student/enrollment
        setLocalPhone("");
        setCountryCode("+91");
        setFormData({
          name: "",
          address: "",
          coachingId: "",
          classId: "",
          subjectId: "",
          monthlyFees: "",
          joiningDate: new Date().toISOString().split("T")[0],
          status: "enrolled",
          siblingIndex: 1
        });
      }
    }
  }, [isStudentModalOpen, editingStudent, editingEnrollmentId]);

  const fullPhone = useMemo(() => {
    return localPhone.trim() ? `${countryCode} ${localPhone.trim()}` : "";
  }, [countryCode, localPhone]);

  // Find existing unique student documents for this phone number
  const matchedStudents = useMemo(() => {
    if (editingStudent || !localPhone.trim()) return [];
    return students.filter(
      (s) => s.phone && s.phone.trim() === fullPhone.trim()
    );
  }, [students, fullPhone, localPhone, editingStudent]);

  // Calculate highest sibling index
  const nextSiblingIndex = useMemo(() => {
    if (matchedStudents.length === 0) return 1;
    const maxIdx = Math.max(...matchedStudents.map((s) => s.siblingIndex || 1));
    return maxIdx + 1;
  }, [matchedStudents]);

  // Check if target student is ALREADY enrolled in selected Class + Subject
  const duplicateConflict = useMemo(() => {
    if (!formData.coachingId || !formData.classId || !formData.subjectId) return false;

    const targetStudent = editingStudent || selectedStudentDoc;
    if (!targetStudent) return false;

    return (targetStudent.enrollments || []).some((e) => {
      if (editingEnrollmentId && e.enrollmentId === editingEnrollmentId) return false;
      return (
        e.coachingId === formData.coachingId &&
        e.classId === formData.classId &&
        e.subjectId === formData.subjectId
      );
    });
  }, [formData.coachingId, formData.classId, formData.subjectId, editingStudent, selectedStudentDoc, editingEnrollmentId]);

  if (!isStudentModalOpen) return null;

  const handlePhoneChange = (code, number) => {
    setCountryCode(code);
    setLocalPhone(number);
    setStudentSelectionMode("none");
    setSelectedStudentDoc(null);
  };

  const handleSelectExistingStudent = (st) => {
    setStudentSelectionMode("existing");
    setSelectedStudentDoc(st);
    setFormData((prev) => ({
      ...prev,
      name: st.name || "",
      address: st.address || "",
      siblingIndex: st.siblingIndex || 1
    }));
  };

  const handleSelectAddNewSibling = () => {
    setStudentSelectionMode("new_sibling");
    setSelectedStudentDoc(null);
    const firstMatch = matchedStudents[0];
    setFormData((prev) => ({
      ...prev,
      name: "",
      address: firstMatch?.address || "",
      siblingIndex: nextSiblingIndex
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (duplicateConflict) return;

    handleSaveStudent({
      ...formData,
      phone: fullPhone,
      targetStudentDoc: selectedStudentDoc
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900">
            {editingStudent ? "Edit Class Enrollment" : "Add Student / Course"}
          </h3>
          <button 
            onClick={() => setIsStudentModalOpen(false)} 
            className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Coaching */}
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coaching</label>
            <select 
              required
              value={formData.coachingId}
              onChange={(e) => setFormData({ ...formData, coachingId: e.target.value, classId: "", subjectId: "" })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="">Select Coaching</option>
              {coachings.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Class & Subject */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class Level</label>
              <select 
                required
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: "" })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="">Select Class</option>
                {classes.filter((cl) => cl.coachingId === formData.coachingId).map((cl) => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
              <select 
                required
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="">Select Subject</option>
                {subjects.filter((sb) => sb.classId === formData.classId).map((sb) => (
                  <option key={sb.id} value={sb.id}>{sb.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone Number */}
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

          {/* MATCHING EXISTING STUDENTS */}
          {matchedStudents.length > 0 && !editingStudent && (
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-indigo-950 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Icons.Users className="w-4 h-4 text-indigo-600" />
                  Registered Student(s) Found
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {matchedStudents.map((st) => {
                  const isSelected = studentSelectionMode === "existing" && selectedStudentDoc?.id === st.id;
                  const activeCourses = (st.enrollments || []).length;

                  return (
                    <div 
                      key={st.id} 
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                          : "bg-white text-slate-800 border-indigo-100 hover:border-indigo-300"
                      }`}
                    >
                      <div className="text-3xs">
                        <div className="font-bold text-xs">
                          {st.name} <span className="opacity-75 font-normal">(Sibling {st.siblingIndex || 1})</span>
                        </div>
                        <div className={isSelected ? "text-indigo-100" : "text-slate-500"}>
                          Enrolled in {activeCourses} {activeCourses === 1 ? "class" : "classes"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectExistingStudent(st)}
                        className={`px-3 py-1 text-3xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white text-indigo-700"
                            : "bg-indigo-100 hover:bg-indigo-200 text-indigo-800"
                        }`}
                      >
                        {isSelected ? "Selected" : `Add Course for ${st.name.split(" ")[0]}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSelectAddNewSibling}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  studentSelectionMode === "new_sibling"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-indigo-200"
                }`}
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>
                  {studentSelectionMode === "new_sibling"
                    ? `Registering as Sibling ${nextSiblingIndex}`
                    : "Register as a New Sibling"}
                </span>
              </button>
            </div>
          )}

          {/* DUPLICATE WARNING */}
          {duplicateConflict && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in font-medium">
              <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>This student is already enrolled in this exact Class & Subject.</span>
            </div>
          )}

          {/* Student Name */}
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Full Name</label>
            <input 
              type="text" required placeholder="Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          {/* Fees & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Fees (₹)</label>
              <input 
                type="number" required placeholder="1500"
                value={formData.monthlyFees}
                onChange={(e) => setFormData({ ...formData, monthlyFees: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Joining Date</label>
              <input 
                type="date" required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {editingStudent && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Course Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="enrolled">🟢 Enrolled</option>
                <option value="left">🚫 Left Class</option>
              </select>
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address</label>
            <input 
              type="text" placeholder="Street / Area details"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              disabled={duplicateConflict}
              className={`px-4 py-2 text-white text-xs rounded-xl font-semibold shadow-xs transition-all duration-150 ${
                duplicateConflict 
                  ? "bg-slate-300 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
              }`}
            >
              {editingStudent ? "Update Enrollment" : "Save Enrollment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
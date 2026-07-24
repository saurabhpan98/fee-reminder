// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  setDoc,
  getDoc,
  doc,
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  updateDoc
} from "firebase/firestore"; 
import { AuthProvider, useAuth } from "./AuthContext";

// Auth Error Code Parser
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "auth/invalid-credential":
      return "Incorrect email or password. Please check your credentials.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access temporarily blocked.";
    default:
      return "An error occurred during authentication.";
  }
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_DAY = new Date().getDate();

// Helper to evaluate if a month/year is before student joining date
const isBeforeJoiningDate = (joiningDateStr, targetYearStr, targetMonthName) => {
  if (!joiningDateStr) return false;
  
  const joiningDate = new Date(joiningDateStr);
  const targetMonthIndex = MONTHS.indexOf(targetMonthName);
  const targetYear = parseInt(targetYearStr, 10);

  const joiningYear = joiningDate.getFullYear();
  const joiningMonthIndex = joiningDate.getMonth();

  if (targetYear < joiningYear) return true;
  if (targetYear === joiningYear && targetMonthIndex < joiningMonthIndex) return true;

  return false;
};

function MainDashboard() {
  const { currentUser } = useAuth();

  // App Level Data State
  const [coachings, setCoachings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Selections / Filters
  const [selectedCoaching, setSelectedCoaching] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR.toString());

  // Form Inputs State (Structure)
  const [newCoachingName, setNewCoachingName] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  
  // Student Form Modal State (Add & Edit)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    phone: "",
    address: "",
    monthlyFees: "",
    joiningDate: new Date().toISOString().split("T")[0],
    coachingId: "",
    classId: "",
    subjectId: ""
  });

  // Fee Status Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null);
  const [feeFormData, setFeeFormData] = useState({
    status: "paid", // "paid" | "partial" | "unpaid"
    amountPaid: "",
    remark: ""
  });

  // UI Tabs
  const [activeTab, setActiveTab] = useState("students");

  // Sync Realtime Data
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const uid = currentUser.uid;

    const unsubCoachings = onSnapshot(collection(db, "users", uid, "coachings"), (snap) => {
      setCoachings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubClasses = onSnapshot(collection(db, "users", uid, "classes"), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSubjects = onSnapshot(collection(db, "users", uid, "subjects"), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubStudents = onSnapshot(collection(db, "users", uid, "students"), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubCoachings();
      unsubClasses();
      unsubSubjects();
      unsubStudents();
    };
  }, [currentUser]);

  // Structure Handlers
  const handleAddCoaching = async (e) => {
    e.preventDefault();
    if (!newCoachingName.trim()) return;
    await addDoc(collection(db, "users", currentUser.uid, "coachings"), {
      name: newCoachingName.trim(),
      createdAt: serverTimestamp()
    });
    setNewCoachingName("");
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedCoaching) return;
    await addDoc(collection(db, "users", currentUser.uid, "classes"), {
      name: newClassName.trim(),
      coachingId: selectedCoaching,
      createdAt: serverTimestamp()
    });
    setNewClassName("");
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !selectedClass) return;
    await addDoc(collection(db, "users", currentUser.uid, "subjects"), {
      name: newSubjectName.trim(),
      classId: selectedClass,
      createdAt: serverTimestamp()
    });
    setNewSubjectName("");
  };

  // Student Add & Edit Handler
  const openAddStudentModal = () => {
    setEditingStudentId(null);
    setStudentFormData({
      name: "",
      phone: "",
      address: "",
      monthlyFees: "",
      joiningDate: new Date().toISOString().split("T")[0],
      coachingId: selectedCoaching || "",
      classId: selectedClass || "",
      subjectId: selectedSubject || ""
    });
    setIsStudentModalOpen(true);
  };

  const openEditStudentModal = (student) => {
    setEditingStudentId(student.id);
    setStudentFormData({
      name: student.name || "",
      phone: student.phone || "",
      address: student.address || "",
      monthlyFees: student.monthlyFees || "",
      joiningDate: student.joiningDate || new Date().toISOString().split("T")[0],
      coachingId: student.coachingId || "",
      classId: student.classId || "",
      subjectId: student.subjectId || ""
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const { name, phone, address, monthlyFees, joiningDate, coachingId, classId, subjectId } = studentFormData;
    if (!name || !monthlyFees || !coachingId || !classId || !subjectId || !joiningDate) return;

    if (editingStudentId) {
      // Update existing student
      const studentRef = doc(db, "users", currentUser.uid, "students", editingStudentId);
      await updateDoc(studentRef, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        monthlyFees: Number(monthlyFees),
        joiningDate,
        coachingId,
        classId,
        subjectId
      });
    } else {
      // Add new student
      await addDoc(collection(db, "users", currentUser.uid, "students"), {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        monthlyFees: Number(monthlyFees),
        joiningDate,
        coachingId,
        classId,
        subjectId,
        feeStatus: {}, 
        createdAt: serverTimestamp()
      });
    }

    setIsStudentModalOpen(false);
  };

  // Fee Details Modal Handlers
  const openFeeModal = (student) => {
    const feeKey = `${selectedYear}-${selectedMonth}`;
    const currentFeeData = student.feeStatus?.[feeKey] || {};

    setSelectedStudentForFee(student);
    setFeeFormData({
      status: currentFeeData.status || "unpaid",
      amountPaid: currentFeeData.amountPaid !== undefined ? currentFeeData.amountPaid : "",
      remark: currentFeeData.remark || ""
    });
    setIsFeeModalOpen(true);
  };

  const handleSaveFeeStatus = async (e) => {
    e.preventDefault();
    if (!selectedStudentForFee) return;

    const feeKey = `${selectedYear}-${selectedMonth}`;
    const studentRef = doc(db, "users", currentUser.uid, "students", selectedStudentForFee.id);

    const updatedData = {
      status: feeFormData.status,
      amountPaid: feeFormData.status === "paid" 
        ? Number(selectedStudentForFee.monthlyFees) 
        : feeFormData.status === "unpaid" 
        ? 0 
        : Number(feeFormData.amountPaid || 0),
      remark: feeFormData.remark.trim()
    };

    await updateDoc(studentRef, {
      [`feeStatus.${feeKey}`]: updatedData
    });

    setIsFeeModalOpen(false);
  };

  // Delete Handlers
  const handleDeleteStudent = (id) => deleteDoc(doc(db, "users", currentUser.uid, "students", id));
  const handleDeleteCoaching = (id) => deleteDoc(doc(db, "users", currentUser.uid, "coachings", id));
  const handleDeleteClass = (id) => deleteDoc(doc(db, "users", currentUser.uid, "classes", id));
  const handleDeleteSubject = (id) => deleteDoc(doc(db, "users", currentUser.uid, "subjects", id));

  // Filtered Students Calculation
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedCoaching && s.coachingId !== selectedCoaching) return false;
      if (selectedClass && s.classId !== selectedClass) return false;
      if (selectedSubject && s.subjectId !== selectedSubject) return false;
      return true;
    });
  }, [students, selectedCoaching, selectedClass, selectedSubject]);

  // Unpaid/Partially Paid Reminders
  const dueReminders = useMemo(() => {
    const feeKey = `${selectedYear}-${selectedMonth}`;
    return students.filter(s => {
      if (isBeforeJoiningDate(s.joiningDate, selectedYear, selectedMonth)) return false;
      const feeData = s.feeStatus?.[feeKey];
      return !feeData || feeData.status !== "paid";
    });
  }, [students, selectedMonth, selectedYear]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white font-black p-2.5 rounded-xl shadow-md text-xl tracking-wider">
              🎓 FeeTrack
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {currentUser.displayName || "Teacher Dashboard"}
              </h1>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* 10th Date Alert Banner */}
        {CURRENT_DAY >= 10 && dueReminders.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Fee Reminder Alert (Past 10th of {selectedMonth})</h4>
                <p className="text-xs text-amber-700">
                  There are <strong>{dueReminders.length}</strong> active students with unpaid/partial fees for {selectedMonth} {selectedYear}.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("reminders")}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
            >
              View Unpaid List
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("students")}
            className={`pb-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "students" 
                ? "border-indigo-600 text-indigo-600 font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 Student Fee Register
          </button>
          <button
            onClick={() => setActiveTab("structure")}
            className={`pb-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "structure" 
                ? "border-indigo-600 text-indigo-600 font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🏫 Manage Batches & Subjects
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={`pb-3 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "reminders" 
                ? "border-indigo-600 text-indigo-600 font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🔔 Reminders List
            {dueReminders.length > 0 && (
              <span className="bg-red-500 text-white text-2xs font-bold px-2 py-0.5 rounded-full">
                {dueReminders.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: REGISTER */}
        {activeTab === "students" && (
          <div className="space-y-6">
            
            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Filters & Batch Selector
                </h3>
                <button
                  onClick={openAddStudentModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>+</span> Add New Student
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <select 
                  value={selectedCoaching}
                  onChange={(e) => { setSelectedCoaching(e.target.value); setSelectedClass(""); setSelectedSubject(""); }}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-700 font-medium"
                >
                  <option value="">All Coachings</option>
                  {coachings.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select 
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(""); }}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-700 font-medium"
                >
                  <option value="">All Class Levels</option>
                  {classes
                    .filter(cl => !selectedCoaching || cl.coachingId === selectedCoaching)
                    .map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>

                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-700 font-medium"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(sb => !selectedClass || sb.classId === selectedClass)
                    .map((sb) => <option key={sb.id} value={sb.id}>{sb.name}</option>)}
                </select>

                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg p-2.5 text-xs font-semibold"
                >
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>

                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg p-2.5 text-xs font-semibold"
                >
                  {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Register Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              {loading ? (
                <p className="p-8 text-center text-sm text-slate-400">Loading student records...</p>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400 text-sm">No students found for selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-3xs font-bold">
                      <tr>
                        <th className="py-3 px-4">Student Info</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-4">Monthly Fee</th>
                        <th className="py-3 px-4 text-center">{selectedMonth} {selectedYear} Status</th>
                        <th className="py-3 px-4">Remark</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s) => {
                        const feeKey = `${selectedYear}-${selectedMonth}`;
                        const feeData = s.feeStatus?.[feeKey] || {};
                        const notJoinedYet = isBeforeJoiningDate(s.joiningDate, selectedYear, selectedMonth);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{s.name}</div>
                              <div className="text-2xs text-slate-500">📞 {s.phone || "N/A"} | 📍 {s.address || "N/A"}</div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              {s.joiningDate || "N/A"}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              ₹{s.monthlyFees}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {notJoinedYet ? (
                                <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-semibold">
                                  ⚪ Not Joined Yet
                                </span>
                              ) : (
                                <button
                                  onClick={() => openFeeModal(s)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                    feeData.status === "paid"
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : feeData.status === "partial"
                                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  {feeData.status === "paid" && "✓ Paid"}
                                  {feeData.status === "partial" && `⚠️ Paid ₹${feeData.amountPaid} (Due ₹${s.monthlyFees - feeData.amountPaid})`}
                                  {(!feeData.status || feeData.status === "unpaid") && "✕ Unpaid"}
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 italic max-w-xs truncate">
                              {feeData.remark || "-"}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => openEditStudentModal(s)}
                                className="text-indigo-600 hover:text-indigo-900 text-xs font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id)}
                                className="text-slate-400 hover:text-red-600 text-xs font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STRUCTURE */}
        {activeTab === "structure" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">1. Tuition / Coaching Name</h3>
              <form onSubmit={handleAddCoaching} className="flex gap-2">
                <input 
                  type="text" placeholder="e.g. Apex Academy" value={newCoachingName}
                  onChange={(e) => setNewCoachingName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
                <button className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-lg font-medium">Add</button>
              </form>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {coachings.map(c => (
                  <li key={c.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs font-medium">
                    <span>{c.name}</span>
                    <button onClick={() => handleDeleteCoaching(c.id)} className="text-red-500 hover:underline">Delete</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">2. Class Level</h3>
              <select 
                value={selectedCoaching} onChange={(e) => setSelectedCoaching(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium"
              >
                <option value="">Select Coaching First</option>
                {coachings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <form onSubmit={handleAddClass} className="flex gap-2">
                <input 
                  type="text" placeholder="e.g. 11th, 12th" value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)} disabled={!selectedCoaching}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs disabled:opacity-50"
                />
                <button disabled={!selectedCoaching} className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50">Add</button>
              </form>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {classes.filter(cl => cl.coachingId === selectedCoaching).map(cl => (
                  <li key={cl.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs font-medium">
                    <span>{cl.name}</span>
                    <button onClick={() => handleDeleteClass(cl.id)} className="text-red-500 hover:underline">Delete</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">3. Subjects</h3>
              <select 
                value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium"
              >
                <option value="">Select Class Level First</option>
                {classes.filter(cl => !selectedCoaching || cl.coachingId === selectedCoaching).map(cl => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
              </select>
              <form onSubmit={handleAddSubject} className="flex gap-2">
                <input 
                  type="text" placeholder="e.g. Maths, Physics" value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)} disabled={!selectedClass}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs disabled:opacity-50"
                />
                <button disabled={!selectedClass} className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50">Add</button>
              </form>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {subjects.filter(sb => sb.classId === selectedClass).map(sb => (
                  <li key={sb.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs font-medium">
                    <span>{sb.name}</span>
                    <button onClick={() => handleDeleteSubject(sb.id)} className="text-red-500 hover:underline">Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: REMINDERS */}
        {activeTab === "reminders" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unpaid / Partial Fee Summary ({selectedMonth} {selectedYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated checklist of active students with pending fees.
                </p>
              </div>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                {dueReminders.length} Pending
              </span>
            </div>

            {dueReminders.length === 0 ? (
              <p className="text-sm text-emerald-600 font-medium py-8 text-center">
                🎉 All active students have cleared their fees for {selectedMonth} {selectedYear}!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {dueReminders.map((s) => {
                  const feeKey = `${selectedYear}-${selectedMonth}`;
                  const feeData = s.feeStatus?.[feeKey] || {};
                  const amountPaid = feeData.amountPaid || 0;
                  const remainingDue = s.monthlyFees - amountPaid;

                  return (
                    <div key={s.id} className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                        <div className="text-right">
                          <div className="text-xs font-bold text-red-600">Due: ₹{remainingDue}</div>
                          <div className="text-3xs text-slate-400">Total: ₹{s.monthlyFees}</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">📞 {s.phone || "No phone"}</p>
                      {feeData.remark && (
                        <p className="text-2xs text-amber-800 italic bg-amber-100/60 p-1.5 rounded">
                          Remark: {feeData.remark}
                        </p>
                      )}
                      <button
                        onClick={() => openFeeModal(s)}
                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Update Fee Status
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ADD / EDIT STUDENT MODAL */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {editingStudentId ? "Edit Student Details" : "Add New Student"}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Coaching</label>
                <select 
                  required
                  value={studentFormData.coachingId}
                  onChange={(e) => setStudentFormData({ ...studentFormData, coachingId: e.target.value, classId: "", subjectId: "" })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="">Select Coaching</option>
                  {coachings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Class Level</label>
                  <select 
                    required
                    value={studentFormData.classId}
                    onChange={(e) => setStudentFormData({ ...studentFormData, classId: e.target.value, subjectId: "" })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="">Select Class</option>
                    {classes.filter(cl => cl.coachingId === studentFormData.coachingId).map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Subject</label>
                  <select 
                    required
                    value={studentFormData.subjectId}
                    onChange={(e) => setStudentFormData({ ...studentFormData, subjectId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="">Select Subject</option>
                    {subjects.filter(sb => sb.classId === studentFormData.classId).map(sb => (
                      <option key={sb.id} value={sb.id}>{sb.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Student Full Name</label>
                <input 
                  type="text" required
                  placeholder="Rahul Sharma"
                  value={studentFormData.name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Phone</label>
                  <input 
                    type="text"
                    placeholder="+91 9876543210"
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Monthly Fees (₹)</label>
                  <input 
                    type="number" required
                    placeholder="1500"
                    value={studentFormData.monthlyFees}
                    onChange={(e) => setStudentFormData({ ...studentFormData, monthlyFees: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Joining Date</label>
                <input 
                  type="date" required
                  value={studentFormData.joiningDate}
                  onChange={(e) => setStudentFormData({ ...studentFormData, joiningDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Address</label>
                <input 
                  type="text"
                  placeholder="Street / Area details"
                  value={studentFormData.address}
                  onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsStudentModalOpen(false)} 
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg font-medium"
                >
                  {editingStudentId ? "Update Student" : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE FEE STATUS & REMARKS MODAL */}
      {isFeeModalOpen && selectedStudentForFee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">{selectedStudentForFee.name}</h3>
                <p className="text-2xs text-slate-500">Fee for {selectedMonth} {selectedYear} (Total: ₹{selectedStudentForFee.monthlyFees})</p>
              </div>
              <button onClick={() => setIsFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveFeeStatus} className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Payment Status</label>
                <select 
                  value={feeFormData.status}
                  onChange={(e) => setFeeFormData({ ...feeFormData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium"
                >
                  <option value="paid">✓ Fully Paid (₹{selectedStudentForFee.monthlyFees})</option>
                  <option value="partial">⚠️ Partial Payment</option>
                  <option value="unpaid">✕ Unpaid (₹0)</option>
                </select>
              </div>

              {feeFormData.status === "partial" && (
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">
                    Amount Paid Today (₹)
                  </label>
                  <input 
                    type="number" required max={selectedStudentForFee.monthlyFees} min="0"
                    placeholder="Enter partial amount"
                    value={feeFormData.amountPaid}
                    onChange={(e) => setFeeFormData({ ...feeFormData, amountPaid: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                  {feeFormData.amountPaid !== "" && (
                    <p className="text-2xs text-amber-600 font-semibold mt-1">
                      Remaining Due: ₹{selectedStudentForFee.monthlyFees - Number(feeFormData.amountPaid || 0)}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-2xs font-semibold text-slate-600 uppercase mb-1">Remark / Note</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Paid cash, promised remaining balance next Monday"
                  value={feeFormData.remark}
                  onChange={(e) => setFeeFormData({ ...feeFormData, remark: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsFeeModalOpen(false)} 
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg font-medium"
                >
                  Save Fee Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Teacher Authentication Component
function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError("");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (isSignUp && !name.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !password) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        try {
          await updateProfile(user, { displayName: name.trim() });
          await setDoc(doc(db, "users", user.uid), {
            displayName: name.trim(),
            email: user.email,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          await user.delete();
          throw err;
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          setAuthError("Teacher profile record not found. Please sign up.");
          return;
        }
      }
    } catch (err) {
      setAuthError(err.code ? getAuthErrorMessage(err.code) : err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="inline-block bg-indigo-600 text-white font-black p-3 rounded-2xl shadow-md text-2xl mb-3">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isSignUp ? "Teacher Registration" : "Teacher Login"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSignUp ? "Create your account to manage tuition fees" : "Sign in to your fee tracker dashboard"}
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-2">
            <span>⚠️</span>
            <div>{authError}</div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-2xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Sharma"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
          )}

          <div>
            <label className="block text-2xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-sm transition-all cursor-pointer text-sm"
          >
            {isSignUp ? "Register Account" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? "Already registered? " : "New teacher? "}
          <button 
            onClick={toggleMode} 
            className="text-indigo-600 font-semibold hover:underline cursor-pointer"
          >
            {isSignUp ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { currentUser } = useAuth();
  return currentUser ? <MainDashboard /> : <AuthScreen />;
}
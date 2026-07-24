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

// --- SVG Icons Component Library ---
const Icons = {
  GraduationCap: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  Users: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Building: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Bell: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Plus: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" />
    </svg>
  ),
  Check: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  ),
  AlertTriangle: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Trash: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  LogOut: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  X: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Phone: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  MapPin: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Search: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Eye: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.016 10.016 0 012.122-.063c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-6.837-1.353a3 3 0 11-4.243-4.243M3 3l18 18" />
    </svg>
  )
};

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

  // App State
  const [coachings, setCoachings] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selections & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoaching, setSelectedCoaching] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR.toString());

  // Form Inputs (Structure Creation)
  const [newCoachingName, setNewCoachingName] = useState("");
  const [newCoachingOwner, setNewCoachingOwner] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectTeacher, setNewSubjectTeacher] = useState("");
  
  // Structure Edit Modal State
  const [structureToEdit, setStructureToEdit] = useState(null); // { id, type: 'coaching'|'class'|'subject', name, owner?, teacher? }

  // Student Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    phone: "",
    address: "",
    monthlyFees: "",
    joiningDate: new Date().toISOString().split("T")[0],
    status: "enrolled",
    coachingId: "",
    classId: "",
    subjectId: ""
  });

  // Profile Modal State
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState(null);

  // Deletion Confirmation Modal States
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [structureToDelete, setStructureToDelete] = useState(null); // { id, type: 'coaching'|'class'|'subject', name }

  // Fee Status Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null);
  const [feeFormData, setFeeFormData] = useState({
    status: "paid",
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

  // Structure Creation Handlers
  const handleAddCoaching = async (e) => {
    e.preventDefault();
    if (!newCoachingName.trim()) return;
    await addDoc(collection(db, "users", currentUser.uid, "coachings"), {
      name: newCoachingName.trim(),
      owner: newCoachingOwner.trim(),
      createdAt: serverTimestamp()
    });
    setNewCoachingName("");
    setNewCoachingOwner("");
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
      teacher: newSubjectTeacher.trim(),
      classId: selectedClass,
      createdAt: serverTimestamp()
    });
    setNewSubjectName("");
    setNewSubjectTeacher("");
  };

  // Structure Edit Handler
  const handleUpdateStructure = async (e) => {
    e.preventDefault();
    if (!structureToEdit || !structureToEdit.name.trim()) return;

    const uid = currentUser.uid;
    const { id, type, name, owner, teacher } = structureToEdit;

    if (type === "coaching") {
      await updateDoc(doc(db, "users", uid, "coachings", id), {
        name: name.trim(),
        owner: (owner || "").trim()
      });
    } else if (type === "class") {
      await updateDoc(doc(db, "users", uid, "classes", id), {
        name: name.trim()
      });
    } else if (type === "subject") {
      await updateDoc(doc(db, "users", uid, "subjects", id), {
        name: name.trim(),
        teacher: (teacher || "").trim()
      });
    }

    setStructureToEdit(null);
  };

  // Student Handlers
  const openAddStudentModal = () => {
    setEditingStudentId(null);
    setStudentFormData({
      name: "",
      phone: "",
      address: "",
      monthlyFees: "",
      joiningDate: new Date().toISOString().split("T")[0],
      status: "enrolled",
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
      status: student.status || "enrolled",
      coachingId: student.coachingId || "",
      classId: student.classId || "",
      subjectId: student.subjectId || ""
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const { name, phone, address, monthlyFees, joiningDate, status, coachingId, classId, subjectId } = studentFormData;
    if (!name || !monthlyFees || !coachingId || !classId || !subjectId || !joiningDate) return;

    if (editingStudentId) {
      const studentRef = doc(db, "users", currentUser.uid, "students", editingStudentId);
      await updateDoc(studentRef, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        monthlyFees: Number(monthlyFees),
        joiningDate,
        status,
        coachingId,
        classId,
        subjectId
      });
    } else {
      await addDoc(collection(db, "users", currentUser.uid, "students"), {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        monthlyFees: Number(monthlyFees),
        joiningDate,
        status: "enrolled",
        coachingId,
        classId,
        subjectId,
        feeStatus: {}, 
        createdAt: serverTimestamp()
      });
    }

    setIsStudentModalOpen(false);
  };

  const handleToggleEnrollmentStatus = async (studentId, currentStatus) => {
    const newStatus = currentStatus === "left" ? "enrolled" : "left";
    const studentRef = doc(db, "users", currentUser.uid, "students", studentId);
    await updateDoc(studentRef, { status: newStatus });

    if (selectedStudentForProfile && selectedStudentForProfile.id === studentId) {
      setSelectedStudentForProfile(prev => ({ ...prev, status: newStatus }));
    }
  };

  // Confirmed Delete Handler (Students)
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "students", studentToDelete.id));
    
    if (selectedStudentForProfile?.id === studentToDelete.id) {
      setSelectedStudentForProfile(null);
    }
    setStudentToDelete(null);
  };

  // Confirmed Delete Handler (Structure: Coaching, Class, Subject)
  const confirmDeleteStructure = async () => {
    if (!structureToDelete) return;
    const { id, type } = structureToDelete;
    let collectionName = "coachings";
    if (type === "class") collectionName = "classes";
    if (type === "subject") collectionName = "subjects";

    await deleteDoc(doc(db, "users", currentUser.uid, collectionName, id));
    setStructureToDelete(null);
  };

  // Fee Status Handlers
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

  // Filter & Search Calculations
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (searchQuery.trim() && !s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      if (selectedCoaching && s.coachingId !== selectedCoaching) return false;
      if (selectedClass && s.classId !== selectedClass) return false;
      if (selectedSubject && s.subjectId !== selectedSubject) return false;
      return true;
    });
  }, [students, searchQuery, selectedCoaching, selectedClass, selectedSubject]);

  // Due Reminders calculation
  const dueReminders = useMemo(() => {
    const feeKey = `${selectedYear}-${selectedMonth}`;
    return students.filter(s => {
      if (isBeforeJoiningDate(s.joiningDate, selectedYear, selectedMonth)) return false;
      const feeData = s.feeStatus?.[feeKey];
      return !feeData || feeData.status !== "paid";
    });
  }, [students, selectedMonth, selectedYear]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 pb-16 antialiased">
      {/* Dynamic Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Header Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-2.5 rounded-2xl shadow-md shadow-indigo-500/20 transform transition-transform hover:rotate-6">
              <Icons.GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight">
                {currentUser.displayName || "Teacher Workspace"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">{currentUser.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="group flex items-center gap-2 bg-slate-100/80 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200/80 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Icons.LogOut className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* Reminder Alert Banner */}
        {CURRENT_DAY >= 10 && dueReminders.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm shadow-amber-100/50 animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl animate-bounce">
                <Icons.AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-sm">Fee Collection Alert (Past 10th of {selectedMonth})</h4>
                <p className="text-xs text-amber-800/90 font-medium mt-0.5">
                  You have <strong className="font-bold underline">{dueReminders.length}</strong> student(s) with pending payments for {selectedMonth} {selectedYear}.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("reminders")}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 cursor-pointer text-center"
            >
              Review Unpaid List
            </button>
          </div>
        )}

        {/* Tab Navigation Menu */}
        <div className="flex p-1 bg-slate-200/60 rounded-2xl w-full sm:w-fit space-x-1 border border-slate-200/60">
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "students" 
                ? "bg-white text-indigo-600 shadow-sm shadow-slate-200" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icons.Users className="w-4 h-4" />
            <span>Student Register</span>
          </button>
          <button
            onClick={() => setActiveTab("structure")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "structure" 
                ? "bg-white text-indigo-600 shadow-sm shadow-slate-200" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icons.Building className="w-4 h-4" />
            <span>Batches & Subjects</span>
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "reminders" 
                ? "bg-white text-indigo-600 shadow-sm shadow-slate-200" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icons.Bell className="w-4 h-4" />
            <span>Reminders</span>
            {dueReminders.length > 0 && (
              <span className="bg-rose-500 text-white text-3xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {dueReminders.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: REGISTER */}
        {activeTab === "students" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Search & Filter Toolbar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Icons.Search />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student by name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={openAddStudentModal}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Icons.Plus className="w-4 h-4" />
                  <span>Add New Student</span>
                </button>
              </div>

              {/* Batch Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <select 
                  value={selectedCoaching}
                  onChange={(e) => { setSelectedCoaching(e.target.value); setSelectedClass(""); setSelectedSubject(""); }}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  <option value="">All Coachings</option>
                  {coachings.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select 
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(""); }}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  <option value="">All Class Levels</option>
                  {classes
                    .filter(cl => !selectedCoaching || cl.coachingId === selectedCoaching)
                    .map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>

                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(sb => !selectedClass || sb.classId === selectedClass)
                    .map((sb) => <option key={sb.id} value={sb.id}>{sb.name}</option>)}
                </select>

                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 rounded-xl p-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>

                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 rounded-xl p-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Register Table */}
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden transition-all duration-300">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-medium">Loading student records...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <div className="p-3 bg-slate-100 rounded-2xl w-fit mx-auto text-slate-400">
                    <Icons.Users className="w-6 h-6" />
                  </div>
                  <p className="text-slate-600 font-medium text-sm">No students match your search or filters.</p>
                  <p className="text-xs text-slate-400">Try clearing your search query or filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-3xs font-bold">
                      <tr>
                        <th className="py-3.5 px-5">Student Details</th>
                        <th className="py-3.5 px-5">Enrollment</th>
                        <th className="py-3.5 px-5">Monthly Fee</th>
                        <th className="py-3.5 px-5 text-center">{selectedMonth} {selectedYear} Status</th>
                        <th className="py-3.5 px-5">Remark</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s) => {
                        const feeKey = `${selectedYear}-${selectedMonth}`;
                        const feeData = s.feeStatus?.[feeKey] || {};
                        const notJoinedYet = isBeforeJoiningDate(s.joiningDate, selectedYear, selectedMonth);
                        const isLeft = s.status === "left";
                        
                        const amountPaid = feeData.amountPaid || 0;
                        const remainingDue = s.monthlyFees - amountPaid;
                        const isPaidInFull = feeData.status === "paid";

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                            <td className="py-4 px-5">
                              <button
                                onClick={() => setSelectedStudentForProfile(s)}
                                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-left cursor-pointer transition-colors"
                              >
                                {s.name}
                              </button>
                              <div className="flex items-center gap-3 text-2xs text-slate-400 mt-0.5">
                                <span className="flex items-center gap-1"><Icons.Phone />{s.phone || "N/A"}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-bold ${
                                isLeft ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isLeft ? "bg-slate-400" : "bg-emerald-500"}`}></span>
                                {isLeft ? "Left Class" : "Enrolled"}
                              </span>
                            </td>
                            <td className="py-4 px-5 font-semibold text-slate-800">
                              ₹{s.monthlyFees}
                            </td>
                            <td className="py-4 px-5 text-center">
                              {isLeft ? (
                                isPaidInFull ? (
                                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                                    Left Class (Paid)
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openFeeModal(s)}
                                    className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 active:scale-95"
                                  >
                                    🚫 Left Class (Due: ₹{remainingDue})
                                  </button>
                                )
                              ) : notJoinedYet ? (
                                <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-semibold">
                                  ⚪ Not Joined Yet
                                </span>
                              ) : (
                                <button
                                  onClick={() => openFeeModal(s)}
                                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 ${
                                    feeData.status === "paid"
                                      ? "bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200/80 border border-emerald-300/50"
                                      : feeData.status === "partial"
                                      ? "bg-amber-100/80 text-amber-800 hover:bg-amber-200/80 border border-amber-300/50"
                                      : "bg-rose-100/80 text-rose-700 hover:bg-rose-200/80 border border-rose-300/50"
                                  }`}
                                >
                                  {feeData.status === "paid" && <><Icons.Check className="w-3.5 h-3.5" /> Paid</>}
                                  {feeData.status === "partial" && `⚠️ Paid ₹${feeData.amountPaid} (Due ₹${s.monthlyFees - feeData.amountPaid})`}
                                  {(!feeData.status || feeData.status === "unpaid") && "✕ Unpaid"}
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-5 text-xs text-slate-500 italic max-w-xs truncate">
                              {feeData.remark || "-"}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditStudentModal(s)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150 cursor-pointer"
                                  title="Edit Student"
                                >
                                  <Icons.Edit />
                                </button>
                                <button
                                  onClick={() => setStudentToDelete(s)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-150 cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Icons.Trash />
                                </button>
                              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            
            {/* 1. Coaching Section */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Icons.Building className="w-4 h-4 text-indigo-600" />
                <span>1. Tuition / Coaching</span>
              </h3>
              <form onSubmit={handleAddCoaching} className="space-y-2">
                <input 
                  type="text" required placeholder="Coaching Name (e.g. Apex Academy)" value={newCoachingName}
                  onChange={(e) => setNewCoachingName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
                <input 
                  type="text" placeholder="Owner Name (e.g. Dr. R.K. Gupta)" value={newCoachingOwner}
                  onChange={(e) => setNewCoachingOwner(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs py-2 rounded-xl font-medium cursor-pointer transition-all duration-200">
                  Add Coaching
                </button>
              </form>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {coachings.map(c => (
                  <li key={c.id} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl text-xs border border-slate-100 hover:border-slate-200 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-800">{c.name}</div>
                      {c.owner && <div className="text-3xs text-slate-400 font-medium">Owner: {c.owner}</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setStructureToEdit({ id: c.id, type: "coaching", name: c.name, owner: c.owner || "" })} 
                        className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                        title="Edit Coaching"
                      >
                        <Icons.Edit />
                      </button>
                      <button 
                        onClick={() => setStructureToDelete({ id: c.id, type: "coaching", name: c.name })} 
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Delete Coaching"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Class Level Section */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Icons.Users className="w-4 h-4 text-indigo-600" />
                <span>2. Class Level</span>
              </h3>
              <select 
                value={selectedCoaching} onChange={(e) => setSelectedCoaching(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="">Select Coaching First</option>
                {coachings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <form onSubmit={handleAddClass} className="flex gap-2">
                <input 
                  type="text" placeholder="e.g. 11th, 12th" value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)} disabled={!selectedCoaching}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs disabled:opacity-50 transition-all duration-200"
                />
                <button disabled={!selectedCoaching} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs px-3.5 py-2.5 rounded-xl font-medium disabled:opacity-50 cursor-pointer transition-all duration-200">Add</button>
              </form>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {classes.filter(cl => cl.coachingId === selectedCoaching).map(cl => (
                  <li key={cl.id} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl text-xs font-semibold text-slate-700 border border-slate-100 hover:border-slate-200 transition-colors">
                    <span>{cl.name}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setStructureToEdit({ id: cl.id, type: "class", name: cl.name })} 
                        className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                        title="Edit Class"
                      >
                        <Icons.Edit />
                      </button>
                      <button 
                        onClick={() => setStructureToDelete({ id: cl.id, type: "class", name: cl.name })} 
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Delete Class"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Subjects Section */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Icons.GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>3. Subjects</span>
              </h3>
              <select 
                value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <option value="">Select Class Level First</option>
                {classes.filter(cl => !selectedCoaching || cl.coachingId === selectedCoaching).map(cl => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
              </select>
              <form onSubmit={handleAddSubject} className="space-y-2">
                <input 
                  type="text" required placeholder="Subject Name (e.g. Physics)" value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)} disabled={!selectedClass}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs disabled:opacity-50 transition-all duration-200"
                />
                <input 
                  type="text" placeholder="Teacher Name (e.g. Prof. Verma)" value={newSubjectTeacher}
                  onChange={(e) => setNewSubjectTeacher(e.target.value)} disabled={!selectedClass}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs disabled:opacity-50 transition-all duration-200"
                />
                <button disabled={!selectedClass} className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs py-2 rounded-xl font-medium disabled:opacity-50 cursor-pointer transition-all duration-200">
                  Add Subject
                </button>
              </form>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {subjects.filter(sb => sb.classId === selectedClass).map(sb => (
                  <li key={sb.id} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl text-xs border border-slate-100 hover:border-slate-200 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-800">{sb.name}</div>
                      {sb.teacher && <div className="text-3xs text-slate-400 font-medium">Teacher: {sb.teacher}</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setStructureToEdit({ id: sb.id, type: "subject", name: sb.name, teacher: sb.teacher || "" })} 
                        className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                        title="Edit Subject"
                      >
                        <Icons.Edit />
                      </button>
                      <button 
                        onClick={() => setStructureToDelete({ id: sb.id, type: "subject", name: sb.name })} 
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Delete Subject"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

        {/* TAB 3: REMINDERS */}
        {activeTab === "reminders" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Unpaid / Partial Fee Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated checklist of students with pending fees.
                </p>
              </div>

              {/* Month & Year Selectors */}
              <div className="flex items-center gap-2">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 rounded-xl p-2 text-xs font-semibold focus:outline-none transition-all duration-200"
                >
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>

                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 rounded-xl p-2 text-xs font-semibold focus:outline-none transition-all duration-200"
                >
                  {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full ml-1">
                  {dueReminders.length} Pending
                </span>
              </div>
            </div>

            {dueReminders.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mx-auto">
                  <Icons.Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400">All students have cleared their fees for {selectedMonth} {selectedYear}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueReminders.map((s) => {
                  const feeKey = `${selectedYear}-${selectedMonth}`;
                  const feeData = s.feeStatus?.[feeKey] || {};
                  const amountPaid = feeData.amountPaid || 0;
                  const remainingDue = s.monthlyFees - amountPaid;
                  const isLeft = s.status === "left";

                  return (
                    <div 
                      key={s.id} 
                      className={`p-5 border rounded-2xl shadow-2xs flex flex-col justify-between h-full space-y-4 transition-all duration-200 hover:scale-[1.01] ${
                        isLeft 
                          ? "border-rose-200/80 bg-gradient-to-b from-rose-50/40 to-slate-50/20" 
                          : "border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-orange-50/20"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <button 
                              onClick={() => setSelectedStudentForProfile(s)}
                              className="font-bold text-slate-900 text-sm hover:text-indigo-600 hover:underline cursor-pointer text-left block transition-colors"
                            >
                              {s.name}
                            </button>
                            {isLeft && (
                              <span className="inline-block mt-1 text-3xs font-bold text-rose-600 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-full">
                                🚫 Left Class
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-extrabold text-rose-600">Due: ₹{remainingDue}</div>
                            <div className="text-3xs text-slate-400 font-medium">Total: ₹{s.monthlyFees}</div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Icons.Phone /> {s.phone || "No phone"}
                        </p>

                        {feeData.remark && (
                          <p className="text-2xs text-amber-900 italic bg-amber-100/60 p-2 rounded-xl border border-amber-200/50">
                            Remark: {feeData.remark}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => openFeeModal(s)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold py-2 rounded-xl shadow-xs transition-all duration-200 cursor-pointer mt-auto"
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

      {/* EDIT STRUCTURE MODAL (COACHING, CLASS, SUBJECT) */}
      {structureToEdit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 capitalize">
                Edit {structureToEdit.type}
              </h3>
              <button onClick={() => setStructureToEdit(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                <Icons.X />
              </button>
            </div>

            <form onSubmit={handleUpdateStructure} className="space-y-3">
              <div>
                <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {structureToEdit.type} Name
                </label>
                <input 
                  type="text" required
                  value={structureToEdit.name}
                  onChange={(e) => setStructureToEdit({ ...structureToEdit, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>

              {structureToEdit.type === "coaching" && (
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Owner Name
                  </label>
                  <input 
                    type="text"
                    value={structureToEdit.owner || ""}
                    onChange={(e) => setStructureToEdit({ ...structureToEdit, owner: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                </div>
              )}

              {structureToEdit.type === "subject" && (
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Teacher Name
                  </label>
                  <input 
                    type="text"
                    value={structureToEdit.teacher || ""}
                    onChange={(e) => setStructureToEdit({ ...structureToEdit, teacher: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setStructureToEdit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl font-semibold cursor-pointer transition-colors duration-150"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs rounded-xl font-semibold shadow-xs cursor-pointer transition-all duration-150"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE MODAL WITH EDIT OPTION */}
      {selectedStudentForProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedStudentForProfile.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-3xs font-bold ${
                    selectedStudentForProfile.status === "left" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {selectedStudentForProfile.status === "left" ? "Left Class" : "Enrolled"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Joined: {selectedStudentForProfile.joiningDate || "N/A"}</p>
              </div>
              <button onClick={() => setSelectedStudentForProfile(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"><Icons.X /></button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5"><Icons.Phone /> {selectedStudentForProfile.phone || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Monthly Fee</span>
                <span className="font-semibold text-slate-800">₹{selectedStudentForProfile.monthlyFees}</span>
              </div>
              <div className="col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</span>
                <span className="font-medium text-slate-700 flex items-center gap-1.5"><Icons.MapPin /> {selectedStudentForProfile.address || "N/A"}</span>
              </div>
            </div>

            {/* Payment History Summary */}
            <div>
              <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Record ({selectedYear})</h4>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {MONTHS.map((m) => {
                  const feeKey = `${selectedYear}-${m}`;
                  const feeData = selectedStudentForProfile.feeStatus?.[feeKey] || {};
                  const isBefore = isBeforeJoiningDate(selectedStudentForProfile.joiningDate, selectedYear, m);

                  return (
                    <div key={m} className="p-2.5 border border-slate-200/80 rounded-xl bg-slate-50/50 text-2xs">
                      <div className="font-bold text-slate-700">{m}</div>
                      <div className="mt-1 font-semibold">
                        {isBefore ? (
                          <span className="text-slate-400">Not Joined</span>
                        ) : feeData.status === "paid" ? (
                          <span className="text-emerald-600">✓ Paid</span>
                        ) : feeData.status === "partial" ? (
                          <span className="text-amber-600">₹{feeData.amountPaid} Paid</span>
                        ) : (
                          <span className="text-rose-500">✕ Unpaid</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-2 flex flex-wrap justify-between items-center gap-2 border-t border-slate-100">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const studentToEdit = selectedStudentForProfile;
                    setSelectedStudentForProfile(null);
                    openEditStudentModal(studentToEdit);
                  }}
                  className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <Icons.Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button 
                  onClick={() => setStudentToDelete(selectedStudentForProfile)}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <Icons.Trash className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button 
                onClick={() => handleToggleEnrollmentStatus(selectedStudentForProfile.id, selectedStudentForProfile.status)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                  selectedStudentForProfile.status === "left"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {selectedStudentForProfile.status === "left" ? "Re-enroll" : "Mark as Left"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETION MODAL (STUDENT) */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Icons.AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Delete Student Record?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{studentToDelete.name}"</strong>? All associated payment history for this student will be lost.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button 
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors duration-150"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteStudent}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-all duration-150 active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETION MODAL (STRUCTURE: COACHING, CLASS, SUBJECT) */}
      {structureToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Icons.AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base capitalize">
                Delete {structureToDelete.type}?
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{structureToDelete.name}"</strong>?
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button 
                onClick={() => setStructureToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors duration-150"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteStructure}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-all duration-150 active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {editingStudentId ? "Edit Student Details" : "Add New Student"}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"><Icons.X /></button>
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
                  type="text" required
                  placeholder="Rahul Sharma"
                  value={studentFormData.name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                  <input 
                    type="text"
                    placeholder="+91 9876543210"
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Fees (₹)</label>
                  <input 
                    type="number" required
                    placeholder="1500"
                    value={studentFormData.monthlyFees}
                    onChange={(e) => setStudentFormData({ ...studentFormData, monthlyFees: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Joining Date</label>
                  <input 
                    type="date" required
                    value={studentFormData.joiningDate}
                    onChange={(e) => setStudentFormData({ ...studentFormData, joiningDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
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
              </div>

              <div>
                <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address</label>
                <input 
                  type="text"
                  placeholder="Street / Area details"
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
      )}

      {/* UPDATE FEE STATUS & REMARKS MODAL */}
      {isFeeModalOpen && selectedStudentForFee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">{selectedStudentForFee.name}</h3>
                <p className="text-3xs text-slate-400 font-medium">Fee for {selectedMonth} {selectedYear} (Total: ₹{selectedStudentForFee.monthlyFees})</p>
              </div>
              <button onClick={() => setIsFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"><Icons.X /></button>
            </div>

            <form onSubmit={handleSaveFeeStatus} className="space-y-3">
              <div>
                <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Status</label>
                <select 
                  value={feeFormData.status}
                  onChange={(e) => setFeeFormData({ ...feeFormData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  <option value="paid">✓ Fully Paid (₹{selectedStudentForFee.monthlyFees})</option>
                  <option value="partial">⚠️ Partial Payment</option>
                  <option value="unpaid">✕ Unpaid (₹0)</option>
                </select>
              </div>

              {feeFormData.status === "partial" && (
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Amount Paid Today (₹)
                  </label>
                  <input 
                    type="number" required max={selectedStudentForFee.monthlyFees} min="0"
                    placeholder="Enter partial amount"
                    value={feeFormData.amountPaid}
                    onChange={(e) => setFeeFormData({ ...feeFormData, amountPaid: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                  {feeFormData.amountPaid !== "" && (
                    <p className="text-3xs text-amber-600 font-bold mt-1">
                      Remaining Due: ₹{selectedStudentForFee.monthlyFees - Number(feeFormData.amountPaid || 0)}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remark / Note</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Paid cash, promised remaining balance next Monday"
                  value={feeFormData.remark}
                  onChange={(e) => setFeeFormData({ ...feeFormData, remark: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsFeeModalOpen(false)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl font-semibold cursor-pointer transition-colors duration-150"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs rounded-xl font-semibold shadow-xs cursor-pointer transition-all duration-150"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Teacher Auth Screen
function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError("");
    setShowPassword(false);
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
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 animate-scale-up">
        <div className="text-center">
          <div className="inline-flex bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-3.5 rounded-2xl shadow-md shadow-indigo-500/20 mb-3 transform transition-transform hover:rotate-6">
            <Icons.GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isSignUp ? "Teacher Portal" : "Welcome Back"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isSignUp ? "Create an account to manage tuition fees & batches" : "Sign in to access your tuition fee register"}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs rounded-2xl flex items-center gap-2 animate-fade-in">
            <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <div>{authError}</div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          )}

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl shadow-sm shadow-indigo-500/20 transition-all duration-200 cursor-pointer text-sm"
          >
            {isSignUp ? "Register Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 font-medium">
          {isSignUp ? "Already registered? " : "New teacher? "}
          <button 
            onClick={toggleMode} 
            className="text-indigo-600 font-bold hover:underline cursor-pointer"
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
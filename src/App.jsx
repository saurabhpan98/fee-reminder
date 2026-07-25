// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import { collection, addDoc, doc, onSnapshot, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore"; 
import { AuthProvider, useAuth } from "./AuthContext";

import { MONTHS, CURRENT_YEAR, CURRENT_DAY, isBeforeJoiningDate } from "./utils/helpers";
import { Icons } from "./components/Icons";
import { Header } from "./components/Header";
import { AuthScreen } from "./components/AuthScreen";
import { StudentRegisterTab } from "./components/StudentRegisterTab";
import { StructureTab } from "./components/StructureTab";
import { RemindersTab } from "./components/RemindersTab";

import { StudentModal } from "./components/modals/StudentModal";
import { StudentProfileModal } from "./components/modals/StudentProfileModal";
import { EnrolledSubjectsModal } from "./components/modals/EnrolledSubjectsModal";
import { FeeModal } from "./components/modals/FeeModal";
import { StructureEditModal } from "./components/modals/StructureEditModal";
import { ConfirmDeleteModal } from "./components/modals/ConfirmDeleteModal";
import { ConfirmDeleteStructureModal } from "./components/modals/ConfirmDeleteStructureModal";

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
  const [structureToEdit, setStructureToEdit] = useState(null);

  // Student Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    name: "", phone: "", address: "", monthlyFees: "",
    joiningDate: new Date().toISOString().split("T")[0],
    status: "enrolled", coachingId: "", classId: "", subjectId: ""
  });

  // Profile Modal & Enrolled Subjects Modal State
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState(null);
  const [selectedStudentForEnrollmentView, setSelectedStudentForEnrollmentView] = useState(null);

  // Deletion Confirmation Modal States
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [structureToDelete, setStructureToDelete] = useState(null);

  // Fee Status Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null);
  const [feeFormData, setFeeFormData] = useState({ status: "paid", amountPaid: "", remark: "" });

  // UI Tabs
  const [activeTab, setActiveTab] = useState("students");

  // Sync Realtime Firestore Data
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
      await updateDoc(doc(db, "users", uid, "coachings", id), { name: name.trim(), owner: (owner || "").trim() });
    } else if (type === "class") {
      await updateDoc(doc(db, "users", uid, "classes", id), { name: name.trim() });
    } else if (type === "subject") {
      await updateDoc(doc(db, "users", uid, "subjects", id), { name: name.trim(), teacher: (teacher || "").trim() });
    }

    setStructureToEdit(null);
  };

  // Student Form Handlers
  const openAddStudentModal = () => {
    setEditingStudentId(null);
    setStudentFormData({
      name: "", phone: "", address: "", monthlyFees: "",
      joiningDate: new Date().toISOString().split("T")[0],
      status: "enrolled", coachingId: selectedCoaching || "", classId: selectedClass || "", subjectId: selectedSubject || ""
    });
    setIsStudentModalOpen(true);
  };

  const openEditStudentModal = (student) => {
    setEditingStudentId(student.id);
    setStudentFormData({
      name: student.name || "", phone: student.phone || "", address: student.address || "",
      monthlyFees: student.monthlyFees || "", joiningDate: student.joiningDate || new Date().toISOString().split("T")[0],
      status: student.status || "enrolled", coachingId: student.coachingId || "", classId: student.classId || "", subjectId: student.subjectId || ""
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
        name: name.trim(), phone: phone.trim(), address: address.trim(), monthlyFees: Number(monthlyFees),
        joiningDate, status, coachingId, classId, subjectId
      });
    } else {
      await addDoc(collection(db, "users", currentUser.uid, "students"), {
        name: name.trim(), phone: phone.trim(), address: address.trim(), monthlyFees: Number(monthlyFees),
        joiningDate, status: "enrolled", coachingId, classId, subjectId, feeStatus: {}, createdAt: serverTimestamp()
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

  // Confirmed Delete Handlers
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "students", studentToDelete.id));
    
    if (selectedStudentForProfile?.id === studentToDelete.id) {
      setSelectedStudentForProfile(null);
    }
    setStudentToDelete(null);
  };

  const confirmDeleteStructure = async () => {
    if (!structureToDelete) return;
    const { id, type } = structureToDelete;
    let collectionName = "coachings";
    if (type === "class") collectionName = "classes";
    if (type === "subject") collectionName = "subjects";

    await deleteDoc(doc(db, "users", currentUser.uid, collectionName, id));
    setStructureToDelete(null);
  };

  // Fee Status Modal Handlers
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

  // Calculations
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

      <Header currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* Alert Banner */}
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

        {/* Navigation Menu */}
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

        {/* Tab Screens */}
        {activeTab === "students" && (
          <StudentRegisterTab
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            openAddStudentModal={openAddStudentModal}
            selectedCoaching={selectedCoaching} setSelectedCoaching={setSelectedCoaching} coachings={coachings}
            selectedClass={selectedClass} setSelectedClass={setSelectedClass} classes={classes}
            selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} subjects={subjects}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear} setSelectedYear={setSelectedYear}
            loading={loading} filteredStudents={filteredStudents}
            setSelectedStudentForProfile={setSelectedStudentForProfile}
            openFeeModal={openFeeModal}
            setSelectedStudentForEnrollmentView={setSelectedStudentForEnrollmentView}
          />
        )}

        {activeTab === "structure" && (
          <StructureTab
            handleAddCoaching={handleAddCoaching} newCoachingName={newCoachingName} setNewCoachingName={setNewCoachingName} newCoachingOwner={newCoachingOwner} setNewCoachingOwner={setNewCoachingOwner} coachings={coachings}
            handleAddClass={handleAddClass} newClassName={newClassName} setNewClassName={setNewClassName} selectedCoaching={selectedCoaching} setSelectedCoaching={setSelectedCoaching} classes={classes}
            handleAddSubject={handleAddSubject} newSubjectName={newSubjectName} setNewSubjectName={setNewSubjectName} newSubjectTeacher={newSubjectTeacher} setNewSubjectTeacher={setNewSubjectTeacher} selectedClass={selectedClass} setSelectedClass={setSelectedClass} subjects={subjects}
            setStructureToEdit={setStructureToEdit} setStructureToDelete={setStructureToDelete}
          />
        )}

        {activeTab === "reminders" && (
          <RemindersTab
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear} setSelectedYear={setSelectedYear}
            dueReminders={dueReminders} setSelectedStudentForProfile={setSelectedStudentForProfile} openFeeModal={openFeeModal}
            classes={classes}
            subjects={subjects}
          />
        )}

      </main>

      {/* Modals */}
      <StructureEditModal 
        structureToEdit={structureToEdit} 
        setStructureToEdit={setStructureToEdit} 
        handleUpdateStructure={handleUpdateStructure} 
      />
      <StudentProfileModal 
        selectedStudentForProfile={selectedStudentForProfile} 
        setSelectedStudentForProfile={setSelectedStudentForProfile} 
        selectedYear={selectedYear} 
        openEditStudentModal={openEditStudentModal} 
        setStudentToDelete={setStudentToDelete} 
        handleToggleEnrollmentStatus={handleToggleEnrollmentStatus}
      />
      <EnrolledSubjectsModal
        selectedStudentForEnrollmentView={selectedStudentForEnrollmentView}
        setSelectedStudentForEnrollmentView={setSelectedStudentForEnrollmentView}
        students={students}
        classes={classes}
        subjects={subjects}
        coachings={coachings}
      />
      <ConfirmDeleteModal 
        studentToDelete={studentToDelete} 
        setStudentToDelete={setStudentToDelete} 
        confirmDeleteStudent={confirmDeleteStudent} 
      />
      <ConfirmDeleteStructureModal 
        structureToDelete={structureToDelete} 
        setStructureToDelete={setStructureToDelete} 
        confirmDeleteStructure={confirmDeleteStructure} 
      />
      <StudentModal 
        isStudentModalOpen={isStudentModalOpen} 
        setIsStudentModalOpen={setIsStudentModalOpen} 
        editingStudentId={editingStudentId} 
        handleSaveStudent={handleSaveStudent} 
        studentFormData={studentFormData} 
        setStudentFormData={setStudentFormData} 
        coachings={coachings} 
        classes={classes} 
        subjects={subjects} 
        students={students}
      />
      <FeeModal 
        isFeeModalOpen={isFeeModalOpen} 
        setIsFeeModalOpen={setIsFeeModalOpen} 
        selectedStudentForFee={selectedStudentForFee} 
        selectedMonth={selectedMonth} 
        selectedYear={selectedYear} 
        handleSaveFeeStatus={handleSaveFeeStatus} 
        feeFormData={feeFormData} 
        setFeeFormData={setFeeFormData} 
      />

    </div>
  );
}

function AppContent() {
  const { currentUser } = useAuth();
  return currentUser ? <MainDashboard /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
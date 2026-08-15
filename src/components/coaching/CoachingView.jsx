// src/components/coaching/CoachingView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, setDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { RemindersTab } from './RemindersTab';
import { ExpensesTab } from './ExpensesTab';
import { Edit3, Settings } from 'lucide-react';
import { EditCoachingModal } from './EditCoachingModal';
import { AddTeacherModal } from './AddTeacherModal';
import { 
  Plus, BookOpen, Bell, ArrowLeft, Search, X, 
  Layers, Bookmark, ChevronRight, AlertCircle, Users, Calendar, 
  UserPlus, Receipt, Eye, EyeOff, Copy, Check, ShieldCheck, Trash2,
  AlertTriangle, Loader2, Unlink, CheckCircle2
} from 'lucide-react';

export const CoachingView = ({ 
  coaching, 
  initialState = {}, 
  onUpdateState, 
  onOpenAddStudent, 
  onOpenClassDetails, 
  onOpenSubjectDetails, 
  onOpenStudentDetails, 
  onGoBack 
}) => {
  const [activeTab, setActiveTab] = useState(initialState.activeTab || 'roster'); // 'roster' | 'classes' | 'subjects' | 'faculty' | 'reminders' | 'expenses'
  const [selectedClassId, setSelectedClassId] = useState(initialState.selectedClassId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialState.selectedSubjectId || '');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState(initialState.enrollmentStatusFilter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  const [showEditCoachingModal, setShowEditCoachingModal] = useState(false);
  const [currentCoaching, setCurrentCoaching] = useState(coaching);

  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Custom Delete Entire Teacher Modal State
  const [deleteTeacherModal, setDeleteTeacherModal] = useState({
    isOpen: false,
    teacher: null,
    isProcessing: false
  });

  // Custom Unassign Specific Batch Modal State
  const [unassignBatchModal, setUnassignBatchModal] = useState({
    isOpen: false,
    teacher: null,
    batch: null,
    isProcessing: false
  });

  // Quick Action Dropdown (+ Button) State
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const quickMenuRef = useRef(null);

  // Roster Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState(initialState.selectedMonth || new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(initialState.selectedYear || new Date().getFullYear());

  // Quick Fee Modal State
  const [activeFeeModal, setActiveFeeModal] = useState(null);
  const [feeModalForm, setFeeModalForm] = useState({ status: 'paid', amountPaid: 0, remark: '' });

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState({});
  const [teachers, setTeachers] = useState([]);

  // Faculty Tab Passwords and Copy State
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Synchronized Reminders Badge Count
  const [remindersCount, setRemindersCount] = useState(0);

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [targetClassForSubject, setTargetClassForSubject] = useState('');
  const [subjectForm, setSubjectForm] = useState({ name: '', teacherName: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Close Quick Action Dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target)) {
        setShowQuickMenu(false);
      }
    };
    if (showQuickMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuickMenu]);

  useEffect(() => {
    fetchCoachingData();
  }, [coaching.id, selectedYear, selectedMonth]);

  const calculateCurrentRemindersCount = (studentList, feeDocs) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentFilterVal = currentYear * 12 + currentMonth;

    const currentFeeMap = new Map();
    feeDocs.forEach(d => {
      const data = d.data();
      if (data.coachingId === coaching.id && Number(data.year) === currentYear && Number(data.month) === currentMonth) {
        currentFeeMap.set(`${data.studentId}_${data.enrollmentId}`, data);
      }
    });

    let count = 0;
    studentList.forEach(student => {
      student.enrollments?.forEach(enr => {
        if (enr.joinedAt) {
          const joinedDate = new Date(enr.joinedAt);
          const joinedVal = joinedDate.getFullYear() * 12 + (joinedDate.getMonth() + 1);
          if (currentFilterVal < joinedVal) return;
        } else if (student.createdAt) {
          const createdDate = new Date(student.createdAt);
          const createdVal = createdDate.getFullYear() * 12 + (createdDate.getMonth() + 1);
          if (currentFilterVal < createdVal) return;
        }

        const key = `${student.id}_${enr.enrollmentId}`;
        const feeRecord = currentFeeMap.get(key);
        const status = feeRecord?.status || 'unpaid';

        if (status === 'unpaid' || status === 'partially_paid') {
          count++;
        }
      });
    });

    return count;
  };

  const fetchCoachingData = async () => {
    const classSnap = await getDocs(collection(db, 'coachings', coaching.id, 'classes'));
    const classList = classSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setClasses(classList);
    coaching.classes = classList;

    const studentSnap = await getDocs(collection(db, 'students'));
    const allStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const coachingStudents = allStudents.filter(s => s.coachingId === coaching.id);
    setStudents(coachingStudents);

    const feeSnap = await getDocs(collection(db, 'feeRecords'));
    const records = {};
    feeSnap.docs.forEach(d => {
      const data = d.data();
      if (data.coachingId === coaching.id && data.year === Number(selectedYear) && data.month === Number(selectedMonth)) {
        records[`${data.studentId}_${data.enrollmentId}`] = data;
      }
    });
    setFeeRecords(records);

    const count = calculateCurrentRemindersCount(coachingStudents, feeSnap.docs);
    setRemindersCount(count);

    // Fetch Faculty Staff Teachers
    const teachersSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('role', '==', 'staff_teacher')
      )
    );
    const teacherList = teachersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => 
        t.status !== 'deleted' && 
        (t.coachingId === coaching.id || t.assignedBatches?.some(b => b.coachingId === coaching.id))
      );
    setTeachers(teacherList);
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    setSelectedSubjectId('');
    onUpdateState({ selectedClassId: classId, selectedSubjectId: '' });
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    onUpdateState({ selectedSubjectId: subjectId });
  };

  const handleStatusFilterChange = (status) => {
    setEnrollmentStatusFilter(status);
    onUpdateState({ enrollmentStatusFilter: status });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    onUpdateState({ activeTab: tab });
  };

  const openQuickFeeModal = (student, enrollment) => {
    const record = feeRecords[`${student.id}_${enrollment.enrollmentId}`] || {};
    const defaultStatus = record.status || 'unpaid';
    const defaultAmount = record.amountPaid !== undefined ? record.amountPaid : (defaultStatus === 'paid' ? enrollment.monthlyFee : 0);
    setFeeModalForm({
      status: defaultStatus,
      amountPaid: defaultAmount,
      remark: record.remark || ''
    });
    setActiveFeeModal({ student, enrollment, record });
  };

  const handleSaveFeeModal = async (e) => {
    e.preventDefault();
    if (!activeFeeModal) return;
    const { student, enrollment } = activeFeeModal;
    let finalAmount = Number(feeModalForm.amountPaid);
    if (feeModalForm.status === 'paid') finalAmount = enrollment.monthlyFee;
    if (feeModalForm.status === 'unpaid') finalAmount = 0;

    const recordId = `${student.id}_${enrollment.enrollmentId}_${selectedYear}_${selectedMonth}`;
    await setDoc(doc(db, 'feeRecords', recordId), {
      studentId: student.id,
      enrollmentId: enrollment.enrollmentId,
      coachingId: coaching.id,
      year: Number(selectedYear),
      month: Number(selectedMonth),
      status: feeModalForm.status,
      amountPaid: finalAmount,
      remark: feeModalForm.remark || '',
      updatedAt: new Date().toISOString()
    });

    setActiveFeeModal(null);
    fetchCoachingData();
    showToast(`Fee status updated for ${student.name}`);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    await addDoc(collection(db, 'coachings', coaching.id, 'classes'), {
      className: newClassName,
      subjects: [],
      createdAt: new Date().toISOString()
    });
    setNewClassName('');
    setShowAddClassModal(false);
    fetchCoachingData();
    showToast('New class added successfully!');
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!targetClassForSubject || !subjectForm.name || !subjectForm.teacherName) return;

    const targetClass = classes.find(c => c.id === targetClassForSubject);
    const newSubject = {
      id: `sub_${Date.now()}`,
      name: subjectForm.name,
      teacherName: subjectForm.teacherName
    };

    await updateDoc(doc(db, 'coachings', coaching.id, 'classes', targetClassForSubject), {
      subjects: [...(targetClass.subjects || []), newSubject]
    });

    setSubjectForm({ name: '', teacherName: '' });
    setShowAddSubjectModal(false);
    fetchCoachingData();
    showToast('New subject batch added successfully!');
  };

  // 1. Delete Entire Faculty Account Access (Pure Firestore Update - No Auth Interference)
  const handleConfirmDeleteTeacher = async () => {
    const teacher = deleteTeacherModal.teacher;
    if (!teacher) return;

    setDeleteTeacherModal(prev => ({ ...prev, isProcessing: true }));
    try {
      const userRef = doc(db, 'users', teacher.id || teacher.uid);
      const remainingBatches = (teacher.assignedBatches || []).filter(b => b.coachingId !== coaching.id);

      if (remainingBatches.length > 0) {
        await updateDoc(userRef, {
          assignedBatches: remainingBatches,
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(userRef, {
          status: 'deleted',
          role: 'deleted_staff',
          assignedBatches: [],
          coachingId: null,
          deletedAt: new Date().toISOString()
        });
      }

      setDeleteTeacherModal({ isOpen: false, teacher: null, isProcessing: false });
      fetchCoachingData();
      showToast(`Faculty access revoked for ${teacher.name || teacher.email}`);
    } catch (err) {
      console.error("Error deleting teacher access:", err);
      setDeleteTeacherModal(prev => ({ ...prev, isProcessing: false }));
      showToast('Failed to delete teacher: ' + err.message, 'error');
    }
  };

  // 2. Unassign Specific Batch from Faculty (Pure Firestore Update - No Auth Interference)
  const handleConfirmUnassignBatch = async () => {
    const { teacher, batch } = unassignBatchModal;
    if (!teacher || !batch) return;

    setUnassignBatchModal(prev => ({ ...prev, isProcessing: true }));
    try {
      const userRef = doc(db, 'users', teacher.id || teacher.uid);
      const existingBatches = teacher.assignedBatches || [];

      // Filter out only the selected batch
      const updatedBatches = existingBatches.filter(b => 
        !(b.coachingId === coaching.id && b.classId === batch.classId && b.subjectId === batch.subjectId)
      );

      await updateDoc(userRef, {
        assignedBatches: updatedBatches,
        assignedClassId: updatedBatches.length > 0 ? updatedBatches[0].classId : '',
        assignedSubjectId: updatedBatches.length > 0 ? updatedBatches[0].subjectId : '',
        updatedAt: new Date().toISOString()
      });

      setUnassignBatchModal({ isOpen: false, teacher: null, batch: null, isProcessing: false });
      fetchCoachingData();
      showToast(`Unassigned ${batch.className} (${batch.subjectName}) from ${teacher.name || 'faculty'}`);
    } catch (err) {
      console.error("Error unassigning batch:", err);
      setUnassignBatchModal(prev => ({ ...prev, isProcessing: false }));
      showToast('Failed to unassign batch: ' + err.message, 'error');
    }
  };

  const togglePasswordVisibility = (teacherId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  const handleCopyCredentials = (email, password, teacherId) => {
    const text = `TuitionManager Faculty Login\nEmail: ${email}\nPassword: ${password || 'Set at creation'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(teacherId);
    showToast('Credentials copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getClassNameById = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.className : 'Class';
  };

  const getSubjectNameById = (classId, subjectId) => {
    const cls = classes.find(c => c.id === classId);
    const sub = cls?.subjects?.find(s => s.id === subjectId);
    return sub ? sub.name : 'Subject';
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const activeSubjects = selectedClass?.subjects || [];

  const getStudentContext = (student) => {
    const enrollments = student.enrollments || [];
    const matchingEnrollment = enrollments.find(e => 
      (!selectedClassId || e.classId === selectedClassId) &&
      (!selectedSubjectId || e.subjectId === selectedSubjectId)
    );
    const primaryEnrollment = matchingEnrollment || enrollments[0];

    const filterVal = Number(selectedYear) * 12 + Number(selectedMonth);
    let isNotEnrolledYet = false;

    if (primaryEnrollment?.joinedAt) {
      const joinedDate = new Date(primaryEnrollment.joinedAt);
      const joinedVal = joinedDate.getFullYear() * 12 + (joinedDate.getMonth() + 1);
      if (filterVal < joinedVal) {
        isNotEnrolledYet = true;
      }
    } else if (student.createdAt) {
      const createdDate = new Date(student.createdAt);
      const createdVal = createdDate.getFullYear() * 12 + (createdDate.getMonth() + 1);
      if (filterVal < createdVal) {
        isNotEnrolledYet = true;
      }
    }

    const isEnrolled = !isNotEnrolledYet && (
      selectedClassId 
        ? enrollments.some(e => e.classId === selectedClassId && e.status === 'active')
        : enrollments.some(e => e.status === 'active')
    );

    const isLeft = !isNotEnrolledYet && (
      selectedClassId
        ? enrollments.some(e => e.classId === selectedClassId && e.status === 'unassigned')
        : enrollments.length > 0 && enrollments.every(e => e.status === 'unassigned')
    );

    const feeRecord = primaryEnrollment ? feeRecords[`${student.id}_${primaryEnrollment.enrollmentId}`] : null;
    const feeStatus = feeRecord?.status || 'unpaid';
    const hasPendingFee = feeStatus === 'unpaid' || feeStatus === 'partially_paid';
    const isLeftWithPendingFee = isLeft && hasPendingFee;

    return { 
      matchingEnrollment: primaryEnrollment, 
      isEnrolled, 
      isLeft, 
      isNotEnrolledYet, 
      feeRecord, 
      feeStatus, 
      hasPendingFee, 
      isLeftWithPendingFee 
    };
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
                          student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.phone?.includes(searchTerm);
    if (!matchesSearch) return false;

    if (selectedClassId) {
      const hasClassMatch = student.enrollments?.some(e => 
        e.classId === selectedClassId &&
        (!selectedSubjectId || e.subjectId === selectedSubjectId)
      );
      if (!hasClassMatch) return false;
    }

    const { isEnrolled, isLeft, isNotEnrolledYet } = getStudentContext(student);
    if (enrollmentStatusFilter === 'enrolled' && !isEnrolled) return false;
    if (enrollmentStatusFilter === 'left' && !isLeft) return false;
    if (enrollmentStatusFilter === 'not_enrolled' && !isNotEnrolledYet) return false;

    return true;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const ctxA = getStudentContext(a);
    const ctxB = getStudentContext(b);

    if (ctxA.isLeftWithPendingFee && !ctxB.isLeftWithPendingFee) return -1;
    if (!ctxA.isLeftWithPendingFee && ctxB.isLeftWithPendingFee) return 1;

    if (ctxA.isEnrolled && !ctxB.isEnrolled) return -1;
    if (!ctxA.isEnrolled && ctxB.isEnrolled) return 1;

    return 0;
  });

  const totalSubjectsCount = classes.reduce((sum, c) => sum + (c.subjects?.length || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      
      {/* FLOATING TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-none">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
            toast.type === 'error'
              ? 'bg-rose-900/95 text-white border-rose-700 shadow-rose-900/30'
              : 'bg-slate-900/95 text-white border-slate-700 shadow-indigo-900/30'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs relative">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{currentCoaching?.name || coaching.name}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Owner: {currentCoaching?.ownerName || coaching.ownerName} | Location: {currentCoaching?.address || coaching.address} | UPI: {currentCoaching?.upiId || coaching.upi || 'N/A'}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Add Staff Teacher Button */}
          <button
            onClick={() => setShowAddTeacherModal(true)}
            className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-200 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
            title="Create Staff Teacher Login"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add Teacher</span>
          </button>

          {/* Edit Coaching Details Button */}
          <button
            onClick={() => setShowEditCoachingModal(true)}
            className="p-2.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-2xl border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
            title="Edit Coaching Details"
          >
            <Edit3 size={16} />
            <span className="hidden sm:inline">Edit Details</span>
          </button>

          {/* Animated Plus Button Action */}
          <div className="relative" ref={quickMenuRef}>
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className={`w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-300 transform active:scale-95 cursor-pointer ${
                showQuickMenu ? 'rotate-45 bg-slate-900 hover:bg-slate-800' : 'hover:scale-105'
              }`}
              title="Quick Options"
            >
              <Plus size={16} className="transition-transform duration-300" />
            </button>

            {showQuickMenu && (
              <div className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Quick Options
                </div>
                
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    setShowAddClassModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 transition-all flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <Layers size={15} />
                  </div>
                  <span>Add Class</span>
                </button>

                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    setTargetClassForSubject(classes[0]?.id || '');
                    setShowAddSubjectModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 transition-all flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <Bookmark size={15} />
                  </div>
                  <span>Add Subject</span>
                </button>

                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenAddStudent();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-white/20 group-hover:text-white transition-colors">
                    <UserPlus size={15} />
                  </div>
                  <span>Add Student</span>
                </button>

                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    handleTabChange('expenses');
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/50 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 group-hover:bg-white/20 group-hover:text-white transition-colors">
                    <Receipt size={15} />
                  </div>
                  <span>Track Expenses</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'roster' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={16} /> Student Roster
        </button>

        <button
          onClick={() => handleTabChange('classes')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'classes' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Layers size={16} /> Classes
        </button>

        <button
          onClick={() => handleTabChange('subjects')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'subjects' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Bookmark size={16} /> Subjects
        </button>

        <button
          onClick={() => handleTabChange('faculty')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'faculty' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <UserPlus size={16} /> Faculty & Staff ({teachers.length})
        </button>

        <button
          onClick={() => handleTabChange('reminders')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reminders' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Bell size={16} /> Fee Reminders 
          {remindersCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white font-extrabold text-[10px] rounded-full shadow-xs">
              {remindersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'expenses' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Receipt size={16} /> Expenses
        </button>
      </div>

      {/* TAB 1: STUDENT ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    onUpdateState({ selectedMonth: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold text-slate-700 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    onUpdateState({ selectedYear: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold text-slate-700 outline-none"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Subject</label>
                <select
                  disabled={!selectedClassId}
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 outline-none disabled:opacity-50"
                >
                  <option value="">All Subjects</option>
                  {activeSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.teacherName})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Filter</label>
                <select
                  value={enrollmentStatusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 outline-none"
                >
                  <option value="all">All Students</option>
                  <option value="enrolled">Active Enrolled</option>
                  <option value="left">Left / Un-enrolled</option>
                  <option value="not_enrolled">Not Enrolled Yet</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students by name or phone number..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" /> 
                Roster for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
              </h3>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                Count: {sortedStudents.length} Student(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4 font-bold">Student Name</th>
                    <th className="px-5 py-4 font-bold">Contact</th>
                    <th className="px-5 py-4 font-bold">Enrolled Class-Subjects</th>
                    <th className="px-5 py-4 font-bold">Status in {selectedMonth}/{selectedYear}</th>
                    {selectedClassId && <th className="px-5 py-4 font-bold">Fee Status ({selectedMonth}/{selectedYear})</th>}
                    <th className="px-5 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStudents.map((student) => {
                    const { matchingEnrollment, isEnrolled, isLeft, isNotEnrolledYet, feeRecord, feeStatus, isLeftWithPendingFee } = getStudentContext(student);
                    const amountPaid = feeRecord?.amountPaid || 0;
                    const amountLeft = matchingEnrollment ? Math.max(0, matchingEnrollment.monthlyFee - amountPaid) : 0;

                    return (
                      <tr 
                        key={student.id} 
                        className={`transition-all ${
                          isLeftWithPendingFee 
                            ? 'bg-amber-50/80 border-2 border-amber-400/80 shadow-md animate-pulse' 
                            : isNotEnrolledYet 
                            ? 'bg-slate-50/40 opacity-50' 
                            : isLeft 
                            ? 'bg-slate-50/60 opacity-75' 
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {isLeftWithPendingFee && (
                              <span className="text-amber-600 font-bold" title="Student left class with pending fee balance!">
                                <AlertCircle size={16} />
                              </span>
                            )}
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                {student.name}
                                {isLeftWithPendingFee && (
                                  <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                    Pending Balance
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">{student.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-600 text-xs">
                          {student.phone}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {student.enrollments?.map(enr => (
                              <span key={enr.enrollmentId} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                {enr.className} ({enr.subjectName})
                              </span>
                            ))}
                          </div>
                        </td>
                        
                        <td className="px-5 py-3">
                          {isNotEnrolledYet ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Not Enrolled Yet
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isEnrolled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {isEnrolled ? 'Enrolled' : 'Left / Un-enrolled'}
                            </span>
                          )}
                        </td>

                        {selectedClassId && (
                          <td className="px-5 py-3">
                            {isNotEnrolledYet ? (
                              <span className="text-[11px] text-slate-400 italic">N/A</span>
                            ) : !selectedSubjectId ? (
                              <span className="text-[11px] text-slate-400 font-medium italic">Select Subject to track fee</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openQuickFeeModal(student, matchingEnrollment)}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                  feeStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                                  feeStatus === 'partially_paid' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                  'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                }`}
                              >
                                {feeStatus === 'paid' && 'Paid'}
                                {feeStatus === 'partially_paid' && `Partial (₹ ${amountLeft} left)`}
                                {feeStatus === 'unpaid' && 'Unpaid'}
                              </button>
                            )}
                          </td>
                        )}

                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => onOpenStudentDetails(student)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedStudents.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                  No students match the current search or filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASSES GRID */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-extrabold text-slate-800 text-sm">Classes Overview</h3>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
              Total Classes: {classes.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const classStudents = students.filter(s => s.enrollments?.some(e => e.classId === cls.id && e.status === 'active'));
              
              return (
                <div
                  key={cls.id}
                  onClick={() => onOpenClassDetails(cls.id)}
                  className="group relative bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50/50 rounded-full blur-xl group-hover:bg-indigo-100/60 transition-colors pointer-events-none" />
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Layers size={20} />
                      </div>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{cls.className}</h3>
                      <p className="text-xs text-slate-500 mt-1">{cls.subjects?.length || 0} Subject(s) offered</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 relative z-10">
                    <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      <Users size={14} /> {classStudents.length} Active Students
                    </span>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">View Details →</span>
                  </div>
                </div>
              );
            })}
          </div>

          {classes.length === 0 && (
            <div className="bg-white rounded-3xl border p-12 text-center text-slate-400 text-sm">
              No classes created yet. Click "+" to create your first class.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBJECTS GRID */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-extrabold text-slate-800 text-sm">Subjects Overview</h3>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
              Total Subjects: {totalSubjectsCount}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.flatMap(cls => (cls.subjects || []).map(sub => ({ ...sub, classId: cls.id, className: cls.className }))).map((subject) => {
              const enrolledCount = students.filter(s => 
                s.enrollments?.some(e => e.subjectId === subject.id && e.status === 'active')
              ).length;

              return (
                <div
                  key={subject.id}
                  onClick={() => onOpenSubjectDetails({ classId: subject.classId, subjectId: subject.id })}
                  className="group relative bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50/50 rounded-full blur-xl group-hover:bg-indigo-100/60 transition-colors pointer-events-none" />
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                        Class: {subject.className}
                      </span>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{subject.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Teacher: {subject.teacherName}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 relative z-10">
                    <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      <Users size={14} className="inline mr-1" /> {enrolledCount} Active Enrolled
                    </span>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">View Details →</span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalSubjectsCount === 0 && (
            <div className="bg-white rounded-3xl border p-12 text-center text-slate-400 text-sm">
              No subjects created yet. Click "+" to create your first subject.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FACULTY & STAFF TAB */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" /> Faculty Credentials & Access Roster
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage subject teacher logins, passwords, assigned classroom batch permissions, or revoke staff access
              </p>
            </div>

            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus size={14} /> Add New Teacher
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Teacher Name</th>
                  <th className="px-4 py-3.5 font-bold">Login Email</th>
                  <th className="px-4 py-3.5 font-bold">Assigned Classes & Subjects (Click × to Unassign)</th>
                  <th className="px-4 py-3.5 font-bold">Login Password</th>
                  <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {teachers.map((teacher) => {
                  const isPassVisible = visiblePasswords[teacher.id];

                  // Multi-batch resolution
                  const teacherBatches = teacher.assignedBatches && teacher.assignedBatches.length > 0
                    ? teacher.assignedBatches.filter(b => b.coachingId === coaching.id)
                    : (teacher.assignedClassId ? [{
                        classId: teacher.assignedClassId,
                        className: getClassNameById(teacher.assignedClassId),
                        subjectId: teacher.assignedSubjectId,
                        subjectName: getSubjectNameById(teacher.assignedClassId, teacher.assignedSubjectId)
                      }] : []);

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs">
                          {(teacher.name || 'T').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{teacher.name || 'Faculty'}</p>
                          <p className="text-[10px] text-slate-400">{teacher.phone || 'No phone logged'}</p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 font-mono font-semibold">
                        {teacher.email}
                      </td>

                      {/* Batches with Individual Unassign Option */}
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {teacherBatches.map((b, bIdx) => (
                            <span 
                              key={bIdx} 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold group/batch hover:bg-indigo-100/70 transition-colors"
                            >
                              <span>{b.className} ({b.subjectName})</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnassignBatchModal({
                                    isOpen: true,
                                    teacher,
                                    batch: b,
                                    isProcessing: false
                                  });
                                }}
                                className="p-0.5 rounded-md hover:bg-rose-100 text-indigo-400 hover:text-rose-600 transition-all cursor-pointer"
                                title={`Unassign ${b.className} - ${b.subjectName}`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {teacherBatches.length === 0 && (
                            <span className="text-xs text-slate-400 italic">No batches currently assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold select-all">
                            {isPassVisible ? (teacher.password || '••••••••') : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(teacher.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title={isPassVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleCopyCredentials(teacher.email, teacher.password, teacher.id)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 font-bold text-[11px] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          title="Copy Login Credentials"
                        >
                          {copiedId === teacher.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Login</span>
                            </>
                          )}
                        </button>

                        {/* DELETE BUTTON: Opens Custom Modal */}
                        <button
                          onClick={() => setDeleteTeacherModal({ isOpen: true, teacher, isProcessing: false })}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-all inline-flex items-center cursor-pointer"
                          title="Revoke Faculty Access"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {teachers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-2">
                <UserPlus size={32} className="mx-auto text-slate-300" />
                <p>No staff teachers registered yet for this coaching center.</p>
                <button
                  onClick={() => setShowAddTeacherModal(true)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  Create First Teacher Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: REMINDERS TAB */}
      {activeTab === 'reminders' && (
        <RemindersTab 
          coachingId={coaching.id} 
          onCountChange={(count) => setRemindersCount(count)}
          onOpenStudentDetails={onOpenStudentDetails}
        />
      )}

      {/* TAB 6: EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <ExpensesTab coaching={coaching} coachingId={coaching.id} />
      )}

      {/* Quick Fee Modal */}
      {activeFeeModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-base">Update Fee Record</h3>
            <p className="text-xs text-slate-500">
              {activeFeeModal.student.name} • {activeFeeModal.enrollment.className} ({activeFeeModal.enrollment.subjectName})
            </p>
            <p className="text-[11px] font-bold text-indigo-600">
              Target Month: {selectedMonth}/{selectedYear}
            </p>
            <form onSubmit={handleSaveFeeModal} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={feeModalForm.status}
                  onChange={(e) => setFeeModalForm({ 
                    ...feeModalForm, 
                    status: e.target.value,
                    amountPaid: e.target.value === 'paid' ? activeFeeModal.enrollment.monthlyFee : 0
                  })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>

              {feeModalForm.status === 'partially_paid' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={feeModalForm.amountPaid}
                    onChange={(e) => setFeeModalForm({ ...feeModalForm, amountPaid: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
                    placeholder="Enter amount"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Monthly Fee: ₹{activeFeeModal.enrollment.monthlyFee} | Remaining: ₹{Math.max(0, activeFeeModal.enrollment.monthlyFee - Number(feeModalForm.amountPaid))}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remark (Optional)</label>
                <input
                  type="text"
                  value={feeModalForm.remark}
                  onChange={(e) => setFeeModalForm({ ...feeModalForm, remark: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
                  placeholder="e.g. Received via UPI / Cash"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveFeeModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-500 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer">Save Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-base">Add Class</h3>
            <form onSubmit={handleAddClass} className="space-y-3">
              <input
                type="text"
                placeholder="Class Name (e.g. 11th, Engineering)"
                required
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddClassModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-base">Add Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Class</label>
                <select
                  required
                  value={targetClassForSubject}
                  onChange={(e) => setTargetClassForSubject(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>
              <input
                type="text"
                placeholder="Subject Name (e.g. Physics)"
                required
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
              />
              <input
                type="text"
                placeholder="Teacher Name"
                required
                value={subjectForm.teacherName}
                onChange={(e) => setSubjectForm({ ...subjectForm, teacherName: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSubjectModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Custom Delete Entire Teacher Modal */}
      {deleteTeacherModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Faculty Access?</h3>
                <p className="text-[11px] text-slate-400 font-medium">Revoke teacher login & all batch permissions</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/60 p-3.5 rounded-2xl border border-rose-100">
              Are you sure you want to delete access for <strong className="text-slate-900">{deleteTeacherModal.teacher?.name || deleteTeacherModal.teacher?.email}</strong>? 
              They will no longer be able to log in or manage this coaching center's students.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTeacherModal({ isOpen: false, teacher: null, isProcessing: false })}
                disabled={deleteTeacherModal.isProcessing}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTeacher}
                disabled={deleteTeacherModal.isProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteTeacherModal.isProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Custom Unassign Batch Confirmation Modal */}
      {unassignBatchModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-amber-100">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl shrink-0">
                <Unlink size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Unassign Batch?</h3>
                <p className="text-[11px] text-slate-400 font-medium">Remove specific classroom assignment</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100 space-y-1.5">
              <p>
                Unassign <strong className="text-indigo-700 font-extrabold">{unassignBatchModal.batch?.className} ({unassignBatchModal.batch?.subjectName})</strong> from <strong className="text-slate-900">{unassignBatchModal.teacher?.name || unassignBatchModal.teacher?.email}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                This teacher will no longer see this batch in their faculty dashboard. Their login account and other assigned batches will remain active.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnassignBatchModal({ isOpen: false, teacher: null, batch: null, isProcessing: false })}
                disabled={unassignBatchModal.isProcessing}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassignBatch}
                disabled={unassignBatchModal.isProcessing}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {unassignBatchModal.isProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Unassigning...
                  </>
                ) : (
                  'Yes, Unassign'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coaching Details Modal */}
      <EditCoachingModal
        isOpen={showEditCoachingModal}
        onClose={() => setShowEditCoachingModal(false)}
        coaching={currentCoaching || coaching}
        onUpdated={(updated) => {
          setCurrentCoaching(updated);
          if (onUpdateState) {
            onUpdateState({ coaching: updated });
          }
          showToast('Coaching details updated successfully!');
        }}
      />

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={showAddTeacherModal}
        onClose={() => setShowAddTeacherModal(false)}
        coaching={coaching}
        classes={classes || []}
        onTeacherAdded={() => {
          fetchCoachingData();
          showToast('Faculty updated successfully!');
        }}
      />

    </div>
  );
};

export default CoachingView;
// src/components/coaching/CoachingView.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, setDoc, doc } from 'firebase/firestore';
import { RemindersTab } from './RemindersTab';
import { Plus, BookOpen, Bell, ArrowLeft, AlertCircle, Search, X, Trash2 } from 'lucide-react';

export const CoachingView = ({ coaching, initialState = {}, onUpdateState, onOpenAddStudent, onOpenStudentDetails, onGoBack }) => {
  const [activeTab, setActiveTab] = useState(initialState.activeTab || 'roster'); 
  const [selectedClassId, setSelectedClassId] = useState(initialState.selectedClassId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialState.selectedSubjectId || '');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState(initialState.enrollmentStatusFilter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState({});

  // Custom Fee Update Modal State (Replaces browser prompts)
  const [activeFeeModal, setActiveFeeModal] = useState(null); // { student, enrollment, currentRecord }
  const [feeModalForm, setFeeModalForm] = useState({ status: 'paid', amountPaid: 0, remark: '' });

  // Add Class & Add Subject Modals
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [targetClassForSubject, setTargetClassForSubject] = useState('');
  const [subjectForm, setSubjectForm] = useState({ name: '', teacherName: '' });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    fetchCoachingData();
  }, [coaching.id, currentYear, currentMonth]);

  const fetchCoachingData = async () => {
    const classSnap = await getDocs(collection(db, 'coachings', coaching.id, 'classes'));
    const classList = classSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setClasses(classList);
    coaching.classes = classList;

    const studentSnap = await getDocs(collection(db, 'students'));
    const allStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setStudents(allStudents.filter(s => s.coachingId === coaching.id));

    const feeSnap = await getDocs(collection(db, 'feeRecords'));
    const records = {};
    feeSnap.docs.forEach(d => {
      const data = d.data();
      if (data.coachingId === coaching.id && data.year === currentYear && data.month === currentMonth) {
        records[`${data.studentId}_${data.enrollmentId}`] = data;
      }
    });
    setFeeRecords(records);
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

  // 2. Open Custom Modal for Fee Updates (No window.prompt)
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

    const recordId = `${student.id}_${enrollment.enrollmentId}_${currentYear}_${currentMonth}`;
    await setDoc(doc(db, 'feeRecords', recordId), {
      studentId: student.id,
      enrollmentId: enrollment.enrollmentId,
      coachingId: coaching.id,
      year: currentYear,
      month: currentMonth,
      status: feeModalForm.status,
      amountPaid: finalAmount,
      remark: feeModalForm.remark || '',
      updatedAt: new Date().toISOString()
    });

    setActiveFeeModal(null);
    fetchCoachingData();
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
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const activeSubjects = selectedClass?.subjects || [];

  // Resolved Context Per Student
  const getStudentContext = (student) => {
    const matchingEnrollments = student.enrollments?.filter(e => 
      (!selectedClassId || e.classId === selectedClassId) &&
      (!selectedSubjectId || e.subjectId === selectedSubjectId)
    ) || [];

    const hasActiveEnrollment = matchingEnrollments.some(e => e.status === 'active');
    const hasLeftEnrollment = matchingEnrollments.some(e => e.status === 'unassigned');

    const isEnrolled = selectedClassId ? hasActiveEnrollment : student.enrollments?.some(e => e.status === 'active');
    const isLeft = selectedClassId ? hasLeftEnrollment : student.enrollments?.every(e => e.status === 'unassigned');

    // Fee calculations
    const primaryEnrollment = matchingEnrollments[0] || student.enrollments?.[0];
    const feeRecord = primaryEnrollment ? feeRecords[`${student.id}_${primaryEnrollment.enrollmentId}`] : null;
    const feeStatus = feeRecord?.status || 'unpaid';
    const hasPendingFee = feeStatus === 'unpaid' || feeStatus === 'partially_paid';

    const isLeftWithPendingFee = isLeft && hasPendingFee;

    return { matchingEnrollment: primaryEnrollment, isEnrolled, isLeft, feeRecord, feeStatus, hasPendingFee, isLeftWithPendingFee };
  };

  // 1. Filter Logic across All Students
  const filteredStudents = students.filter(student => {
    const { isEnrolled, isLeft } = getStudentContext(student);

    // 5. Search Bar Filter by Name or Phone
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.phone.includes(searchTerm);
    if (!matchesSearch) return false;

    // Filter by Class/Subject when active
    if (selectedClassId) {
      const hasClassMatch = student.enrollments?.some(e => 
        e.classId === selectedClassId &&
        (!selectedSubjectId || e.subjectId === selectedSubjectId)
      );
      if (!hasClassMatch) return false;
    }

    // 1. Enrollment status filter works for both all coaching and filtered views
    if (enrollmentStatusFilter === 'enrolled') return isEnrolled;
    if (enrollmentStatusFilter === 'left') return isLeft;

    return true;
  });

  // Priority Sorting Logic
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const ctxA = getStudentContext(a);
    const ctxB = getStudentContext(b);

    if (ctxA.isLeftWithPendingFee && !ctxB.isLeftWithPendingFee) return -1;
    if (!ctxA.isLeftWithPendingFee && ctxB.isLeftWithPendingFee) return 1;

    if (ctxA.isEnrolled && ctxB.isLeft) return -1;
    if (ctxA.isLeft && ctxB.isEnrolled) return 1;

    return 0;
  });

  // 4. Calculate total pending count for Reminders Head Badge
  const pendingRemindersCount = students.reduce((acc, student) => {
    const pendingEnrs = student.enrollments?.filter(enr => {
      const key = `${student.id}_${enr.enrollmentId}`;
      const status = feeRecords[key]?.status || 'unpaid';
      return status === 'unpaid' || status === 'partially_paid';
    });
    return acc + (pendingEnrs?.length || 0);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{coaching.name}</h1>
          <p className="text-xs text-slate-500 mt-1">Owner: {coaching.ownerName} | Location: {coaching.address}</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowAddClassModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all"
          >
            + Add Class
          </button>
          <button
            onClick={() => {
              setTargetClassForSubject(selectedClassId || classes[0]?.id || '');
              setShowAddSubjectModal(true);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all"
          >
            + Add Subject
          </button>
          <button
            onClick={onOpenAddStudent}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Class Filter</label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 outline-none"
            >
              <option value="">All Classes (All Coaching Students)</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Subject Filter</label>
            <select
              disabled={!selectedClassId}
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 outline-none disabled:opacity-50"
            >
              <option value="">All Subjects in Class</option>
              {activeSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.teacherName})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Enrollment Status Filter</label>
            <select
              value={enrollmentStatusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Students (Enrolled & Left)</option>
              <option value="enrolled">Active Enrolled Only</option>
              <option value="left">Left / Un-enrolled Only</option>
            </select>
          </div>
        </div>

        {/* 5. Student Roster Search Bar */}
        {activeTab === 'roster' && (
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
        )}
      </div>

      {/* Tabs Switcher with Requirement 4 Head Counter Badge */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'roster' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={16} /> Enrolled Students Roster
        </button>
        <button
          onClick={() => handleTabChange('reminders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'reminders' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Bell size={16} /> Fee Reminders 
          {/* 4. Head Count Badge */}
          {pendingRemindersCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white font-extrabold text-[10px] rounded-full shadow-xs">
              {pendingRemindersCount}
            </span>
          )}
        </button>
      </div>

      {/* Roster & Table Layout */}
      {activeTab === 'reminders' ? (
        <RemindersTab coachingId={coaching.id} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* 6. Header showing count of enrolled / filtered students */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">
              {!selectedClassId 
                ? "All Coaching Students" 
                : `Filtered: ${selectedClass?.className} ${selectedSubjectId ? `(${activeSubjects.find(s=>s.id===selectedSubjectId)?.name})` : ''}`}
            </h3>
            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
              Enrolled Count: {sortedStudents.length} Student(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 font-bold">Student Name</th>
                  <th className="px-5 py-4 font-bold">Contact</th>
                  <th className="px-5 py-4 font-bold">Enrollment Status</th>
                  {selectedClassId && <th className="px-5 py-4 font-bold">Fee Status (Current Month)</th>}
                  <th className="px-5 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.map((student) => {
                  const { matchingEnrollment, isEnrolled, isLeft, feeRecord, feeStatus, isLeftWithPendingFee } = getStudentContext(student);
                  const amountPaid = feeRecord?.amountPaid || 0;
                  const amountLeft = matchingEnrollment ? Math.max(0, matchingEnrollment.monthlyFee - amountPaid) : 0;

                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-all ${
                        isLeftWithPendingFee 
                          ? 'bg-amber-50/80 border-2 border-amber-400/80 shadow-md animate-pulse'
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
                                  Pending Balance After Leaving
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
                      
                      {/* Enrollment Badge */}
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isEnrolled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {isEnrolled ? '✓ Enrolled' : 'Left / Un-enrolled'}
                        </span>
                      </td>

                      {/* Fee Status Badge Trigger */}
                      {selectedClassId && (
                        <td className="px-5 py-3">
                          {!selectedSubjectId ? (
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
                              {feeStatus === 'partially_paid' && `Partial (₹${amountLeft} left)`}
                              {feeStatus === 'unpaid' && 'Unpaid'}
                            </button>
                          )}
                        </td>
                      )}


                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => onOpenStudentDetails(student)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all shadow-xs"
                          >
                            View Profile
                          </button>
                        </div>
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
      )}

      {/* 2. Custom Quick Fee Modal (Replaces browser alerts/prompts) */}
      {activeFeeModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-base">Update Fee Record</h3>
            <p className="text-xs text-slate-500">
              {activeFeeModal.student.name} — {activeFeeModal.enrollment.className} ({activeFeeModal.enrollment.subjectName})
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
                <button type="button" onClick={() => setActiveFeeModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Save Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
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
                <button type="button" onClick={() => setShowAddClassModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
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
                <button type="button" onClick={() => setShowAddSubjectModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
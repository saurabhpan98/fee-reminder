// src/pages/StaffTeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  BookOpen, LogOut, Users, Search, Calendar, 
  Filter, ArrowLeft, ShieldCheck, Download, Eye, 
  DollarSign, Clock, CheckCircle2, AlertCircle, Sparkles, Bookmark
} from 'lucide-react';
import { StudentDetailsPage } from './StudentDetailsPage';
import { MONTHS, CURRENT_YEAR, formatPhoneNumber } from '../utils/helpers';
import { downloadPaymentReceiptPDF } from '../utils/exportUtils';

export const StaffTeacherDashboard = ({ staffUser, onLogout }) => {
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [coachingData, setCoachingData] = useState(null);
  const [allowedClasses, setAllowedClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month, Year & Batch Filter States
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR);
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Student Profile Navigation State
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchTeacherData();
  }, [staffUser, targetMonth, targetYear]);

  const fetchTeacherData = async () => {
    if (!staffUser?.coachingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Coaching Info
      const cSnap = await getDoc(doc(db, 'coachings', staffUser.coachingId));
      if (cSnap.exists()) {
        setCoachingData({ id: cSnap.id, ...cSnap.data() });
      }

      // 2. Fetch Classes and filter strictly for this teacher
      const classesSnap = await getDocs(collection(db, 'coachings', staffUser.coachingId, 'classes'));
      const allCoachingClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const teacherAllowedClasses = [];

      allCoachingClasses.forEach(cls => {
        // Filter subjects inside this class where teacher is assigned
        const matchedSubjects = (cls.subjects || []).filter(sub => {
          const isExplicitSubject = staffUser.assignedSubjectId && sub.id === staffUser.assignedSubjectId && staffUser.assignedClassId === cls.id;
          const isNameMatched = staffUser.name && sub.teacherName && sub.teacherName.toLowerCase().trim() === staffUser.name.toLowerCase().trim();
          const isClassWideAssigned = staffUser.assignedClassId === cls.id && !staffUser.assignedSubjectId;

          return isExplicitSubject || isNameMatched || isClassWideAssigned;
        });

        // Only include class if this teacher has at least one assigned subject
        if (matchedSubjects.length > 0) {
          teacherAllowedClasses.push({
            id: cls.id,
            className: cls.className,
            subjects: matchedSubjects
          });
        }
      });

      setAllowedClasses(teacherAllowedClasses);

      // 3. Fetch Students of this coaching
      const q = query(
        collection(db, 'students'),
        where('coachingId', '==', staffUser.coachingId)
      );
      const snap = await getDocs(q);
      const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter students who are strictly in teacher's assigned subjects
      const filteredStudents = allStudents.filter(s =>
        s.enrollments?.some(e => {
          if (e.status !== 'active') return false;
          
          return teacherAllowedClasses.some(tc => 
            tc.id === e.classId && tc.subjects.some(sub => sub.id === e.subjectId)
          );
        })
      );
      setStudents(filteredStudents);

      // 4. Fetch Fee Records for target month & year
      const feeQ = query(
        collection(db, 'feeRecords'),
        where('coachingId', '==', staffUser.coachingId),
        where('month', '==', Number(targetMonth)),
        where('year', '==', Number(targetYear))
      );
      const feeSnap = await getDocs(feeQ);
      const feeList = feeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeeRecords(feeList);

    } catch (err) {
      console.error('Error loading faculty student roster:', err);
    } finally {
      setLoading(false);
    }
  };

  // Available subjects based on teacher's allowed classes and selected class filter
  const selectedClassObj = allowedClasses.find(c => c.id === filterClassId);
  const availableSubjects = selectedClassObj 
    ? selectedClassObj.subjects 
    : allowedClasses.flatMap(c => c.subjects);

  // Fee Records Quick Lookup Map
  const feeMap = new Map();
  feeRecords.forEach(r => {
    feeMap.set(`${r.studentId}_${r.enrollmentId || r.subjectId}`, r);
  });

  // Flatten rows matching strictly teacher's assigned batches
  const rosterRows = [];
  students.forEach(student => {
    student.enrollments?.forEach(enr => {
      if (enr.status !== 'active') return;

      // Verification: Is this specific class and subject assigned to this teacher?
      const isAllowedBatch = allowedClasses.some(tc =>
        tc.id === enr.classId && tc.subjects.some(sub => sub.id === enr.subjectId)
      );

      if (!isAllowedBatch) return;

      // Class & Subject UI Filters
      if (filterClassId && enr.classId !== filterClassId) return;
      if (filterSubjectId && enr.subjectId !== filterSubjectId) return;

      const feeRec = feeMap.get(`${student.id}_${enr.enrollmentId || enr.subjectId}`);
      const amountPaid = Number(feeRec?.amountPaid || 0);
      const monthlyFee = Number(enr.monthlyFee || 0);
      const balance = Math.max(0, monthlyFee - amountPaid);
      const status = feeRec?.status || (amountPaid >= monthlyFee && monthlyFee > 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid');

      // Status Filter
      if (filterStatus !== 'all' && status !== filterStatus) return;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = student.name?.toLowerCase().includes(q);
        const matchPhone = student.phone?.includes(q);
        if (!matchName && !matchPhone) return;
      }

      rosterRows.push({
        student,
        enrollment: enr,
        feeRec,
        amountPaid,
        monthlyFee,
        balance,
        status
      });
    });
  });

  // Receipt Download Helper
  const handleDownloadReceipt = async (row) => {
    await downloadPaymentReceiptPDF({
      coaching: coachingData || { name: staffUser.coachingName || 'Tuition Center' },
      student: row.student,
      upiId: coachingData?.upiId || '',
      classSubjectInfo: {
        className: row.enrollment.className,
        subjectName: row.enrollment.subjectName,
        teacherName: staffUser.name || 'Faculty',
        monthlyFee: row.monthlyFee,
        month: Number(targetMonth),
        year: Number(targetYear)
      },
      feeRecord: {
        id: row.feeRec?.id || `REC-${Date.now().toString().slice(-6)}`,
        status: row.status,
        amountPaid: row.amountPaid,
        remark: row.feeRec?.remark || 'Faculty Download',
        updatedAt: row.feeRec?.updatedAt || new Date().toISOString()
      }
    });
  };

  // -------------------------------------------------------------
  // VIEW: STUDENT PROFILE DETAILS (Reusing StudentDetailsPage.jsx)
  // -------------------------------------------------------------
  if (selectedStudent) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6">
        <StudentDetailsPage
          studentId={selectedStudent.id}
          userData={staffUser}
          onOpenUpgradeModal={() => {}}
          onBack={() => {
            setSelectedStudent(null);
            fetchTeacherData();
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MAIN STAFF TEACHER ROSTER DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-white shadow-md shadow-indigo-500/30">
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">
              {staffUser.coachingName || 'Coaching Institute'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Faculty Panel: <span className="text-indigo-400 font-bold">{staffUser.name}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Banner Info Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">My Batch Student Roster</h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase">
                Faculty Access
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Showing students registered strictly in your assigned classes & subject batches
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
            <Users size={16} className="text-indigo-600" />
            <span>{rosterRows.length} Active Student(s)</span>
          </div>
        </div>

        {/* 5-Dropdown Filter Controls Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Month</label>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Year</label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* STRICT ASSIGNED CLASSES ONLY */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Class</label>
              <select
                value={filterClassId}
                onChange={(e) => {
                  setFilterClassId(e.target.value);
                  setFilterSubjectId('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="">All My Assigned Classes ({allowedClasses.length})</option>
                {allowedClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>

            {/* STRICT ASSIGNED SUBJECTS ONLY */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Subject</label>
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="">All My Subjects</option>
                {availableSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fee Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Fully Paid Only</option>
                <option value="partially_paid">Partially Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
              </select>
            </div>
          </div>

          {/* Live Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name or phone number..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" /> Batch Roster for {MONTHS[targetMonth - 1]} {targetYear}
            </h3>
            <span className="text-xs font-bold text-slate-500">{rosterRows.length} Student Record(s)</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Loading your assigned student roster...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-bold">Student Name</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">Class & Subject</th>
                    <th className="px-4 py-3 font-bold">Monthly Fee</th>
                    <th className="px-4 py-3 font-bold">Status in {targetMonth}/{targetYear}</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {rosterRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.student.name}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {formatPhoneNumber(row.student.phone)}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-indigo-700">
                        {row.enrollment.className} ({row.enrollment.subjectName})
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        ₹ {row.monthlyFee}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          row.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          row.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {row.status === 'paid' ? 'Paid' : row.status === 'partially_paid' ? `Partial (Due ₹${row.balance})` : `Unpaid (Due ₹${row.monthlyFee})`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleDownloadReceipt(row)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Download Receipt"
                        >
                          <Download size={13} /> Receipt
                        </button>
                        
                        <button
                          onClick={() => setSelectedStudent(row.student)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rosterRows.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  {allowedClasses.length === 0 
                    ? "You haven't been assigned to any class batches yet. Please contact the coaching administrator."
                    : "No students found matching the selected filter or search term."}
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default StaffTeacherDashboard;
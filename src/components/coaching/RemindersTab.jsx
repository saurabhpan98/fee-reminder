// src/components/coaching/RemindersTab.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Search, X, Calendar } from 'lucide-react';

export const RemindersTab = ({ coachingId, onCountChange, onOpenStudentDetails }) => {
  const currentDate = new Date();
  const systemYear = currentDate.getFullYear();
  const systemMonth = currentDate.getMonth() + 1;

  // Independent Month & Year State (Defaults to system current month/year)
  const [selectedMonth, setSelectedMonth] = useState(systemMonth);
  const [selectedYear, setSelectedYear] = useState(systemYear);

  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Custom Modal State
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [modalForm, setModalForm] = useState({ status: 'paid', amountPaid: 0, remark: '' });

  const isCurrentSystemMonth = Number(selectedYear) === systemYear && Number(selectedMonth) === systemMonth;
  const isPastSeventh = currentDate.getDate() >= 7;

  useEffect(() => {
    fetchDefaulters();
  }, [coachingId, selectedYear, selectedMonth]);

  const fetchDefaulters = async () => {
    setLoading(true);
    const q = query(collection(db, 'students'), where('coachingId', '==', coachingId));
    const studentSnap = await getDocs(q);
    const students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const feeQ = query(
      collection(db, 'feeRecords'),
      where('coachingId', '==', coachingId),
      where('year', '==', Number(selectedYear)),
      where('month', '==', Number(selectedMonth))
    );
    const feeSnap = await getDocs(feeQ);
    const feeMap = new Map();
    feeSnap.docs.forEach(d => {
      const data = d.data();
      feeMap.set(`${data.studentId}_${data.enrollmentId}`, data);
    });

    const list = [];
    const filterVal = Number(selectedYear) * 12 + Number(selectedMonth);

    students.forEach(student => {
      student.enrollments?.forEach(enr => {
        // Skip if student had not joined yet in selected month/year
        if (enr.joinedAt) {
          const joinedDate = new Date(enr.joinedAt);
          const joinedVal = joinedDate.getFullYear() * 12 + (joinedDate.getMonth() + 1);
          if (filterVal < joinedVal) return;
        } else if (student.createdAt) {
          const createdDate = new Date(student.createdAt);
          const createdVal = createdDate.getFullYear() * 12 + (createdDate.getMonth() + 1);
          if (filterVal < createdVal) return;
        }

        const key = `${student.id}_${enr.enrollmentId}`;
        const feeRecord = feeMap.get(key);
        const status = feeRecord?.status || 'unpaid';
        const amountPaid = feeRecord?.amountPaid || 0;
        const amountLeft = Math.max(0, enr.monthlyFee - amountPaid);
        const isEnrolled = enr.status === 'active';
        const isLeft = enr.status === 'unassigned';

        if (status === 'unpaid' || status === 'partially_paid') {
          list.push({
            studentObj: student,
            studentId: student.id,
            studentName: student.name,
            phone: student.phone,
            email: student.email,
            enrollment: enr,
            status,
            amountPaid,
            amountLeft,
            isEnrolled,
            isLeft,
            isLeftWithPendingFee: isLeft
          });
        }
      });
    });

    list.sort((a, b) => {
      if (a.isLeftWithPendingFee && !b.isLeftWithPendingFee) return -1;
      if (!a.isLeftWithPendingFee && b.isLeftWithPendingFee) return 1;
      return 0;
    });

    setDefaulters(list);
    if (onCountChange) onCountChange(list.length);
    setLoading(false);
  };

  const openQuickActionModal = (item) => {
    setModalForm({
      status: item.status,
      amountPaid: item.amountPaid || 0,
      remark: ''
    });
    setActiveModalItem(item);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!activeModalItem) return;

    let finalAmount = Number(modalForm.amountPaid);
    if (modalForm.status === 'paid') finalAmount = activeModalItem.enrollment.monthlyFee;
    if (modalForm.status === 'unpaid') finalAmount = 0;

    const recordId = `${activeModalItem.studentId}_${activeModalItem.enrollment.enrollmentId}_${selectedYear}_${selectedMonth}`;
    await setDoc(doc(db, 'feeRecords', recordId), {
      studentId: activeModalItem.studentId,
      enrollmentId: activeModalItem.enrollment.enrollmentId,
      coachingId,
      year: Number(selectedYear),
      month: Number(selectedMonth),
      status: modalForm.status,
      amountPaid: finalAmount,
      remark: modalForm.remark || '',
      updatedAt: new Date().toISOString()
    });

    setActiveModalItem(null);
    fetchDefaulters();
  };

  const filteredDefaulters = defaulters.filter(item => 
    item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {/* Banner & Independent Filter Section */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h4 className="font-bold text-amber-900 text-sm">
            Fee Due Reminders — {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
          </h4>
          <p className="text-xs text-amber-700 mt-0.5">
            {isCurrentSystemMonth && isPastSeventh 
              ? "Cutoff Date (7th) passed. Showing all students with pending fees."
              : `Showing students with pending/partially paid fees for ${new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear}.`}
          </p>
        </div>

        {/* Independent Month & Year Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
            <Calendar size={14} className="text-amber-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <span className="px-3 py-1.5 bg-amber-200 text-amber-900 rounded-xl font-bold text-xs whitespace-nowrap">
            {defaulters.length} Pending Record(s)
          </span>
        </div>
      </div>

      {/* Reminders Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search pending students by name or phone..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs font-medium">Scanning fee records...</div>
      ) : filteredDefaulters.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-emerald-600 font-bold text-sm shadow-xs flex items-center justify-center gap-2">
          <CheckCircle size={18} /> No pending fee records for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Student Name</th>
                  <th className="px-5 py-4 font-bold">Contact Number</th>
                  <th className="px-5 py-4 font-bold">Class & Subject</th>
                  <th className="px-5 py-4 font-bold">Enrollment Status</th>
                  <th className="px-5 py-4 font-bold">Due Amount</th>
                  <th className="px-5 py-4 font-bold">Fee Status</th>
                  <th className="px-5 py-4 font-bold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDefaulters.map((item, idx) => (
                  <tr 
                    key={idx}
                    className={`transition-all ${
                      item.isLeftWithPendingFee 
                        ? 'bg-amber-50/80 border-2 border-amber-400/80 shadow-md animate-pulse'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {item.isLeftWithPendingFee && (
                          <span className="text-amber-600 font-bold" title="Student left class with pending fee!">
                            <AlertCircle size={16} />
                          </span>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenStudentDetails && onOpenStudentDetails(item.studentObj)}
                            className="font-bold text-slate-800 hover:text-indigo-600 hover:underline flex items-center gap-1.5 text-left transition-colors cursor-pointer"
                          >
                            {item.studentName}
                            {item.isLeftWithPendingFee && (
                              <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                Left with Due
                              </span>
                            )}
                          </button>
                          <p className="text-xs text-slate-400">{item.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700 text-xs">
                      {item.phone}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <p className="font-bold text-slate-800">{item.enrollment.className}</p>
                      <p className="text-slate-500">{item.enrollment.subjectName}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.isEnrolled 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {item.isEnrolled ? 'Enrolled' : 'Left / Un-enrolled'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-800">
                      ₹{item.amountLeft} <span className="text-[10px] font-normal text-slate-400">/ ₹{item.enrollment.monthlyFee}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.status === 'partially_paid' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {item.status === 'partially_paid' ? `Partial (₹${item.amountPaid} Paid)` : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openQuickActionModal(item)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-all shadow-xs"
                      >
                        Update Fee Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Action Fee Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-base">Update Fee Status</h3>
            <p className="text-xs text-slate-500">
              {activeModalItem.studentName} — {activeModalItem.enrollment.className} ({activeModalItem.enrollment.subjectName})
            </p>
            <p className="text-[11px] font-bold text-indigo-600">
              Target Month: {selectedMonth}/{selectedYear}
            </p>
            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={modalForm.status}
                  onChange={(e) => setModalForm({ 
                    ...modalForm, 
                    status: e.target.value,
                    amountPaid: e.target.value === 'paid' ? activeModalItem.enrollment.monthlyFee : 0
                  })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>

              {modalForm.status === 'partially_paid' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={modalForm.amountPaid}
                    onChange={(e) => setModalForm({ ...modalForm, amountPaid: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
                    placeholder="Enter amount"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Monthly Fee: ₹{activeModalItem.enrollment.monthlyFee} | Remaining: ₹{Math.max(0, activeModalItem.enrollment.monthlyFee - Number(modalForm.amountPaid))}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remark (Optional)</label>
                <input
                  type="text"
                  value={modalForm.remark}
                  onChange={(e) => setModalForm({ ...modalForm, remark: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none"
                  placeholder="e.g. Received via UPI / Cash"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveModalItem(null)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Save Status</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
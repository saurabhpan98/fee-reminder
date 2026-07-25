// src/components/StudentRegisterTab.jsx
import React, { useMemo } from "react";
import { Icons } from "./Icons";
import { MONTHS, CURRENT_YEAR, isBeforeJoiningDate, formatPhoneNumber } from "../utils/helpers";

export function StudentRegisterTab({
  searchQuery, setSearchQuery,
  openAddStudentModal,
  selectedCoaching, setSelectedCoaching, coachings,
  selectedClass, setSelectedClass, classes,
  selectedSubject, setSelectedSubject, subjects,
  selectedMonth, setSelectedMonth,
  selectedYear, setSelectedYear,
  loading, students = [],
  setSelectedStudentForProfile, openFeeModal,
  setSelectedStudentForEnrollmentView
}) {
  // Flatten student documents into enrollment rows
  const flattenedRows = useMemo(() => {
    const rows = [];

    students.forEach((student) => {
      const nameMatch = !searchQuery.trim() || student.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!nameMatch) return;

      (student.enrollments || []).forEach((enr) => {
        if (selectedCoaching && enr.coachingId !== selectedCoaching) return;
        if (selectedClass && enr.classId !== selectedClass) return;
        if (selectedSubject && enr.subjectId !== selectedSubject) return;

        rows.push({
          rowId: `${student.id}_${enr.enrollmentId}`,
          studentDoc: student,
          enrollment: enr
        });
      });
    });

    return rows;
  }, [students, searchQuery, selectedCoaching, selectedClass, selectedSubject]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
              <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
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
            {classes.filter(cl => !selectedCoaching || cl.coachingId === selectedCoaching).map((cl) => (
              <option key={cl.id} value={cl.id}>{cl.name}</option>
            ))}
          </select>

          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
          >
            <option value="">All Subjects</option>
            {subjects.filter(sb => !selectedClass || sb.classId === selectedClass).map((sb) => (
              <option key={sb.id} value={sb.id}>{sb.name}</option>
            ))}
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

      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden transition-all duration-300">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">Loading student records...</div>
        ) : flattenedRows.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="p-3 bg-slate-100 rounded-2xl w-fit mx-auto text-slate-400">
              <Icons.Users className="w-6 h-6" />
            </div>
            <p className="text-slate-600 font-medium text-sm">No students match your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-3xs font-bold">
                <tr>
                  <th className="py-3.5 px-5">Student Details</th>
                  <th className="py-3.5 px-5">Class / Subject</th>
                  <th className="py-3.5 px-5">Enrollment</th>
                  <th className="py-3.5 px-5">Monthly Fee</th>
                  <th className="py-3.5 px-5 text-center">{selectedMonth} {selectedYear} Status</th>
                  <th className="py-3.5 px-5 text-right">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flattenedRows.map(({ rowId, studentDoc, enrollment }) => {
                  const feeKey = `${selectedYear}-${selectedMonth}`;
                  const feeData = enrollment.feeStatus?.[feeKey] || {};
                  const notJoinedYet = isBeforeJoiningDate(enrollment.joiningDate, selectedYear, selectedMonth);
                  const isLeft = enrollment.status === "left";
                  const amountPaid = feeData.amountPaid || 0;
                  const remainingDue = enrollment.monthlyFees - amountPaid;
                  const isPaidInFull = feeData.status === "paid";

                  const classObj = classes.find((cl) => cl.id === enrollment.classId);
                  const subjectObj = subjects.find((sb) => sb.id === enrollment.subjectId);

                  return (
                    <tr key={rowId} className="hover:bg-slate-50/80 transition-colors duration-150">
                      <td className="py-4 px-5">
                        <button
                          onClick={() => setSelectedStudentForProfile(studentDoc)}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-left cursor-pointer transition-colors"
                        >
                          {studentDoc.name}
                        </button>
                        <div className="flex items-center gap-3 text-2xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Icons.Phone /> {formatPhoneNumber(studentDoc.phone)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-5 text-xs">
                        <div className="font-bold text-slate-800">{subjectObj?.name || "N/A"}</div>
                        <div className="text-3xs text-slate-500 font-medium">Class: {classObj?.name || "N/A"}</div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-bold ${
                            isLeft ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isLeft ? "bg-slate-400" : "bg-emerald-500"}`}></span>
                            {isLeft ? "Left Class" : "Enrolled"}
                          </span>

                          <button
                            onClick={() => setSelectedStudentForEnrollmentView(studentDoc)}
                            className="text-3xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-2 py-0.5 rounded-full cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                            title="View All Enrolled Classes"
                          >
                            <Icons.Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-5 font-semibold text-slate-800">
                        ₹{enrollment.monthlyFees}
                      </td>

                      <td className="py-4 px-5 text-center">
                        {isLeft ? (
                          isPaidInFull ? (
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                              Left Class (Paid)
                            </span>
                          ) : (
                            <button
                              onClick={() => openFeeModal(studentDoc, enrollment)}
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
                            onClick={() => openFeeModal(studentDoc, enrollment)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 ${
                              feeData.status === "paid"
                                ? "bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200/80 border border-emerald-300/50"
                                : feeData.status === "partial"
                                ? "bg-amber-100/80 text-amber-800 hover:bg-amber-200/80 border border-amber-300/50"
                                : "bg-rose-100/80 text-rose-700 hover:bg-rose-200/80 border border-rose-300/50"
                            }`}
                          >
                            {feeData.status === "paid" && <><Icons.Check className="w-3.5 h-3.5" /> Paid</>}
                            {feeData.status === "partial" && `⚠️ Paid ₹${feeData.amountPaid} (Due ₹${enrollment.monthlyFees - feeData.amountPaid})`}
                            {(!feeData.status || feeData.status === "unpaid") && "✕ Unpaid"}
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-5 text-xs text-slate-500 italic max-w-xs truncate text-right">
                        {feeData.remark || "-"}
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
  );
}
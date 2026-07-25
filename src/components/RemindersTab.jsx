// src/components/RemindersTab.jsx
import React from "react";
import { Icons } from "./Icons";
import { MONTHS, CURRENT_YEAR, formatPhoneNumber } from "../utils/helpers";

export function RemindersTab({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  dueReminders,
  setSelectedStudentForProfile,
  openFeeModal,
  classes = [],
  subjects = []
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Unpaid / Partial Fee Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">Automated checklist of students with pending fees.</p>
        </div>

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

            // Resolve Class & Subject details
            const classObj = classes.find((cl) => cl.id === s.classId);
            const subjectObj = subjects.find((sb) => sb.id === s.subjectId);

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

                  {/* Class and Subject Tag */}
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60 text-2xs space-y-0.5">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Subject: {subjectObj?.name || "N/A"}</span>
                      <span className="text-3xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded-md">
                        Class: {classObj?.name || "N/A"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Icons.Phone /> {formatPhoneNumber(s.phone)}
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
  );
}
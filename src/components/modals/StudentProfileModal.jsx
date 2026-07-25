// src/components/modals/StudentProfileModal.jsx
import React from "react";
import { Icons } from "../Icons";
import { MONTHS, isBeforeJoiningDate, formatPhoneNumber } from "../../utils/helpers";

export function StudentProfileModal({
  selectedStudentForProfile,
  setSelectedStudentForProfile,
  selectedYear,
  openEditStudentModal,
  setStudentToDelete,
  handleToggleEnrollmentStatus
}) {
  if (!selectedStudentForProfile) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        
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
          <button 
            onClick={() => setSelectedStudentForProfile(null)} 
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Icons.Phone /> {formatPhoneNumber(selectedStudentForProfile.phone)}
            </span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Monthly Fee</span>
            <span className="font-semibold text-slate-800">₹{selectedStudentForProfile.monthlyFees}</span>
          </div>
          <div className="col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</span>
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Icons.MapPin /> {selectedStudentForProfile.address || "N/A"}
            </span>
          </div>
        </div>

        {/* Payment History Summary */}
        <div>
          <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Payment Record ({selectedYear})
          </h4>
          <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
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
  );
}
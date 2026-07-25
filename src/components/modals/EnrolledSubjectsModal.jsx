// src/components/modals/EnrolledSubjectsModal.jsx
import React from "react";
import { Icons } from "../Icons";
import { formatPhoneNumber } from "../../utils/helpers";

export function EnrolledSubjectsModal({
  selectedStudentForEnrollmentView,
  setSelectedStudentForEnrollmentView,
  classes = [],
  subjects = [],
  coachings = [],
  handleToggleEnrollmentStatus
}) {
  if (!selectedStudentForEnrollmentView) return null;

  const student = selectedStudentForEnrollmentView;
  const enrollments = student.enrollments || [];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-md w-full p-6 space-y-4 animate-scale-up">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {student.name}
            </h3>
            <p className="text-3xs text-slate-500 font-medium">
              Phone: {formatPhoneNumber(student.phone)}
            </p>
          </div>
          <button 
            onClick={() => setSelectedStudentForEnrollmentView(null)} 
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* List of enrolled classes & subjects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400">
              Classes & Subjects
            </h4>
            <span className="text-3xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {enrollments.length} {enrollments.length === 1 ? "Class" : "Classes"}
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {enrollments.map((enr) => {
              const coachingObj = coachings.find((c) => c.id === enr.coachingId);
              const classObj = classes.find((cl) => cl.id === enr.classId);
              const subjectObj = subjects.find((sb) => sb.id === enr.subjectId);

              const isLeft = enr.status === "left";

              return (
                <div 
                  key={enr.enrollmentId} 
                  className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition-all ${
                    isLeft 
                      ? "bg-slate-50/80 border-slate-200/80 text-slate-500" 
                      : "bg-indigo-50/40 border-indigo-100/80 text-slate-800"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{subjectObj?.name || "Subject N/A"}</span>
                      {subjectObj?.teacher && (
                        <span className="text-3xs text-slate-400 font-normal">
                          ({subjectObj.teacher})
                        </span>
                      )}
                    </div>
                    <div className="text-3xs text-slate-500 font-medium">
                      {coachingObj?.name || "Coaching N/A"} • Class: {classObj?.name || "Class N/A"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEnrollmentStatus(student.id, enr.enrollmentId, enr.status)}
                    className={`px-2.5 py-1 rounded-full text-3xs font-bold shrink-0 transition-all cursor-pointer ${
                      isLeft 
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    }`}
                  >
                    {isLeft ? "Re-enroll Class" : "Mark as Left"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            onClick={() => setSelectedStudentForEnrollmentView(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors duration-150"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
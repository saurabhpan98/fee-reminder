// src/pages/SubjectDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, Bookmark, Edit3, Trash2, Users, AlertTriangle, 
  ChevronRight 
} from 'lucide-react';

export const SubjectDetailsPage = ({ coachingId, classId, subjectId, onBack, onOpenStudentDetails, onOpenClassDetails }) => {
  const [classData, setClassData] = useState(null);
  const [subjectData, setSubjectData] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', teacherName: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSubjectAndStudents();
  }, [coachingId, classId, subjectId]);

  const fetchSubjectAndStudents = async () => {
    const classSnap = await getDoc(doc(db, 'coachings', coachingId, 'classes', classId));
    if (classSnap.exists()) {
      const cls = { id: classSnap.id, ...classSnap.data() };
      setClassData(cls);

      const sub = cls.subjects?.find(s => s.id === subjectId);
      if (sub) {
        setSubjectData(sub);
        setEditForm({ name: sub.name, teacherName: sub.teacherName });
      }
    }

    const studentSnap = await getDocs(query(collection(db, 'students'), where('coachingId', '==', coachingId)));
    const allStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const subjectStudents = allStudents.filter(s =>
      s.enrollments?.some(e => e.subjectId === subjectId)
    );
    setEnrolledStudents(subjectStudents);
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.teacherName.trim()) return;
    setIsProcessing(true);

    try {
      const updatedSubjects = classData.subjects.map(s => {
        if (s.id === subjectId) {
          return { ...s, name: editForm.name, teacherName: editForm.teacherName };
        }
        return s;
      });

      await updateDoc(doc(db, 'coachings', coachingId, 'classes', classId), {
        subjects: updatedSubjects
      });

      const studentSnap = await getDocs(query(collection(db, 'students'), where('coachingId', '==', coachingId)));
      const updatePromises = studentSnap.docs.map(async (studentDoc) => {
        const student = studentDoc.data();
        let updated = false;

        const updatedEnrollments = student.enrollments?.map(enr => {
          if (enr.subjectId === subjectId) {
            updated = true;
            return { ...enr, subjectName: editForm.name };
          }
          return enr;
        });

        if (updated) {
          await updateDoc(doc(db, 'students', studentDoc.id), { enrollments: updatedEnrollments });
        }
      });

      await Promise.all(updatePromises);
      setIsEditing(false);
      fetchSubjectAndStudents();
    } catch (err) {
      console.error("Error updating subject:", err);
      alert("Failed to update subject: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDeleteSubject = async () => {
    setIsProcessing(true);
    try {
      const updatedSubjects = classData.subjects.filter(s => s.id !== subjectId);
      await updateDoc(doc(db, 'coachings', coachingId, 'classes', classId), {
        subjects: updatedSubjects
      });

      const studentSnap = await getDocs(query(collection(db, 'students'), where('coachingId', '==', coachingId)));
      const updatePromises = studentSnap.docs.map(async (studentDoc) => {
        const student = studentDoc.data();
        let updated = false;

        const updatedEnrollments = student.enrollments?.map(enr => {
          if (enr.subjectId === subjectId) {
            updated = true;
            return { ...enr, status: 'unassigned' };
          }
          return enr;
        });

        if (updated) {
          await updateDoc(doc(db, 'students', studentDoc.id), { enrollments: updatedEnrollments });
        }
      });

      await Promise.all(updatePromises);
      setShowDeleteModal(false);
      onBack();
    } catch (err) {
      console.error("Error deleting subject:", err);
      alert("Failed to delete subject: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!subjectData || !classData) {
    return <div className="p-8 text-center text-slate-400 font-medium">Loading subject details...</div>;
  }

  const filteredStudents = enrolledStudents.filter(student => {
    const isEnrolled = student.enrollments?.some(e => e.subjectId === subjectId && e.status === 'active');
    const isLeft = student.enrollments?.some(e => e.subjectId === subjectId && e.status === 'unassigned');

    if (statusFilter === 'enrolled') return isEnrolled;
    if (statusFilter === 'left') return isLeft;
    return true;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const aActive = a.enrollments?.some(e => e.subjectId === subjectId && e.status === 'active');
    const bActive = b.enrollments?.some(e => e.subjectId === subjectId && e.status === 'active');

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  const activeEnrolledCount = enrolledStudents.filter(s =>
    s.enrollments?.some(e => e.subjectId === subjectId && e.status === 'active')
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="relative overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-sm space-y-6">
        {!isEditing ? (
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-2xl shadow-md shadow-indigo-100 shrink-0">
                <Bookmark className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{subjectData.name}</h1>
                <p className="text-xs text-slate-500 font-medium">
                  Instructor / Teacher: <strong className="text-slate-800">{subjectData.teacherName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Edit3 size={14} /> Edit Subject
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 font-bold text-xs rounded-xl hover:bg-rose-100 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateSubject} className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Update Subject Information</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                placeholder="Subject Name"
              />
              <input
                type="text"
                required
                value={editForm.teacherName}
                onChange={(e) => setEditForm({ ...editForm, teacherName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                placeholder="Teacher Name"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Enrolled</p>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">{activeEnrolledCount} Students</p>
            </div>
            <Users className="w-6 h-6 text-indigo-500 opacity-60" />
          </div>

          <div 
            onClick={() => onOpenClassDetails(classData.id)}
            className="group p-4 bg-indigo-50/50 hover:bg-indigo-100/60 rounded-2xl border border-indigo-100 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Attached Target Class</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5 group-hover:text-indigo-600 transition-colors">
                {classData.className}
              </p>
            </div>
            <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs">
              <span>View Class</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-slate-800 text-base">Students List</h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-400 whitespace-nowrap">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">All Students (Left at Bottom)</option>
              <option value="enrolled">Active Enrolled Only</option>
              <option value="left">Left / Un-enrolled Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-bold">Student Name</th>
                <th className="px-5 py-3 font-bold">Contact</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStudents.map((student) => {
                const enrollment = student.enrollments?.find(e => e.subjectId === subjectId);
                const isEnrolled = enrollment?.status === 'active';

                return (
                  <tr key={student.id} className={`transition-colors ${!isEnrolled ? 'bg-slate-50/60 opacity-75' : 'hover:bg-slate-50/60'}`}>
                    <td className="px-5 py-3 font-bold text-slate-800">{student.name}</td>
                    <td className="px-5 py-3 text-xs text-slate-600 font-medium">{student.phone}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isEnrolled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {isEnrolled ? '✓ Active' : 'Left'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onOpenStudentDetails(student)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50"
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
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No students match the current status filter.
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl"><AlertTriangle size={20}/></div>
              <h3 className="font-extrabold text-slate-900 text-lg">Delete Subject?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting <strong className="text-slate-900">{subjectData.name}</strong> will remove it from <strong className="text-slate-900">{classData.className}</strong>. 
              All students enrolled under this subject will have their enrollment status set to <strong className="text-rose-600">Left</strong>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowDeleteModal(false)} disabled={isProcessing} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button onClick={handleConfirmDeleteSubject} disabled={isProcessing} className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md">
                {isProcessing ? 'Updating Roster...' : 'Yes, Delete Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetailsPage;
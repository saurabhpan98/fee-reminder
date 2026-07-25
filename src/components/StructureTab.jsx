import React from "react";
import { Icons } from "./Icons";

export function StructureTab({
  handleAddCoaching, newCoachingName, setNewCoachingName, newCoachingOwner, setNewCoachingOwner, coachings,
  handleAddClass, newClassName, setNewClassName, selectedCoaching, setSelectedCoaching, classes,
  handleAddSubject, newSubjectName, setNewSubjectName, newSubjectTeacher, setNewSubjectTeacher, selectedClass, setSelectedClass, subjects,
  setStructureToEdit, setStructureToDelete
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      {/* 1. Coaching */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Icons.Building className="w-4 h-4 text-indigo-600" />
          <span>1. Tuition / Coaching</span>
        </h3>
        <form onSubmit={handleAddCoaching} className="space-y-2">
          <input 
            type="text" required placeholder="Coaching Name (e.g. Apex Academy)" value={newCoachingName}
            onChange={(e) => setNewCoachingName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
          />
          <input 
            type="text" placeholder="Owner Name (e.g. Dr. R.K. Gupta)" value={newCoachingOwner}
            onChange={(e) => setNewCoachingOwner(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
          />
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs py-2 rounded-xl font-medium cursor-pointer transition-all duration-200">
            Add Coaching
          </button>
        </form>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {coachings.map(c => (
            <li key={c.id} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl text-xs border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <div className="font-semibold text-slate-800">{c.name}</div>
                {c.owner && <div className="text-3xs text-slate-400 font-medium">Owner: {c.owner}</div>}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setStructureToEdit({ id: c.id, type: "coaching", name: c.name, owner: c.owner || "" })} 
                  className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                >
                  <Icons.Edit />
                </button>
                <button 
                  onClick={() => setStructureToDelete({ id: c.id, type: "coaching", name: c.name })} 
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                >
                  <Icons.Trash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Class Level */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Icons.Users className="w-4 h-4 text-indigo-600" />
          <span>2. Class Level</span>
        </h3>
        <select 
          value={selectedCoaching} onChange={(e) => setSelectedCoaching(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
        >
          <option value="">Select Coaching First</option>
          {coachings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <form onSubmit={handleAddClass} className="flex gap-2">
          <input 
            type="text" placeholder="e.g. 11th, 12th" value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)} disabled={!selectedCoaching}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs disabled:opacity-50 transition-all duration-200"
          />
          <button disabled={!selectedCoaching} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs px-3.5 py-2.5 rounded-xl font-medium disabled:opacity-50 cursor-pointer transition-all duration-200">Add</button>
        </form>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {classes.filter(cl => cl.coachingId === selectedCoaching).map(cl => (
            <li key={cl.id} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl text-xs font-semibold text-slate-700 border border-slate-100 hover:border-slate-200 transition-colors">
              <span>{cl.name}</span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setStructureToEdit({ id: cl.id, type: "class", name: cl.name })} 
                  className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                >
                  <Icons.Edit />
                </button>
                <button 
                  onClick={() => setStructureToDelete({ id: cl.id, type: "class", name: cl.name })} 
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                >
                  <Icons.Trash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Subjects */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Icons.GraduationCap className="w-4 h-4 text-indigo-600" />
          <span>3. Subjects</span>
        </h3>
        <select 
          value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
        >
          <option value="">Select Class Level First</option>
          {classes.filter(cl => !selectedCoaching || cl.coachingId === selectedCoaching).map(cl => (
            <option key={cl.id} value={cl.id}>{cl.name}</option>
          ))}
        </select>
        <form onSubmit={handleAddSubject} className="space-y-2">
          <input 
            type="text" required placeholder="Subject Name (e.g. Physics)" value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)} disabled={!selectedClass}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs disabled:opacity-50 transition-all duration-200"
          />
          <input 
            type="text" placeholder="Teacher Name (e.g. Prof. Verma)" value={newSubjectTeacher}
            onChange={(e) => setNewSubjectTeacher(e.target.value)} disabled={!selectedClass}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs disabled:opacity-50 transition-all duration-200"
          />
          <button disabled={!selectedClass} className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs py-2 rounded-xl font-medium disabled:opacity-50 cursor-pointer transition-all duration-200">
            Add Subject
          </button>
        </form>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {subjects.filter(sb => sb.classId === selectedClass).map(sb => (
            <li key={sb.id} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl text-xs border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <div className="font-semibold text-slate-800">{sb.name}</div>
                {sb.teacher && <div className="text-3xs text-slate-400 font-medium">Teacher: {sb.teacher}</div>}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setStructureToEdit({ id: sb.id, type: "subject", name: sb.name, teacher: sb.teacher || "" })} 
                  className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                >
                  <Icons.Edit />
                </button>
                <button 
                  onClick={() => setStructureToDelete({ id: sb.id, type: "subject", name: sb.name })} 
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                >
                  <Icons.Trash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
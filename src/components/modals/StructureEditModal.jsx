import React from "react";
import { Icons } from "../Icons";

export function StructureEditModal({ structureToEdit, setStructureToEdit, handleUpdateStructure }) {
  if (!structureToEdit) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 capitalize">
            Edit {structureToEdit.type}
          </h3>
          <button onClick={() => setStructureToEdit(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleUpdateStructure} className="space-y-3">
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {structureToEdit.type} Name
            </label>
            <input 
              type="text" required
              value={structureToEdit.name}
              onChange={(e) => setStructureToEdit({ ...structureToEdit, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          {structureToEdit.type === "coaching" && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Owner Name</label>
              <input 
                type="text"
                value={structureToEdit.owner || ""}
                onChange={(e) => setStructureToEdit({ ...structureToEdit, owner: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          )}

          {structureToEdit.type === "subject" && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Teacher Name</label>
              <input 
                type="text"
                value={structureToEdit.teacher || ""}
                onChange={(e) => setStructureToEdit({ ...structureToEdit, teacher: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button" onClick={() => setStructureToEdit(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl font-semibold cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs rounded-xl font-semibold shadow-xs cursor-pointer transition-all duration-150"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
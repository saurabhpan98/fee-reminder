import React from "react";
import { Icons } from "../Icons";

export function ConfirmDeleteStructureModal({ structureToDelete, setStructureToDelete, confirmDeleteStructure }) {
  if (!structureToDelete) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="p-3 bg-rose-100 rounded-2xl">
            <Icons.AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base capitalize">
            Delete {structureToDelete.type}?
          </h3>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          Are you sure you want to permanently delete <strong>"{structureToDelete.name}"</strong>?
        </p>

        <div className="pt-2 flex justify-end gap-2">
          <button 
            onClick={() => setStructureToDelete(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors duration-150"
          >
            Cancel
          </button>
          <button 
            onClick={confirmDeleteStructure}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-all duration-150 active:scale-95"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
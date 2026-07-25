import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Icons } from "./Icons";

export function Header({ currentUser }) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-2.5 rounded-2xl shadow-md shadow-indigo-500/20 transform transition-transform hover:rotate-6">
            <Icons.GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight">
              {currentUser.displayName || "Teacher Workspace"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">{currentUser.email}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="group flex items-center gap-2 bg-slate-100/80 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200/80 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Icons.LogOut className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
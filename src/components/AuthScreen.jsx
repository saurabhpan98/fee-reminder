import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { setDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Icons } from "./Icons";
import { getAuthErrorMessage } from "../utils/helpers";

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError("");
    setShowPassword(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (isSignUp && !name.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !password) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        try {
          await updateProfile(user, { displayName: name.trim() });
          await setDoc(doc(db, "users", user.uid), {
            displayName: name.trim(),
            email: user.email,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          await user.delete();
          throw err;
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          setAuthError("Teacher profile record not found. Please sign up.");
          return;
        }
      }
    } catch (err) {
      setAuthError(err.code ? getAuthErrorMessage(err.code) : err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 animate-scale-up">
        <div className="text-center">
          <div className="inline-flex bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-3.5 rounded-2xl shadow-md shadow-indigo-500/20 mb-3 transform transition-transform hover:rotate-6">
            <Icons.GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isSignUp ? "Teacher Portal" : "Welcome Back"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isSignUp ? "Create an account to manage tuition fees & batches" : "Sign in to access your tuition fee register"}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs rounded-2xl flex items-center gap-2 animate-fade-in">
            <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <div>{authError}</div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          )}

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl shadow-sm shadow-indigo-500/20 transition-all duration-200 cursor-pointer text-sm"
          >
            {isSignUp ? "Register Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 font-medium">
          {isSignUp ? "Already registered? " : "New teacher? "}
          <button onClick={toggleMode} className="text-indigo-600 font-bold hover:underline cursor-pointer">
            {isSignUp ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
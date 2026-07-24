// src/App.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  setDoc,
  getDoc,
  doc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc
} from "firebase/firestore"; 
import { AuthProvider, useAuth } from "./AuthContext";

// Helper function to turn Firebase error codes into clear messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "auth/invalid-credential":
      return "Incorrect email or password. Please check your credentials and try again.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access temporarily blocked. Please try again later.";
    default:
      return "An error occurred during authentication. Please try again.";
  }
};

function MainContent() {
  const { currentUser } = useAuth();
  
  // Auth state
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Notes state
  const [note, setNote] = useState("");
  const [notesList, setNotesList] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Clear auth inputs on toggle
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  // Auth Operations
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    // Client-side validations
    if (isSignUp && !name.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !password) {
      setAuthError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    try {
      if (isSignUp) {
        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        try {
          // 2. Update Firebase Auth profile
          await updateProfile(user, {
            displayName: name.trim()
          });

          // 3. Save User Profile in Firestore
          await setDoc(doc(db, "users", user.uid), {
            displayName: name.trim(),
            email: user.email,
            createdAt: serverTimestamp()
          });
        } catch (firestoreErr) {
          // Roll back: Delete the auth user if saving to Firestore fails
          await user.delete();
          throw firestoreErr;
        }

      } else {
        // 1. Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // 2. Check if user document exists in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await signOut(auth);
          setAuthError("User not found. Please sign up first.");
          return;
        }
      }
    } catch (err) {
      // Map Firebase error code to user-friendly message
      if (err.code) {
        setAuthError(getAuthErrorMessage(err.code));
      } else {
        setAuthError(err.message || "Something went wrong.");
      }
    }
  };

  const handleLogOut = () => signOut(auth);

  // Firestore Writes (Notes)
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim() || !currentUser) return;

    try {
      const notesRef = collection(db, "users", currentUser.uid, "notes");
      await addDoc(notesRef, {
        text: note,
        createdAt: serverTimestamp()
      });
      setNote("");
    } catch (err) {
      console.error("Firestore Write Error:", err);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "notes", id));
    } catch (err) {
      console.error("Firestore Delete Error:", err);
    }
  };

  // Firestore Reads (Notes)
  useEffect(() => {
    if (!currentUser) {
      setNotesList([]);
      setLoadingNotes(false);
      return;
    }

    setLoadingNotes(true);
    const notesRef = collection(db, "users", currentUser.uid, "notes");
    const q = query(notesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parsedNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotesList(parsedNotes);
      setLoadingNotes(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        
        {!currentUser ? (
          /* Authentication Screen */
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isSignUp ? "Create an Account" : "Welcome Back"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {isSignUp ? "Sign up to start saving your personal notes" : "Sign in to access your cloud workspace"}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <span>⚠️</span>
                <div>{authError}</div>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
              >
                {isSignUp ? "Sign Up" : "Log In"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button 
                onClick={toggleMode} 
                className="text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                {isSignUp ? "Log In" : "Sign Up"}
              </button>
            </div>
          </div>
        ) : (
          /* Dashboard Screen */
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="truncate pr-2">
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  {currentUser.displayName ? `Hello, ${currentUser.displayName}` : "Welcome"}
                </h3>
                <span className="text-xs font-medium text-slate-400 truncate block">{currentUser.email}</span>
              </div>
              <button 
                onClick={handleLogOut}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>

            <form onSubmit={handleAddNote} className="mb-6 flex gap-2">
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a quick note..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Add
              </button>
            </form>

            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Saved Notes</h2>
              
              {loadingNotes ? (
                <p className="text-sm text-slate-400">Loading notes...</p>
              ) : notesList.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No notes found. Create your first one above!</p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notesList.map((item) => (
                    <li 
                      key={item.id} 
                      className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center text-sm shadow-2xs hover:border-slate-300 transition-all"
                    >
                      <span className="text-slate-700 break-all pr-2">{item.text}</span>
                      <button 
                        onClick={() => handleDeleteNote(item.id)}
                        className="text-slate-400 hover:text-red-600 text-xs transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
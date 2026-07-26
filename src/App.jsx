// src/App.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { AuthPage } from './pages/AuthPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AddStudentPage } from './pages/AddStudentPage';
import { StudentDetailsPage } from './pages/StudentDetailsPage';
import { ClassDetailsPage } from './pages/ClassDetailsPage';
import SubjectDetailsPage from './pages/SubjectDetailsPage';
import { CoachingView } from './components/coaching/CoachingView';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';

import { LogOut, Shield, BookOpen, User, ChevronRight, Home, ArrowLeft } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stack-based router history with preserved individual screen states
  const [navigationHistory, setNavigationHistory] = useState([
    { screen: 'dashboard', state: {} }
  ]);

  const currentNav = navigationHistory[navigationHistory.length - 1] || { screen: 'dashboard', state: {} };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    setNavigationHistory([{ screen: 'dashboard', state: {} }]);
  };

  // Push new screen state into history
  const navigateTo = (screen, state = {}) => {
    setNavigationHistory(prev => [...prev, { screen, state }]);
  };

  // Update current screen state in-place
  const updateCurrentState = (newState) => {
    setNavigationHistory(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      updated[lastIndex] = {
        ...updated[lastIndex],
        state: { ...updated[lastIndex].state, ...newState }
      };
      return updated;
    });
  };

  // Step-by-step Go Back handler
  const goBack = () => {
    if (navigationHistory.length > 1) {
      setNavigationHistory(prev => prev.slice(0, -1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium text-sm">
        Loading TuitionManager...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={(data) => setUserData(data)} />;
  }

  if (userData?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="text-indigo-600" size={20} />
            <span className="font-bold text-slate-800">Admin Control Panel</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:underline font-medium">
            <LogOut size={14} /> Sign Out
          </button>
        </header>
        <AdminDashboard />
      </div>
    );
  }

  const selectedCoaching = currentNav.state?.coaching;
  const selectedStudent = currentNav.state?.student;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div 
            onClick={() => setNavigationHistory([{ screen: 'dashboard', state: {} }])} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-100">
              <BookOpen size={18} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">TuitionManager</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <User size={14} />
              <span className="font-medium">{userData?.name || currentUser.email}</span>
            </div>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-600 transition-colors p-1" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Header with Universal Go Back */}
      <div className="bg-white border-b border-slate-100 py-2.5 shadow-xs sticky top-[57px] z-30">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {navigationHistory.length > 1 && (
              <button
                onClick={goBack}
                className="mr-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            <button 
              onClick={() => setNavigationHistory([{ screen: 'dashboard', state: {} }])}
              className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
            >
              <Home size={14} /> Dashboard
            </button>

            {selectedCoaching && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className={currentNav.screen === 'coaching' ? 'text-indigo-600 font-bold' : ''}>
                  {selectedCoaching.name}
                </span>
              </>
            )}

            {currentNav.screen === 'classDetails' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Class Details</span>
              </>
            )}

            {currentNav.screen === 'subjectDetails' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Subject Details</span>
              </>
            )}

            {currentNav.screen === 'addStudent' && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">Add Student</span>
              </>
            )}

            {currentNav.screen === 'studentDetails' && selectedStudent && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-indigo-600 font-bold">{selectedStudent.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Router Screen Rendering */}
      <main className="p-6">
        {currentNav.screen === 'dashboard' && (
          <TeacherDashboard 
            userId={currentUser.uid} 
            onSelectCoaching={(coaching) => {
              navigateTo('coaching', { 
                coaching, 
                selectedClassId: '', 
                selectedSubjectId: '', 
                activeTab: 'roster'
              });
            }} 
          />
        )}

        {currentNav.screen === 'coaching' && selectedCoaching && (
          <CoachingView 
            coaching={selectedCoaching} 
            initialState={currentNav.state}
            onUpdateState={updateCurrentState}
            onOpenAddStudent={() => navigateTo('addStudent', { coaching: selectedCoaching })}
            onOpenClassDetails={(classId) => navigateTo('classDetails', { coaching: selectedCoaching, classId })}
            onOpenSubjectDetails={({ classId, subjectId }) => navigateTo('subjectDetails', { coaching: selectedCoaching, classId, subjectId })}
            onOpenStudentDetails={(student) => navigateTo('studentDetails', { coaching: selectedCoaching, student })}
            onGoBack={goBack}
          />
        )}

        {currentNav.screen === 'classDetails' && selectedCoaching && (
          <ClassDetailsPage
            coachingId={selectedCoaching.id}
            classId={currentNav.state.classId}
            onBack={goBack}
            onOpenStudentDetails={(student) => navigateTo('studentDetails', { coaching: selectedCoaching, student })}
            onOpenSubjectDetails={({ classId, subjectId }) => navigateTo('subjectDetails', { coaching: selectedCoaching, classId, subjectId })}
          />
        )}

        {currentNav.screen === 'subjectDetails' && selectedCoaching && (
          <SubjectDetailsPage
            coachingId={selectedCoaching.id}
            classId={currentNav.state.classId}
            subjectId={currentNav.state.subjectId}
            onBack={goBack}
            onOpenStudentDetails={(student) => navigateTo('studentDetails', { coaching: selectedCoaching, student })}
            onOpenClassDetails={(classId) => navigateTo('classDetails', { coaching: selectedCoaching, classId })}
          />
        )}

        {currentNav.screen === 'addStudent' && selectedCoaching && (
          <AddStudentPage 
            coachingId={selectedCoaching.id}
            classes={selectedCoaching.classes || []}
            onComplete={goBack}
            onCancel={goBack}
            onGoBack={goBack}
          />
        )}

        {currentNav.screen === 'studentDetails' && selectedStudent && (
          <StudentDetailsPage 
            studentId={selectedStudent.id} 
            onBack={goBack} 
          />
        )}
      </main>
    </div>
  );
}
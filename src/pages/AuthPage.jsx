// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { PasswordInput } from '../components/common/PasswordInput';
import { ForgotPasswordModal } from '../components/common/ForgotPasswordModal';
import { BookOpen } from 'lucide-react';

export const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));

        if (!userDoc.exists()) {
          setError('User not found');
          setLoading(false);
          return;
        }

        onAuthSuccess(userDoc.data());
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        
        const role = formData.email.toLowerCase() === 'saurabh@gmail.com' ? 'admin' : 'teacher';
        
        const userData = {
          uid: userCred.user.uid,
          name: formData.name,
          email: formData.email,
          role,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        onAuthSuccess(userData);
      }
    } catch (err) {
      // Precise Error Handling for Login
      if (err.code === 'auth/user-not-found') {
        setError('User not found');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-8 transition-all">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-200">
            <BookOpen size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">TuitionManager</h1>
          <p className="text-slate-500 text-sm mt-1">Smart fee tracking for coaching centers</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Saurabh Sharma"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@domain.com"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Password</label>
              
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <PasswordInput value={formData.password} onChange={handleChange} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
};
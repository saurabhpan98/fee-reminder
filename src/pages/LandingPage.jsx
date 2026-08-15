// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, Shield, Sparkles, MessageSquare, 
  CreditCard, ArrowRight, Menu, X, Users, Zap, Award, 
  ChevronRight, Mail, Phone, MapPin, Send, Lock, Bell, 
  Star, ChevronLeft, Quote, HelpCircle, ChevronDown, ShieldCheck, QrCode
} from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: 'Rajesh Verma',
    role: 'Owner & Educator',
    coaching: 'Verma Physics Academy, Delhi',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    rating: 5,
    review: 'TuitionManager transformed how we collect monthly fees. The automated WhatsApp reminders and instant Dynamic UPI QR codes recovered over 90% of our pending dues within days!'
  },
  {
    id: 2,
    name: 'Priya Sharma',
    role: 'Senior Math Faculty',
    coaching: 'Apex Tutorials, Jaipur',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    rating: 5,
    review: 'The multi-teacher role management is brilliant. Our subject teachers update their own batch fees without accessing full institute financials.'
  },
  {
    id: 3,
    name: 'Amit Patel',
    role: 'Founder',
    coaching: 'Patel Commerce Classes, Ahmedabad',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    rating: 5,
    review: 'The Parent Self-Service portal eliminated 80% of teacher calls asking for fee receipts. Parents simply enter their phone number and download PDF receipts!'
  },
  {
    id: 4,
    name: 'Sneha Kulkarni',
    role: 'Coaching Administrator',
    coaching: 'Excellence Scholars, Pune',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    rating: 5,
    review: 'Generating formal single-month and range date PDF receipts with verified stamps has given our institute a very professional identity.'
  }
];

const FAQS = [
  {
    id: 1,
    question: 'How do parents download fee receipts without an account?',
    answer: 'TuitionManager offers a dedicated Parent Portal. Parents just enter their registered mobile number to see all active subject enrollments, balance dues, and 1-click download verified PDF payment receipts.'
  },
  {
    id: 2,
    question: 'How does the Dynamic UPI QR Code work on fee receipts?',
    answer: 'Whenever an overdue or pending fee receipt/reminder is generated, our system automatically embeds a personalized UPI QR code containing the exact remaining balance. Parents can scan it with GPay, PhonePe, or Paytm without typing the amount or UPI ID.'
  },
  {
    id: 3,
    question: 'Can coaching owners create sub-accounts for subject teachers?',
    answer: 'Yes! Institute owners can create dedicated staff teacher logins. Teachers can view their assigned class rosters, update student fee payments, but cannot see sensitive coaching-wide financial revenue analytics.'
  },
  {
    id: 4,
    question: 'What happens when a student is enrolled in multiple subjects or has siblings?',
    answer: 'Our smart phone-number matching automatically groups sibling registrations or multi-subject enrollments together without creating duplicate student records.'
  },
  {
    id: 5,
    question: 'Is student and payment data secure?',
    answer: 'Absolutely. All sensitive account communications and direct administrator messages are protected with end-to-end AES encryption, and your database is hosted on secure cloud infrastructure.'
  }
];

export const LandingPage = ({ onGetStarted, onLogin, onOpenParentPortal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [openFaqId, setOpenFaqId] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let interval = null;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentReviewIndex((prevIndex) => (prevIndex + 1) % REVIEWS.length);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying]);

  const handlePrevReview = () => {
    setIsAutoPlaying(false);
    setCurrentReviewIndex((prevIndex) => (prevIndex - 1 + REVIEWS.length) % REVIEWS.length);
  };

  const handleNextReview = () => {
    setIsAutoPlaying(false);
    setCurrentReviewIndex((prevIndex) => (prevIndex + 1) % REVIEWS.length);
  };

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitted(true);
    setContactForm({ name: '', email: '', message: '' });
    setTimeout(() => setContactSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Top Dynamic Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/60 shadow-xs py-3' 
          : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-200">
              <BookOpen size={22} />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">TuitionManager</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-indigo-600 transition-colors">About</a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <a href="#reviews" className="hover:text-indigo-600 transition-colors">Reviews</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-indigo-600 transition-colors">Contact</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {/*<button 
              onClick={onOpenParentPortal}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck size={15} /> Parent Portal
            </button>*/}
            <button 
              onClick={onLogin}
              className="px-4 py-2 rounded-xl font-bold text-xs text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-all"
            >
              Sign In
            </button>
            <button 
              onClick={onGetStarted}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all"
            >
              Get Started Free
            </button>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-slate-200 px-6 py-6 space-y-4 shadow-xl animate-in slide-in-from-top duration-200">
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-slate-700 hover:text-indigo-600">About</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-slate-700 hover:text-indigo-600">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-slate-700 hover:text-indigo-600">Pricing</a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-slate-700 hover:text-indigo-600">Reviews</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-slate-700 hover:text-indigo-600">FAQ</a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              {/*<button 
                onClick={() => { setMobileMenuOpen(false); onOpenParentPortal(); }}
                className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={16} /> Parent Fee Portal
              </button>*/}
              <button 
                onClick={() => { setMobileMenuOpen(false); onLogin(); }}
                className="w-full py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -mt-20 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-200/50 via-purple-200/40 to-pink-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold animate-bounce shadow-xs">
            <Sparkles size={14} /> Smart Fee & Coaching Management Ecosystem
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Simplify Fee Tracking & Faculty Management for Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Coaching Center</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Dynamic UPI QR receipts, multi-teacher subject staff controls, automated WhatsApp fee payloads, and instant self-service parent portals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight size={16} />
            </button>
            {/*<button 
              onClick={onOpenParentPortal}
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} /> Parent Portal Link
            </button>*/}
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><QrCode size={16} className="text-indigo-500" /> Dynamic UPI QR Receipts</span>
            <span className="flex items-center gap-1.5"><Users size={16} className="text-amber-500" /> Multi-Teacher Staff Roles</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-emerald-500" /> Parent Self-Service View</span>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                <Award size={14} /> Purpose Built For Educators
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Stop Chasing Payments & Managing Complex Registers
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                From tracking partial fee balances to creating teacher sub-accounts and sharing dynamic UPI payment QR codes, TuitionManager automates the operational friction of coaching institutes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <CheckCircle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Dynamic Scan & Pay QR</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Auto-calculates exact balance due.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <CheckCircle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Staff Teacher Isolation</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Restricted views for subject teachers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-6 border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Fee Receipt & QR Engine</span>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold">Ready</span>
                </div>
                <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/60 space-y-2 text-xs">
                  <p className="text-slate-300">Class: <strong>12th Science (Physics)</strong></p>
                  <p className="text-slate-300">Remaining Balance: <strong className="text-rose-400">₹1,500</strong></p>
                  <div className="pt-2 flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-900">
                      <QrCode size={30} />
                    </div>
                    <p className="text-[11px] text-slate-400">Scan & Pay QR auto-embedded into official PDF & WhatsApp reminder payload.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Feature Rich Workspace</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Everything You Need In One Place</h2>
            <p className="text-slate-600 text-sm font-medium">Built for single teachers, subject faculties, and expanding academy networks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <QrCode size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Dynamic UPI QR Codes</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Receipts and WhatsApp reminders automatically generate custom UPI scan-and-pay QR codes with exact balance amounts.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Staff Teacher Management</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Coaching owners can create IDs for subject teachers to update their class rosters without giving access to overall institute revenues.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Parent Self-Service Portal</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Lightweight public search where parents enter their mobile number to check dues and download official PDF receipts.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <MessageSquare size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">WhatsApp Fee Payloads</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Send 1-click WhatsApp breakdown messages to students and parents with complete fee details and UPI payment links.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <CreditCard size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Payment Verification System</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Subscription and custom fee payments are verified with audit trails, approval threads, and real-time status sync.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Encrypted Direct Chat</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                Client-side AES encrypted communication channel between coaching admins and platform system support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Simple & Transparent</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Flexible Plans For Every Institute</h2>
            <p className="text-slate-600 text-sm font-medium">Choose what best suits your student capacity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-extrabold text-lg text-slate-900">Starter Teacher</h3>
                <p className="text-xs text-slate-500 font-medium">Ideal for independent tutors and small batches.</p>
                <div className="text-3xl font-black text-slate-900">Free <span className="text-xs text-slate-400 font-normal">/ forever</span></div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> Up to 50 Active Students</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> 1 Coaching Center</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> Single Month PDF Receipts</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> Parent Portal Access</li>
                </ul>
              </div>
              <button 
                onClick={onGetStarted}
                className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-all"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 bg-slate-900 text-white rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6 relative shadow-2xl scale-105">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                Most Popular
              </div>
              <div className="space-y-4">
                <h3 className="font-extrabold text-lg">Pro Academy</h3>
                <p className="text-xs text-slate-400 font-medium">For growing coaching institutes and multi-subject staff.</p>
                <div className="text-3xl font-black">₹1,200 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-400" /> Unlimited Enrolled Students</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-400" /> Up to 5 Coaching Centers</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-400" /> Multi-Teacher Staff Sub-Accounts</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-400" /> Dynamic UPI QR Code Receipts</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-400" /> 1-Click WhatsApp Payload Reminders</li>
                </ul>
              </div>
              <button 
                onClick={onGetStarted}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition-all"
              >
                Start Pro Academy
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-extrabold text-lg text-slate-900">Custom Network</h3>
                <p className="text-xs text-slate-500 font-medium">For large educational institutes and multi-branch schools.</p>
                <div className="text-3xl font-black text-slate-900">Custom</div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> Unlimited Centers & Staff Accounts</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> Dedicated Account Manager</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-600" /> Custom Domain Integration</li>
                </ul>
              </div>
              <a 
                href="#contact"
                className="w-full py-3 text-center bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Carousel */}
      <section id="reviews" className="py-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Trusted By Educators</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">What Teachers & Owners Say</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl relative overflow-hidden">
              <Quote size={80} className="absolute -top-4 -right-4 text-indigo-50/60 pointer-events-none" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: REVIEWS[currentReviewIndex].rating }).map((_, i) => (
                    <Star key={i} size={18} fill="currentColor" />
                  ))}
                </div>
                <p className="text-slate-700 text-base sm:text-lg font-medium leading-relaxed italic">
                  "{REVIEWS[currentReviewIndex].review}"
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <img 
                    src={REVIEWS[currentReviewIndex].image} 
                    alt={REVIEWS[currentReviewIndex].name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shadow-xs"
                  />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{REVIEWS[currentReviewIndex].name}</h4>
                    <p className="text-xs text-indigo-600 font-bold">{REVIEWS[currentReviewIndex].role}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{REVIEWS[currentReviewIndex].coaching}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6">
              <div className="flex gap-2">
                <button 
                  onClick={handlePrevReview}
                  className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-xs"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={handleNextReview}
                  className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-xs"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {REVIEWS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setCurrentReviewIndex(index);
                    }}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      currentReviewIndex === index ? 'w-8 bg-indigo-600' : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <HelpCircle size={15} /> Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div 
                  key={faq.id}
                  className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isOpen 
                      ? 'bg-gradient-to-r from-indigo-50/40 via-white to-slate-50/50 border-indigo-200 shadow-md' 
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  >
                    <span className={`font-extrabold text-sm sm:text-base transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-900'}`}>
                      {faq.question}
                    </span>
                    <div className={`p-2 rounded-2xl transition-all duration-300 shrink-0 ${
                      isOpen ? 'bg-indigo-600 text-white rotate-180 shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200'
                    }`}>
                      <ChevronDown size={18} />
                    </div>
                  </button>
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100 pb-6 px-6' : 'grid-rows-[0fr] opacity-0 pb-0 px-6'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Get In Touch</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Have Questions? We're Here to Help</h2>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Whether you need assistance configuring UPI payments, adding staff teachers, or custom enterprise requirements, our team is ready to help.
              </p>
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Email Us</p>
                    <p className="text-sm font-extrabold text-slate-800">support@tuitionmanager.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Support Helpline</p>
                    <p className="text-sm font-extrabold text-slate-800">+91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Location</p>
                    <p className="text-sm font-extrabold text-slate-800">Tech Park, New Delhi, India</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200/70 shadow-xl space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900">Send Us a Message</h3>
              {contactSubmitted && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle size={16} /> Thank you! Your message has been sent successfully.
                </div>
              )}
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Your Name</label>
                  <input 
                    type="text" 
                    required 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Saurabh Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Message</label>
                  <textarea 
                    rows="4" 
                    required 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="How can we help your coaching center?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                <BookOpen size={18} />
              </div>
              <span className="font-extrabold text-lg tracking-tight">TuitionManager</span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-slate-400 font-semibold">
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="flex gap-3">
              {/*<button 
                onClick={onOpenParentPortal}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                Parent Portal
              </button>*/}
              <button 
                onClick={onLogin}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 font-medium">
            © {new Date().getFullYear()} TuitionManager System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
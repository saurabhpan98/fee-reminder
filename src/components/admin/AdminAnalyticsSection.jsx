// src/components/admin/AdminAnalyticsSection.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  BarChart3, Users, Sparkles, Building2, 
  TrendingUp, Calendar, CheckCircle2, Clock, XCircle, Download, DollarSign
} from 'lucide-react';
import { PLANS, PLAN_CONFIG } from '../../utils/planUtils';
import { downloadAdminPlatformReportPDF } from '../../utils/exportUtils';

export const AdminAnalyticsSection = ({ users = [] }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);
  const [allCoachings, setAllCoachings] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    fetchSystemAnalytics();
  }, [selectedMonth, selectedYear]);

  const fetchSystemAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch All Payment Submissions
      const paySnap = await getDocs(collection(db, 'payments'));
      const payList = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllPayments(payList);

      // 2. Fetch All Registered Coachings
      const coachingSnap = await getDocs(collection(db, 'coachings'));
      setAllCoachings(coachingSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Fetch All Students across all Institutes
      const studentSnap = await getDocs(collection(db, 'students'));
      setAllStudents(studentSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Error fetching admin analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter payments for selected month & year
  const currentMonthPayments = allPayments.filter(
    p => Number(p.month) === Number(selectedMonth) && Number(p.year) === Number(selectedYear)
  );

  const acceptedPayments = currentMonthPayments.filter(p => p.status === 'accepted');
  const pendingPayments = currentMonthPayments.filter(p => p.status === 'pending');

  const totalCollectedRevenue = acceptedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPendingRevenue = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // User Stats Breakdown (Excluding deleted accounts)
  const nonDeletedUsers = users.filter(u => u.status !== 'deleted');
  const proUsers = nonDeletedUsers.filter(u => u.plan === PLANS.PRO);
  const starterUsers = nonDeletedUsers.filter(u => !u.plan || u.plan === PLANS.STARTER);
  const activeUsers = users.filter(u => (u.status || 'active') === 'active');
  const stoppedUsers = users.filter(u => u.status === 'stopped');
  const deletedUsers = users.filter(u => u.status === 'deleted');

  // Total Expected Revenue Calculation (Pro Users * ₹1,200)
  const proPlanPrice = PLAN_CONFIG[PLANS.PRO]?.price || 1200;
  const totalExpectedRevenue = proUsers.length * proPlanPrice;

  // 6-Month Platform Revenue Trend
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();

    const mTotal = allPayments
      .filter(p => Number(p.month) === m && Number(p.year) === y && p.status === 'accepted')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    trendData.push({
      monthName: d.toLocaleString('default', { month: 'short' }),
      year: y,
      collected: mTotal
    });
  }

  const maxTrendCollected = Math.max(...trendData.map(t => t.collected), 1);

  // Download PDF Handler with TuitionManager Seal
  const handleDownloadReport = () => {
    const proPercent = users.length > 0 ? Math.round((proUsers.length / users.length) * 100) : 0;

    downloadAdminPlatformReportPDF({
      month: selectedMonth,
      year: selectedYear,
      metrics: {
        totalExpectedRevenue,
        totalCollectedRevenue,
        totalPendingRevenue,
        acceptedCount: acceptedPayments.length,
        pendingCount: pendingPayments.length,
        proUsersCount: proUsers.length,
        starterUsersCount: starterUsers.length,
        activeUsersCount: activeUsers.length,
        stoppedUsersCount: stoppedUsers.length,
        deletedUsersCount: deletedUsers.length,
        totalCoachings: allCoachings.length,
        totalStudents: allStudents.length,
        proPlanPrice,
        proPercent
      },
      paymentsList: currentMonthPayments
    });
  };

  if (loading) {
    return (
      <div className="py-12 bg-white rounded-3xl border border-slate-200/70 text-center space-y-3 shadow-xs">
        <Sparkles className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Calculating system-wide platform metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filter Header with Download Report Button */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Platform Revenue & System Performance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Download Revenue & System Analysis PDF"
          >
            <Download size={15} />
            <span>Download Report</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <Calendar size={14} className="text-indigo-600 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-2"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-2"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top System Key Stat Cards with Hover Lift Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Expected Revenue */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default space-y-2 group">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Expected Revenue</span>
            <div className="p-2 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 rounded-xl transition-colors">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹ {totalExpectedRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-indigo-600 font-bold">{proUsers.length} Pro Users × ₹{proPlanPrice}</p>
        </div>

        {/* Card 2: Accepted Revenue */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default space-y-2 group">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Accepted Revenue</span>
            <div className="p-2 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 rounded-xl transition-colors">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">₹ {totalCollectedRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">{acceptedPayments.length} approved payments</p>
        </div>

        {/* Card 3: Pending Review */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default space-y-2 group">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Pending Review</span>
            <div className="p-2 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white text-amber-600 rounded-xl transition-colors">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">₹ {totalPendingRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">{pendingPayments.length} pending requests</p>
        </div>

        {/* Card 4: Platform Hierarchy */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default space-y-2 group">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Platform Hierarchy</span>
            <div className="p-2 bg-violet-50 group-hover:bg-violet-600 group-hover:text-white text-violet-600 rounded-xl transition-colors">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{users.length} Users</p>
          <p className="text-[11px] text-slate-400 font-medium">{allCoachings.length} Coachings • {allStudents.length} Students</p>
        </div>

      </div>

      {/* Grid: 6-Month Platform Revenue Trend + User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" /> Platform Revenue Growth Trend
              </h4>
              <p className="text-xs text-slate-400">Accepted subscription & custom payments over 6 months</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase rounded-full">
              Historical Graph
            </span>
          </div>

          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-slate-200/80">
              {trendData.map((item, idx) => {
                const heightPercent = maxTrendCollected > 0 ? Math.max(10, Math.round((item.collected / maxTrendCollected) * 100)) : 10;
                const isCurrent = idx === trendData.length - 1;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg absolute -top-8 whitespace-nowrap pointer-events-none shadow-md">
                      ₹ {item.collected.toLocaleString('en-IN')}
                    </div>
                    <div className="w-full max-w-[40px] bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-full">
                      <div 
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isCurrent 
                            ? 'bg-gradient-to-t from-indigo-600 to-violet-500 shadow-md' 
                            : 'bg-indigo-200 group-hover:bg-indigo-400'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-extrabold ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {item.monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Users size={16} className="text-indigo-600" /> User Tier & Status Ratios
            </h4>
            <p className="text-xs text-slate-400">Real-time breakdown of user accounts</p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" /> Pro Academy Users (₹{proPlanPrice}/mo)
              </span>
              <span className="font-black text-indigo-700">{proUsers.length}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Users size={14} className="text-slate-500" /> Starter Free Users
              </span>
              <span className="font-black text-slate-700">{starterUsers.length}</span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Active Accounts
              </span>
              <span className="font-black text-emerald-700">{activeUsers.length}</span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600" /> Paused Accounts
              </span>
              <span className="font-black text-amber-700">{stoppedUsers.length}</span>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-extrabold text-rose-900 flex items-center gap-1.5">
                <XCircle size={14} className="text-rose-600" /> Terminated Accounts
              </span>
              <span className="font-black text-rose-700">{deletedUsers.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
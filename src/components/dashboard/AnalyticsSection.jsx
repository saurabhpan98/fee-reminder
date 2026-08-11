// src/components/dashboard/AnalyticsSection.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  TrendingUp, DollarSign, PieChart, BarChart3, Users, 
  CheckCircle2, Clock, AlertCircle, Building2, Calendar, 
  ArrowUpRight, Sparkles 
} from 'lucide-react';

export const AnalyticsSection = ({ userId, coachings, userData, onOpenUpgradeModal }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [userId, coachings, selectedMonth, selectedYear]);

  const fetchAnalyticsData = async () => {
    if (!coachings || coachings.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const coachingIds = coachings.map(c => c.id);

      // 1. Fetch Students across all user coachings
      const studentSnap = await getDocs(query(collection(db, 'students'), where('coachingId', 'in', coachingIds)));
      const studentList = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(studentList);

      // 2. Fetch Fee Records for selected month & year
      const feeSnap = await getDocs(
        query(
          collection(db, 'feeRecords'),
          where('year', '==', Number(selectedYear)),
          where('month', '==', Number(selectedMonth))
        )
      );
      const records = feeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeeRecords(records);

      // 3. Fetch 6 Months Historical Collection Trend Data
      const trendList = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        const tFeeSnap = await getDocs(
          query(collection(db, 'feeRecords'), where('year', '==', y), where('month', '==', m))
        );
        
        let mCollected = 0;
        tFeeSnap.docs.forEach(docSnap => {
          const rec = docSnap.data();
          if (coachingIds.includes(rec.coachingId)) {
            mCollected += Number(rec.amountPaid || 0);
          }
        });

        trendList.push({
          monthName: d.toLocaleString('default', { month: 'short' }),
          year: y,
          collected: mCollected
        });
      }
      setTrendData(trendList);

    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const feeMap = new Map();
  feeRecords.forEach(r => {
    feeMap.set(`${r.studentId}_${r.enrollmentId}`, r);
  });

  let totalExpectedFee = 0;
  let totalCollectedFee = 0;
  let totalPaidEnrollments = 0;
  let totalPartialEnrollments = 0;
  let totalUnpaidEnrollments = 0;

  const coachingBreakdown = coachings.map(coaching => {
    const coachingStudents = students.filter(s => s.coachingId === coaching.id);
    let cExpected = 0;
    let cCollected = 0;
    let cEnrolledCount = 0;

    coachingStudents.forEach(student => {
      student.enrollments?.forEach(enr => {
        if (enr.status === 'active') {
          cEnrolledCount++;
          const fee = Number(enr.monthlyFee || 0);
          cExpected += fee;
          totalExpectedFee += fee;

          const rec = feeMap.get(`${student.id}_${enr.enrollmentId}`);
          if (rec) {
            const paid = Number(rec.amountPaid || 0);
            cCollected += paid;
            totalCollectedFee += paid;

            if (rec.status === 'paid') {
              totalPaidEnrollments++;
            } else if (rec.status === 'partially_paid') {
              totalPartialEnrollments++;
            } else {
              totalUnpaidEnrollments++;
            }
          } else {
            totalUnpaidEnrollments++;
          }
        }
      });
    });

    const cPending = Math.max(0, cExpected - cCollected);
    const cEfficiency = cExpected > 0 ? Math.round((cCollected / cExpected) * 100) : 0;

    return {
      id: coaching.id,
      name: coaching.name,
      expected: cExpected,
      collected: cCollected,
      pending: cPending,
      efficiency: cEfficiency,
      enrolledCount: cEnrolledCount
    };
  });

  const totalPendingFee = Math.max(0, totalExpectedFee - totalCollectedFee);
  const overallEfficiency = totalExpectedFee > 0 ? Math.round((totalCollectedFee / totalExpectedFee) * 100) : 0;
  const totalActiveEnrollments = totalPaidEnrollments + totalPartialEnrollments + totalUnpaidEnrollments;

  const maxTrendCollected = Math.max(...trendData.map(t => t.collected), 1);

  if (loading) {
    return (
      <div className="py-12 bg-white rounded-3xl border border-slate-100 text-center space-y-3">
        <Sparkles className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Calculating financial metrics & growth analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Month & Year Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Revenue & Collection Analytics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Financial performance summary for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
          </p>
        </div>

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

      {/* Top Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Expected Revenue */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Expected Revenue</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹ {totalExpectedFee.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">From {totalActiveEnrollments} active enrollments</p>
        </div>

        {/* Stat 2: Total Fee Collected */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Collected Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">₹ {totalCollectedFee.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
            <ArrowUpRight size={14} />
            <span>{overallEfficiency}% collected</span>
          </div>
        </div>

        {/* Stat 3: Pending Dues */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Pending Dues</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">₹ {totalPendingFee.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">{totalUnpaidEnrollments + totalPartialEnrollments} pending payments</p>
        </div>

        {/* Stat 4: Collection Efficiency */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Collection Efficiency</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{overallEfficiency}%</p>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                overallEfficiency >= 80 ? 'bg-emerald-500' : overallEfficiency >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, overallEfficiency)}%` }}
            />
          </div>
        </div>

      </div>

      {/* Grid: 6-Month Trend SVG Chart & Payment Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 6-Month Collection Trend Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" /> 6-Month Collection Growth Trend
              </h4>
              <p className="text-xs text-slate-400">Total fees collected per month across all coaching centers</p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase rounded-full border border-indigo-100">
              Historical Graph
            </span>
          </div>

          {/* SVG Pure Bar Graph */}
          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-slate-200/80">
              {trendData.map((item, idx) => {
                const heightPercent = maxTrendCollected > 0 ? Math.max(10, Math.round((item.collected / maxTrendCollected) * 100)) : 10;
                const isCurrent = idx === trendData.length - 1;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    {/* Tooltip Hover Value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg absolute -top-8 whitespace-nowrap pointer-events-none shadow-md">
                      ₹ {item.collected.toLocaleString('en-IN')}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[40px] bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-full">
                      <div 
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isCurrent 
                            ? 'bg-gradient-to-t from-indigo-600 to-violet-500 shadow-md shadow-indigo-200' 
                            : 'bg-indigo-200 group-hover:bg-indigo-400'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Label */}
                    <span className={`text-[10px] font-extrabold ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {item.monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payment Status Distribution Breakdown (1 Col) */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <PieChart size={16} className="text-indigo-600" /> Enrollment Status Distribution
            </h4>
            <p className="text-xs text-slate-400">Status ratio for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'short' })} {selectedYear}</p>
          </div>

          <div className="space-y-3 pt-1">
            
            {/* Fully Paid */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs font-extrabold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Fully Paid
                </span>
                <span>{totalPaidEnrollments} Students</span>
              </div>
              <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalActiveEnrollments > 0 ? (totalPaidEnrollments / totalActiveEnrollments) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Partially Paid */}
            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs font-extrabold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-600" /> Partially Paid
                </span>
                <span>{totalPartialEnrollments} Students</span>
              </div>
              <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalActiveEnrollments > 0 ? (totalPartialEnrollments / totalActiveEnrollments) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Unpaid */}
            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs font-extrabold text-rose-900">
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-600" /> Completely Unpaid
                </span>
                <span>{totalUnpaidEnrollments} Students</span>
              </div>
              <div className="w-full bg-rose-200/60 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalActiveEnrollments > 0 ? (totalUnpaidEnrollments / totalActiveEnrollments) * 100 : 0}%` }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Multi-Coaching Center Performance Table */}
      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" /> Coaching Center Performance
            </h4>
            <p className="text-xs text-slate-400">Revenue breakdown per coaching institute</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            {coachings.length} Active Center(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-bold">Coaching Name</th>
                <th className="px-4 py-3 font-bold">Students Enrolled</th>
                <th className="px-4 py-3 font-bold">Expected Revenue</th>
                <th className="px-4 py-3 font-bold">Collected</th>
                <th className="px-4 py-3 font-bold">Pending Dues</th>
                <th className="px-4 py-3 font-bold">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {coachingBreakdown.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800">{c.name}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-bold">{c.enrolledCount} Active</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">₹ {c.expected.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5 font-extrabold text-emerald-600">₹ {c.collected.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5 font-extrabold text-rose-600">₹ {c.pending.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${c.efficiency >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, c.efficiency)}%` }}
                        />
                      </div>
                      <span className="font-extrabold text-slate-700">{c.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
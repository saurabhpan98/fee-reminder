// src/components/dashboard/AnalyticsSection.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Users, 
  CheckCircle2, Clock, AlertCircle, Building2, Calendar, 
  ArrowUpRight, Sparkles, Receipt, Wallet
} from 'lucide-react';

export const AnalyticsSection = ({ userId, coachings, userData, onOpenUpgradeModal }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
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

      // 1. Fetch Students across user coachings
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

      // 3. Fetch Expenses for selected month & year
      const expSnap = await getDocs(
        query(
          collection(db, 'expenses'),
          where('coachingId', 'in', coachingIds),
          where('year', '==', Number(selectedYear)),
          where('month', '==', Number(selectedMonth))
        )
      );
      const expList = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExpenses(expList);

      // 4. Fetch 6 Months Historical Collection & Expense Trend
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

        const tExpSnap = await getDocs(
          query(collection(db, 'expenses'), where('coachingId', 'in', coachingIds), where('year', '==', y), where('month', '==', m))
        );
        let mExpenses = 0;
        tExpSnap.docs.forEach(docSnap => {
          mExpenses += Number(docSnap.data().amount || 0);
        });

        trendList.push({
          monthName: d.toLocaleString('default', { month: 'short' }),
          year: y,
          collected: mCollected,
          expenses: mExpenses,
          profit: mCollected - mExpenses
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

            if (rec.status === 'paid') totalPaidEnrollments++;
            else if (rec.status === 'partially_paid') totalPartialEnrollments++;
            else totalUnpaidEnrollments++;
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

  // --- EXPENSE & NET PROFIT CALCULATIONS ---
  const totalCoachingExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfitOrLoss = totalCollectedFee - totalCoachingExpenses;
  const isNetProfit = netProfitOrLoss >= 0;
  const profitMargin = totalCollectedFee > 0 ? Math.round((netProfitOrLoss / totalCollectedFee) * 100) : 0;

  // Category breakdown
  const categoryMap = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount || 0);
  });

  const maxTrendCollected = Math.max(...trendData.map(t => t.collected), 1);

  if (loading) {
    return (
      <div className="py-12 bg-white rounded-3xl border border-slate-100 text-center space-y-3">
        <Sparkles className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Calculating financial metrics, expenses & profit analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Month & Year Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Revenue & Profit/Loss Analytics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Financial summary for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
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

      {/* Top 5 Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Stat 1: Expected Revenue */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Expected Revenue</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹ {totalExpectedFee.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">From {totalActiveEnrollments} enrollments</p>
        </div>

        {/* Stat 2: Total Fee Collected */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
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

        {/* Stat 3: Total Expenses */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Receipt size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">₹ {totalCoachingExpenses.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">{expenses.length} expense entries</p>
        </div>

        {/* Stat 4: Net Profit / Loss */}
        <div className={`p-5 rounded-3xl border shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all ${
          isNetProfit ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-rose-50/80 border-rose-200 text-rose-950'
        }`}>
          <div className="flex justify-between items-center opacity-80">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              {isNetProfit ? 'Net Profit' : 'Net Loss'}
            </span>
            <div className={`p-2 rounded-xl ${isNetProfit ? 'bg-emerald-200/70 text-emerald-800' : 'bg-rose-200/70 text-rose-800'}`}>
              <Wallet size={16} />
            </div>
          </div>
          <p className={`text-2xl font-black ${isNetProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isNetProfit ? '+' : '-'} ₹ {Math.abs(netProfitOrLoss).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-bold opacity-80">Margin: {profitMargin}%</p>
        </div>

        {/* Stat 5: Pending Dues */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Pending Dues</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">₹ {totalPendingFee.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">{totalUnpaidEnrollments + totalPartialEnrollments} pending</p>
        </div>

      </div>

      {/* Grid: 6-Month Trend SVG Chart & Expense Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 6-Month Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" /> 6-Month Revenue & Expense Trend
              </h4>
              <p className="text-xs text-slate-400">Monthly fees collected vs expenses</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Collected</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Expenses</span>
            </div>
          </div>

          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-slate-200/80">
              {trendData.map((item, idx) => {
                const heightCollected = maxTrendCollected > 0 ? Math.max(8, Math.round((item.collected / maxTrendCollected) * 100)) : 8;
                const heightExpense = maxTrendCollected > 0 ? Math.max(8, Math.round((item.expenses / maxTrendCollected) * 100)) : 8;
                const isCurrent = idx === trendData.length - 1;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold p-2 rounded-xl absolute -top-12 whitespace-nowrap pointer-events-none shadow-xl z-20 space-y-0.5 text-center">
                      <p className="text-emerald-300">Revenue: ₹ {item.collected.toLocaleString('en-IN')}</p>
                      <p className="text-rose-300">Expense: ₹ {item.expenses.toLocaleString('en-IN')}</p>
                      <p className="font-black text-white">Net: ₹ {item.profit.toLocaleString('en-IN')}</p>
                    </div>

                    <div className="w-full max-w-[48px] flex items-end justify-center gap-1 h-full">
                      <div 
                        className={`w-1/2 rounded-t-lg transition-all duration-500 ${
                          isCurrent ? 'bg-indigo-600 shadow-sm' : 'bg-indigo-300 group-hover:bg-indigo-500'
                        }`}
                        style={{ height: `${heightCollected}%` }}
                      />
                      <div 
                        className="w-1/2 rounded-t-lg bg-rose-400 group-hover:bg-rose-500 transition-all duration-500"
                        style={{ height: `${heightExpense}%` }}
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

        {/* Expense Category Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <PieChart size={16} className="text-rose-600" /> Expense Breakdown
            </h4>
            <p className="text-xs text-slate-400">Category costs for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'short' })} {selectedYear}</p>
          </div>

          <div className="space-y-3 pt-1 max-h-[190px] overflow-y-auto pr-1">
            {Object.entries(categoryMap).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No expenses logged for this month.
              </div>
            ) : (
              Object.entries(categoryMap).map(([cat, amt]) => {
                const percent = totalCoachingExpenses > 0 ? Math.round((amt / totalCoachingExpenses) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate pr-2">{cat}</span>
                      <span className="text-rose-600">₹ {amt.toLocaleString('en-IN')} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
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
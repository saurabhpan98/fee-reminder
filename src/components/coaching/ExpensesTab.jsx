// src/components/coaching/ExpensesTab.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, addDoc, 
  deleteDoc, updateDoc, doc 
} from 'firebase/firestore';
import { 
  DollarSign, Plus, Trash2, Edit3, Calendar, 
  Search, X, Receipt, Tag, TrendingDown, Filter, AlertTriangle, 
  PieChart, CreditCard, BarChart2, List, Download
} from 'lucide-react';
import { downloadCoachingExpensesReportPDF } from '../../utils/exportUtils';

const EXPENSE_CATEGORIES = [
  'Teacher / Staff Salary',
  'Institute Rent',
  'Electricity & Utilities',
  'Study Material & Printing',
  'Marketing & Promotion',
  'Repairs & Maintenance',
  'Software & Subscriptions',
  'Miscellaneous / Other'
];

const CATEGORY_COLORS = {
  'Teacher / Staff Salary': { hex: '#6366f1', gradient: 'from-indigo-500 to-indigo-600' },
  'Institute Rent': { hex: '#f43f5e', gradient: 'from-rose-500 to-rose-600' },
  'Electricity & Utilities': { hex: '#f59e0b', gradient: 'from-amber-500 to-amber-600' },
  'Study Material & Printing': { hex: '#10b981', gradient: 'from-emerald-500 to-emerald-600' },
  'Marketing & Promotion': { hex: '#8b5cf6', gradient: 'from-violet-500 to-violet-600' },
  'Repairs & Maintenance': { hex: '#06b6d4', gradient: 'from-cyan-500 to-cyan-600' },
  'Software & Subscriptions': { hex: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
  'Miscellaneous / Other': { hex: '#64748b', gradient: 'from-slate-500 to-slate-600' }
};

const PAYMENT_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Cheque'];

export const ExpensesTab = ({ coachingId, coaching }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // View Switcher for Analytics: 'bars' | 'pie'
  const [analyticsViewMode, setAnalyticsViewMode] = useState('bars');
  const [hoveredPieSlice, setHoveredPieSlice] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpenseModal, setDeleteExpenseModal] = useState({ show: false, expense: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'UPI',
    remark: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, [coachingId, selectedMonth, selectedYear]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'expenses'),
        where('coachingId', '==', coachingId),
        where('month', '==', Number(selectedMonth)),
        where('year', '==', Number(selectedYear))
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(list);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: EXPENSE_CATEGORIES[0],
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'UPI',
      remark: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      category: exp.category,
      amount: exp.amount,
      date: exp.date,
      paymentMode: exp.paymentMode || 'UPI',
      remark: exp.remark || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || Number(formData.amount) <= 0) {
      alert('Please provide a valid title and amount.');
      return;
    }

    setIsSubmitting(true);
    const expDate = new Date(formData.date);
    const expMonth = expDate.getMonth() + 1;
    const expYear = expDate.getFullYear();

    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), {
          title: formData.title.trim(),
          category: formData.category,
          amount: Number(formData.amount),
          date: formData.date,
          month: expMonth,
          year: expYear,
          paymentMode: formData.paymentMode,
          remark: formData.remark.trim(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'expenses'), {
          coachingId,
          title: formData.title.trim(),
          category: formData.category,
          amount: Number(formData.amount),
          date: formData.date,
          month: expMonth,
          year: expYear,
          paymentMode: formData.paymentMode,
          remark: formData.remark.trim(),
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Failed to save expense: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteExpenseModal.expense) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'expenses', deleteExpenseModal.expense.id));
      setDeleteExpenseModal({ show: false, expense: null });
      fetchExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchTerm || 
      exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.remark?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || exp.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalMonthlyExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // Group by category for graphs & reports
  const categoryTotals = {};
  const modeTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.amount || 0);
    const mode = exp.paymentMode || 'UPI';
    modeTotals[mode] = (modeTotals[mode] || 0) + Number(exp.amount || 0);
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  // Helper for SVG Pie chart
  let cumulativeAngle = 0;
  const pieSlices = sortedCategories.map(([cat, amt]) => {
    const percent = totalMonthlyExpenses > 0 ? amt / totalMonthlyExpenses : 0;
    const sliceAngle = percent * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle += sliceAngle;

    const r = 80;
    const cx = 100;
    const cy = 100;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
    const pathData = percent >= 0.999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      cat,
      amt,
      percent: Math.round(percent * 100),
      pathData,
      color: CATEGORY_COLORS[cat]?.hex || '#64748b',
      gradientClass: CATEGORY_COLORS[cat]?.gradient || 'from-rose-500 to-rose-600'
    };
  });

  // Download Comprehensive Expenses PDF Report with Seal
  const handleDownloadReport = () => {
    downloadCoachingExpensesReportPDF({
      coaching,
      month: selectedMonth,
      year: selectedYear,
      expenses,
      totalMonthlyExpenses,
      categoryTotals,
      modeTotals
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Filter & Actions Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Receipt size={18} className="text-rose-600" /> Coaching Expenses Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track operational costs, rent, salaries, and utilities for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Download Expense Report Button */}
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Download Monthly Expenses PDF Report"
          >
            <Download size={14} />
            <span>Download Report</span>
          </button>

          {/* Month / Year Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
            <Calendar size={14} className="text-indigo-600 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-800 outline-none cursor-pointer pr-1 font-bold"
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
              className="bg-transparent text-slate-800 outline-none cursor-pointer pr-2 font-bold"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-100 transition-all hover:scale-105 active:scale-95 cursor-pointer ml-auto md:ml-0"
          >
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <TrendingDown size={14} className="text-rose-500" /> Total Month Expenses
          </span>
          <p className="text-2xl font-black text-rose-600">₹ {totalMonthlyExpenses.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 font-medium">For {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Receipt size={14} className="text-indigo-500" /> Recorded Transactions
          </span>
          <p className="text-2xl font-black text-slate-900">{expenses.length} Entries</p>
          <p className="text-[11px] text-slate-400 font-medium">{filteredExpenses.length} filtered items</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Tag size={14} className="text-amber-500" /> Top Spending Category
          </span>
          <p className="text-lg font-black text-slate-800 truncate">{topCategory ? topCategory[0] : 'None'}</p>
          <p className="text-[11px] text-amber-700 font-extrabold">
            {topCategory ? `₹ ${topCategory[1].toLocaleString('en-IN')}` : '₹ 0'}
          </p>
        </div>
      </div>

      {/* ANIMATED EXPENSE ANALYSIS WITH TOGGLE */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <BarChart2 size={16} className="text-rose-600" /> Category Breakdown Analytics
                </h4>
                <p className="text-xs text-slate-400">Expense distribution across categories</p>
              </div>

              {/* View Mode Toggle: Default Bars vs Pie Chart */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAnalyticsViewMode('bars')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    analyticsViewMode === 'bars'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List size={13} />
                  <span>Default View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsViewMode('pie')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    analyticsViewMode === 'pie'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <PieChart size={13} />
                  <span>Pie Chart View</span>
                </button>
              </div>
            </div>

            {/* Bars View */}
            {analyticsViewMode === 'bars' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                {sortedCategories.map(([cat, amt]) => {
                  const percent = totalMonthlyExpenses > 0 ? Math.round((amt / totalMonthlyExpenses) * 100) : 0;
                  const gradientClass = CATEGORY_COLORS[cat]?.gradient || 'from-rose-500 to-rose-600';

                  return (
                    <div key={cat} className="group space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradientClass}`} />
                          {cat}
                        </span>
                        <span className="text-slate-900 font-black">
                          ₹ {amt.toLocaleString('en-IN')} <span className="text-slate-400 font-normal text-[10px]">({percent}%)</span>
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-700 ease-out shadow-xs`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pie Chart View */}
            {analyticsViewMode === 'pie' && (
              <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in duration-200">
                <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    {pieSlices.map((slice, index) => (
                      <path
                        key={index}
                        d={slice.pathData}
                        fill={slice.color}
                        className="transition-all duration-200 cursor-pointer hover:opacity-85 hover:scale-105 origin-center"
                        onMouseEnter={() => setHoveredPieSlice(slice)}
                        onMouseLeave={() => setHoveredPieSlice(null)}
                      />
                    ))}
                    <circle cx="100" cy="100" r="48" fill="#ffffff" />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Total</span>
                    <span className="text-xs font-black text-slate-900">
                      ₹ {totalMonthlyExpenses > 99999 ? `${(totalMonthlyExpenses / 1000).toFixed(0)}k` : totalMonthlyExpenses.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {hoveredPieSlice && (
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex justify-between items-center mb-2 animate-in fade-in duration-150">
                      <span className="truncate pr-2">{hoveredPieSlice.cat}</span>
                      <span className="text-amber-300">₹ {hoveredPieSlice.amt.toLocaleString('en-IN')} ({hoveredPieSlice.percent}%)</span>
                    </div>
                  )}

                  {pieSlices.map((slice, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredPieSlice(slice)}
                      onMouseLeave={() => setHoveredPieSlice(null)}
                      className="p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="font-bold text-slate-700 truncate">{slice.cat}</span>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">
                        ₹ {slice.amt.toLocaleString('en-IN')} <span className="text-slate-400 font-medium text-[10px]">({slice.percent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <CreditCard size={16} className="text-indigo-600" /> Payment Methods
                </h4>
                <p className="text-xs text-slate-400">Mode-wise outflow</p>
              </div>

              <div className="space-y-3 pt-4">
                {PAYMENT_MODES.map(mode => {
                  const amt = modeTotals[mode] || 0;
                  const percent = totalMonthlyExpenses > 0 ? Math.round((amt / totalMonthlyExpenses) * 100) : 0;

                  return (
                    <div key={mode} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-indigo-50/50 transition-colors">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-xs text-slate-800">{mode}</span>
                        <p className="text-[10px] text-slate-400">{percent}% of expenses</p>
                      </div>
                      <span className="font-black text-xs text-indigo-700">₹ {amt.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl border border-rose-100 text-[11px] text-rose-900 font-medium">
              💡 Keep receipts logged regularly to get accurate net profit analytics in the Analytics Tab.
            </div>
          </div>

        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by title or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollable Table (4-5 Rows Max) */}
      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
            <Receipt size={32} className="mx-auto text-slate-300" />
            <p>No expenses recorded for this selected month & year.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Expense Title</th>
                  <th className="px-5 py-3.5 font-bold">Category</th>
                  <th className="px-5 py-3.5 font-bold">Amount</th>
                  <th className="px-5 py-3.5 font-bold">Payment Date</th>
                  <th className="px-5 py-3.5 font-bold">Mode</th>
                  <th className="px-5 py-3.5 font-bold">Notes / Remark</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{exp.title}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-extrabold rounded-lg text-[10px] uppercase">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-black text-rose-600">₹ {Number(exp.amount).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px]">
                        {exp.paymentMode || 'UPI'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">{exp.remark || '-'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteExpenseModal({ show: true, expense: exp })}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Receipt size={18} className="text-rose-600" />
                {editingExpense ? 'Edit Expense Record' : 'Record Coaching Expense'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expense Title / Item</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Center Rent / Study Photocopy"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {PAYMENT_MODES.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notes / Remark (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Paid to Landlord via GPay Txn #4829..."
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteExpenseModal.show && deleteExpenseModal.expense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl"><AlertTriangle size={22} /></div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Expense Entry?</h3>
                <p className="text-xs text-slate-500">Permanent deletion warning</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
              Are you sure you want to remove <strong className="text-slate-900">{deleteExpenseModal.expense.title}</strong> of amount <strong className="text-rose-600">₹ {deleteExpenseModal.expense.amount}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteExpenseModal({ show: false, expense: null })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
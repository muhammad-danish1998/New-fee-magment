import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarDays, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Search, 
  X, 
  ChevronRight, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  Filter,
  AlertTriangle 
} from 'lucide-react';
import { getStudents } from '../services/studentService';
import { StatusBadge } from '../components/common/StatusBadge';
import { StudentStatusBadge } from '../components/students/StudentStatusBadge';
import { isArchived } from '../utils/studentStatus';
import { formatCurrency, formatDate } from '../utils/feeCalculator';

export function MonthlyReportPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('All'); // 'All' | 'Annual I' | 'Annual II'

  // Modal for inspecting month students
  const [activeMonthDetails, setActiveMonthDetails] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getStudents();
      setStudents(data || []);
    } catch (err) {
      console.error('Failed to load students for monthly report:', err);
      setError('Unable to fetch monthly data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute monthly data for a session
  const computeMonthlyStats = (studentsList) => {
    const monthlyMap = {};
    studentsList.forEach((s) => {
      const date = s.created_at ? new Date(s.created_at) : new Date();
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!monthlyMap[sortKey]) {
        monthlyMap[sortKey] = {
          sortKey,
          monthLabel,
          count: 0,
          totalFee: 0,
          paid: 0,
          dues: 0,
          students: []
        };
      }
      monthlyMap[sortKey].count += 1;
      monthlyMap[sortKey].totalFee += Number(s.total_fee) || 0;
      monthlyMap[sortKey].paid += Number(s.total_paid) || 0;
      monthlyMap[sortKey].dues += Number(s.dues) || 0;
      monthlyMap[sortKey].students.push(s);
    });

    return Object.values(monthlyMap).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  };

  const annualOneMonthly = useMemo(() => {
    return computeMonthlyStats(students.filter(s => s.admission_session === 'Annual I'));
  }, [students]);

  const annualTwoMonthly = useMemo(() => {
    return computeMonthlyStats(students.filter(s => s.admission_session === 'Annual II'));
  }, [students]);

  // Modal filtered students
  const filteredModalStudents = useMemo(() => {
    if (!activeMonthDetails) return [];
    if (!modalSearch.trim()) return activeMonthDetails.students;
    const term = modalSearch.toLowerCase().trim();
    return activeMonthDetails.students.filter(s => 
      (s.student_name && s.student_name.toLowerCase().includes(term)) ||
      (s.father_name && s.father_name.toLowerCase().includes(term)) ||
      (s.academic_class && s.academic_class.toLowerCase().includes(term)) ||
      (s.program_group && s.program_group.toLowerCase().includes(term))
    );
  }, [activeMonthDetails, modalSearch]);

  const exportMonthlyCSV = (sessionName, data) => {
    const headers = ['Month', 'Session', 'Students Admitted', 'Total Fee Generated', 'Amount Paid', 'Remaining Dues'];
    const rows = data.map(r => [
      `"${r.monthLabel}"`,
      `"${sessionName}"`,
      r.count,
      r.totalFee,
      r.paid,
      r.dues
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sessionName.replace(' ', '_')}_Monthly_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-300">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Monthly Admission &amp; Fee Reports
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Detailed month-by-month student intake, fee commitments, and collection ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Session Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            {['All', 'Annual I', 'Annual II'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedSessionFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedSessionFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh records"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-teal-500 dark:text-teal-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state with Try Again */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors w-fit shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      )}

      {/* SECTION 1: ANNUAL I MONTHLY REPORT */}
      {(selectedSessionFilter === 'All' || selectedSessionFilter === 'Annual I') && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-teal-500/20 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-300 font-black text-sm flex items-center justify-center border border-teal-500/30">
                I
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Annual I — Monthly Breakdown
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admissions and financial collections recorded under Annual I
                </p>
              </div>
            </div>

            {annualOneMonthly.length > 0 && !loading && (
              <button
                onClick={() => exportMonthlyCSV('Annual I', annualOneMonthly)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors w-fit"
              >
                <Download className="w-3.5 h-3.5 text-teal-500" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="overflow-x-auto mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20"></div>
                </div>
              ))}
            </div>
          ) : annualOneMonthly.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No admissions recorded for Annual I yet.
            </div>
          ) : (
            <div className="overflow-x-auto mt-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-center">New Admissions</th>
                    <th className="py-3 px-4 text-right">Total Fee Generated</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Remaining Dues</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {annualOneMonthly.map((row) => (
                    <tr
                      key={row.sortKey}
                      onClick={() => setActiveMonthDetails({ sessionName: 'Annual I', monthLabel: row.monthLabel, students: row.students })}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        {row.monthLabel}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-300 font-sans">
                          {row.count} students
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(row.totalFee)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.paid)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-800 dark:text-amber-300">
                        {formatCurrency(row.dues)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-300 text-[11px] font-sans font-semibold border border-teal-500/20 transition-colors"
                        >
                          <span>View Students</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: ANNUAL II MONTHLY REPORT */}
      {(selectedSessionFilter === 'All' || selectedSessionFilter === 'Annual II') && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-indigo-500/20 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-black text-sm flex items-center justify-center border border-indigo-500/30">
                II
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Annual II — Monthly Breakdown
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admissions and financial collections recorded under Annual II
                </p>
              </div>
            </div>

            {annualTwoMonthly.length > 0 && !loading && (
              <button
                onClick={() => exportMonthlyCSV('Annual II', annualTwoMonthly)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors w-fit"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="overflow-x-auto mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20"></div>
                </div>
              ))}
            </div>
          ) : annualTwoMonthly.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No admissions recorded for Annual II yet.
            </div>
          ) : (
            <div className="overflow-x-auto mt-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-center">New Admissions</th>
                    <th className="py-3 px-4 text-right">Total Fee Generated</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Remaining Dues</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {annualTwoMonthly.map((row) => (
                    <tr
                      key={row.sortKey}
                      onClick={() => setActiveMonthDetails({ sessionName: 'Annual II', monthLabel: row.monthLabel, students: row.students })}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {row.monthLabel}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-sans">
                          {row.count} students
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(row.totalFee)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.paid)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-800 dark:text-amber-300">
                        {formatCurrency(row.dues)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-sans font-semibold border border-indigo-500/20 transition-colors"
                        >
                          <span>View Students</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MONTH DETAILS MODAL */}
      {activeMonthDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {activeMonthDetails.monthLabel} — {activeMonthDetails.sessionName} Admissions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing all {activeMonthDetails.students.length} student records for this month
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveMonthDetails(null);
                  setModalSearch('');
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Quick Summary & Search */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold">
                  Total: <strong className="text-slate-900 dark:text-white font-bold">{activeMonthDetails.students.length}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold">
                  Fee: <strong className="font-bold">{formatCurrency(activeMonthDetails.students.reduce((acc, s) => acc + (Number(s.total_fee) || 0), 0))}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
                  Paid: <strong className="font-bold">{formatCurrency(activeMonthDetails.students.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0))}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-semibold">
                  Dues: <strong className="font-bold">{formatCurrency(activeMonthDetails.students.reduce((acc, s) => acc + (Number(s.dues) || 0), 0))}</strong>
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter students in month..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Modal Students Table */}
            <div className="overflow-y-auto flex-1 p-4">
              {filteredModalStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No students match your filter in this month.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 uppercase text-xs font-bold">
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Program &amp; Class</th>
                        <th className="py-3 px-3 text-right">Total Fee</th>
                        <th className="py-3 px-3 text-right">Paid</th>
                        <th className="py-3 px-3 text-right">Dues</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredModalStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{st.student_name}</span>
                              {isArchived(st) && (
                                <StudentStatusBadge status={st.status} size="xs" />
                              )}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">S/O {st.father_name}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs">{st.program_group}</div>
                            <div className="text-xs text-teal-700 dark:text-teal-300 font-bold">Class {st.academic_class} ({st.admission_type})</div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-900 dark:text-white font-bold">
                            {formatCurrency(st.total_fee)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                            {formatCurrency(st.total_paid)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-amber-800 dark:text-amber-300 font-extrabold">
                            {formatCurrency(st.dues)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <StatusBadge status={st.fee_status} />
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Link
                              to={`/students/${st.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm shadow-teal-600/20 transition-all active:scale-95"
                            >
                              <span>Profile</span>
                              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setActiveMonthDetails(null);
                  setModalSearch('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

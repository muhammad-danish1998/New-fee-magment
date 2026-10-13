import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Plus, 
  RefreshCw, 
  CalendarDays, 
  ArrowRight, 
  Award, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Sparkles,
  UserX
} from 'lucide-react';
import { getStudents } from '../services/studentService';
import { isActive, isArchived } from '../utils/studentStatus';
import { formatCurrency } from '../utils/feeCalculator';

export function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getStudents();
      setStudents(data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to fetch data from Supabase. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter students by session
  const annualOneStudents = useMemo(() => {
    return students.filter(s => s.admission_session === 'Annual I');
  }, [students]);

  const annualTwoStudents = useMemo(() => {
    return students.filter(s => s.admission_session === 'Annual II');
  }, [students]);

  // Combined Top Metrics (Annual I + Annual II)
  const combinedStats = useMemo(() => {
    const activeStudents = students.filter(s => isActive(s));
    const leftStudents = students.filter(s => ['left', 'transferred', 'struck_off'].includes(s.status));

    const totalStudents = activeStudents.length;
    const totalFee = students.reduce((acc, s) => acc + (Number(s.total_fee) || 0), 0);
    const collectedFee = students.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0);
    const remainingFee = activeStudents.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);
    const leftDues = leftStudents.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);
    const leftCount = leftStudents.length;

    return { totalStudents, totalFee, collectedFee, remainingFee, leftDues, leftCount };
  }, [students]);

  // Compute session-specific metrics (without partial amount as requested)
  const computeSessionMetrics = (sessionStudents) => {
    const activeSessionStudents = sessionStudents.filter(s => isActive(s));
    const totalStudents = activeSessionStudents.length;
    const totalAmount = sessionStudents.reduce((acc, s) => acc + (Number(s.total_fee) || 0), 0);
    const paidAmount = sessionStudents.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0);
    const remainingAmount = activeSessionStudents.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);

    // Progress stage counters
    const enrollmentIssuedCount = activeSessionStudents.filter(s => s.enrollment_card_issued).length;
    const examinationVerificationCount = activeSessionStudents.filter(s => s.examination_verification).length;

    return {
      totalStudents,
      totalAmount,
      paidAmount,
      remainingAmount,
      enrollmentIssuedCount,
      examinationVerificationCount
    };
  };

  const annualOneStats = useMemo(() => computeSessionMetrics(annualOneStudents), [annualOneStudents]);
  const annualTwoStats = useMemo(() => computeSessionMetrics(annualTwoStudents), [annualTwoStudents]);

  return (
    <div className="space-y-8 pb-10">
      {/* ==================================================================== */}
      {/* TOP HEADER & ACTION BUTTONS                                          */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Fee Management Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold border border-teal-500/20">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time admissions and session financial breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh statistics"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-teal-500 dark:text-teal-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Enrollment for Annual I Button */}
          <Link
            to="/enroll?session=Annual+I"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Enrollment for Annual I</span>
          </Link>

          {/* Enrollment for Annual II Button */}
          <Link
            to="/enroll?session=Annual+II"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Enrollment for Annual II</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PORTION 1: TOP GRAND SUMMARY (COMBINED ANNUAL I + ANNUAL II)          */}
      {/* ==================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <h2 className="text-xs sm:text-sm uppercase tracking-wider font-extrabold text-slate-700 dark:text-slate-300">
            Portion 1 — Overall Grand Summary (Annual I + Annual II)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Combined Admissions</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* 1. All Enrolled Students */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                All Enrolled Students
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
              ) : (
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {combinedStats.totalStudents}
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">Active enrolled students</p>
            </div>
          </div>

          {/* 2. Total Fee */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Total Fee
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
              ) : (
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-indigo-600 dark:text-indigo-300 font-mono">
                  {formatCurrency(combinedStats.totalFee)}
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">Gross committed admissions</p>
            </div>
          </div>

          {/* 3. Collected Fee */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Collected Fee
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
              ) : (
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 font-mono">
                  {formatCurrency(combinedStats.collectedFee)}
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">Verified received cash/bank</p>
            </div>
          </div>

          {/* 4. Remaining Fee */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Remaining Fee
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
              ) : (
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-800 dark:text-amber-300 font-mono">
                  {formatCurrency(combinedStats.remainingFee)}
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">Total outstanding balance</p>
            </div>
          </div>
        </div>

        {/* Outstanding dues of left students callout */}
        {combinedStats.leftCount > 0 && (
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
              <UserX className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Outstanding dues of left students: <strong className="font-mono font-bold text-amber-800 dark:text-amber-300">{formatCurrency(combinedStats.leftDues)}</strong> ({combinedStats.leftCount} {combinedStats.leftCount === 1 ? 'student' : 'students'})
              </span>
            </div>
            <Link
              to="/students?status=left"
              className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white transition-colors"
            >
              <span>View Left Students</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* PORTION 2: DETAILS OF ANNUAL I (Without Partial)                     */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-teal-500/20 rounded-3xl p-5 sm:p-6 shadow-sm transition-colors duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-300 font-black text-lg shadow-inner">
              I
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Details of Annual I
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/20">
                  {annualOneStats.totalStudents} Students
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                Annual I admission enrollment, financial totals, and progress stages
              </p>
            </div>
          </div>

          <Link
            to="/enroll?session=Annual+I"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-teal-600/20 transition-all active:scale-[0.98] w-fit"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Annual I Admission</span>
          </Link>
        </div>

        {/* Annual I Metrics Grid (6 clean cards, without partial) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-5">
          {/* 1. Total Number of Students */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Total Students
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualOneStats.totalStudents}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Annual I enrolled</span>
          </div>

          {/* 2. Total Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Total Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatCurrency(annualOneStats.totalAmount)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Gross fee</span>
          </div>

          {/* 3. Paid Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Paid Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-300 mt-1.5 font-mono">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatCurrency(annualOneStats.paidAmount)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Collected</span>
          </div>

          {/* 4. Remaining Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Remaining Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-amber-800 dark:text-amber-300 mt-1.5 font-mono">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatCurrency(annualOneStats.remainingAmount)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Outstanding dues</span>
          </div>

          {/* 5. Enrollment Issued */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Enrollment Issued
              </span>
              <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-300 mt-1.5">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualOneStats.enrollmentIssuedCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Step 2 completed</span>
          </div>

          {/* 6. Examination in Verification */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Exam Verification
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-300 mt-1.5">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualOneStats.examinationVerificationCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Step 3 verified</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PORTION 3: DETAILS OF ANNUAL II (Without Partial)                    */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-indigo-500/20 rounded-3xl p-5 sm:p-6 shadow-sm transition-colors duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-black text-lg shadow-inner">
              II
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Details of Annual II
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-500/20">
                  {annualTwoStats.totalStudents} Students
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                Annual II admission enrollment, financial totals, and progress stages
              </p>
            </div>
          </div>

          <Link
            to="/enroll?session=Annual+II"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-[0.98] w-fit"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Annual II Admission</span>
          </Link>
        </div>

        {/* Annual II Metrics Grid (6 clean cards, without partial) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-5">
          {/* 1. Total Number of Students */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Total Students
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualTwoStats.totalStudents}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Annual II enrolled</span>
          </div>

          {/* 2. Total Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Total Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatCurrency(annualTwoStats.totalAmount)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Gross fee</span>
          </div>

          {/* 3. Paid Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Paid Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-300 mt-1.5 font-mono">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatCurrency(annualTwoStats.paidAmount)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Collected</span>
          </div>

          {/* 4. Remaining Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Remaining Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-amber-800 dark:text-amber-300 mt-1.5 font-mono">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatCurrency(annualTwoStats.remainingAmount)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Outstanding dues</span>
          </div>

          {/* 5. Enrollment Issued */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Enrollment Issued
              </span>
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-300 mt-1.5">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualTwoStats.enrollmentIssuedCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Step 2 completed</span>
          </div>

          {/* 6. Examination in Verification */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Exam Verification
              </span>
              <ShieldCheck className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-pink-600 dark:text-pink-300 mt-1.5">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualTwoStats.examinationVerificationCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">Step 3 verified</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* QUICK NAVIGATION ACTIONS (Monthly Reports & Students Directory)      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Monthly Reports Box */}
        <Link
          to="/monthly-reports"
          className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-500 transition-colors">
                View Monthly Reports
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Month-by-month admissions &amp; collections ledger
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Students Directory Box */}
        <Link
          to="/students"
          className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                Open Students Directory
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search students, print fee slips, and record payments
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}

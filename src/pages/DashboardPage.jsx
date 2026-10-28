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
  UserX,
  ChevronRight
} from 'lucide-react';
import { getStudents } from '../services/studentService';
import { isActive, isArchived } from '../utils/studentStatus';
import { formatMoney, formatDate, toTitleCase } from '../utils/feeCalculator';

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

  // Calculate collection percentage safely (0% if total is 0 or invalid)
  const getCollectionPercentage = (paid, total) => {
    const p = Number(paid) || 0;
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((p / t) * 100)));
  };

  const overallCollectionPercent = useMemo(
    () => getCollectionPercentage(combinedStats.collectedFee, combinedStats.totalFee),
    [combinedStats.collectedFee, combinedStats.totalFee]
  );

  const annualOneCollectionPercent = useMemo(
    () => getCollectionPercentage(annualOneStats.paidAmount, annualOneStats.totalAmount),
    [annualOneStats.paidAmount, annualOneStats.totalAmount]
  );

  const annualTwoCollectionPercent = useMemo(
    () => getCollectionPercentage(annualTwoStats.paidAmount, annualTwoStats.totalAmount),
    [annualTwoStats.paidAmount, annualTwoStats.totalAmount]
  );

  const annualOneEnrollmentPercent = useMemo(
    () => getCollectionPercentage(annualOneStats.enrollmentIssuedCount, annualOneStats.totalStudents),
    [annualOneStats.enrollmentIssuedCount, annualOneStats.totalStudents]
  );

  const annualOneExamPercent = useMemo(
    () => getCollectionPercentage(annualOneStats.examinationVerificationCount, annualOneStats.totalStudents),
    [annualOneStats.examinationVerificationCount, annualOneStats.totalStudents]
  );

  const annualTwoEnrollmentPercent = useMemo(
    () => getCollectionPercentage(annualTwoStats.enrollmentIssuedCount, annualTwoStats.totalStudents),
    [annualTwoStats.enrollmentIssuedCount, annualTwoStats.totalStudents]
  );

  const annualTwoExamPercent = useMemo(
    () => getCollectionPercentage(annualTwoStats.examinationVerificationCount, annualTwoStats.totalStudents),
    [annualTwoStats.examinationVerificationCount, annualTwoStats.totalStudents]
  );

  // Top 5 students with highest remaining fee dues
  const topPendingStudents = useMemo(() => {
    return students
      .filter((s) => isActive(s) && (Number(s.dues) || 0) > 0)
      .sort((a, b) => (Number(b.dues) || 0) - (Number(a.dues) || 0))
      .slice(0, 5);
  }, [students]);

  // Total count of active students with remaining dues
  const totalStudentsWithDues = useMemo(() => {
    return students.filter((s) => isActive(s) && (Number(s.dues) || 0) > 0).length;
  }, [students]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-10">
      {/* ==================================================================== */}
      {/* TOP HEADER & ACTION BUTTONS                                          */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Fee Management Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold border border-teal-500/20">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-[13px] sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time admissions and session financial breakdown
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Refresh statistics"
            aria-label="Refresh dashboard statistics"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <RefreshCw className={`w-4 h-4 text-teal-500 dark:text-teal-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shrink-0 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* OVERALL SUMMARY (COMBINED ANNUAL I + ANNUAL II)                       */}
      {/* ==================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <h2 className="text-xs sm:text-sm uppercase tracking-wider font-extrabold text-slate-700 dark:text-slate-300">
            Overall Summary
          </h2>
          <span className="text-[13px] text-slate-600 dark:text-slate-300 font-semibold">Combined Admissions</span>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* 1. All Enrolled Students (Actionable Link) */}
          <Link
            to="/students"
            aria-label="View all active enrolled students in directory"
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  All Enrolled Students
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
              ) : (
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {combinedStats.totalStudents}
                </div>
              )}
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1 font-medium flex items-center justify-between">
                <span>Active enrolled students</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  View &rarr;
                </span>
              </p>
            </div>
          </Link>

          {/* 2. Total Fee */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between">
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
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-indigo-600 dark:text-indigo-300 tabular-nums">
                  {formatMoney(combinedStats.totalFee)}
                </div>
              )}
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1 font-medium">Gross committed admissions</p>
            </div>
          </div>

          {/* 3. Collected Fee */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between">
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
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
                  {formatMoney(combinedStats.collectedFee)}
                </div>
              )}
              {/* Collection Progress Indicator */}
              <div
                role="progressbar"
                aria-valuenow={overallCollectionPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Overall fee collection progress: ${overallCollectionPercent}%`}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5"
              >
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallCollectionPercent}%` }}
                />
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1.5 font-medium tabular-nums">
                {overallCollectionPercent}% collected
              </p>
            </div>
          </div>

          {/* 4. Remaining Fee (Actionable Link) */}
          <Link
            to="/students?dues=pending"
            aria-label="View students with remaining fee dues in directory"
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  Remaining Fee
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
              ) : (
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-800 dark:text-amber-300 tabular-nums">
                  {formatMoney(combinedStats.remainingFee)}
                </div>
              )}
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1 font-medium flex items-center justify-between">
                <span>Total outstanding balance</span>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  View dues &rarr;
                </span>
              </p>
            </div>
          </Link>
        </div>

        {/* Outstanding dues of left students callout */}
        {combinedStats.leftCount > 0 && (
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
              <UserX className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Outstanding dues of left students: <strong className="font-bold text-amber-800 dark:text-amber-300 tabular-nums">{formatMoney(combinedStats.leftDues)}</strong> ({combinedStats.leftCount} {combinedStats.leftCount === 1 ? 'student' : 'students'})
              </span>
            </div>
            <Link
              to="/students?status=left"
              className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md px-1 py-0.5"
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
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Details of Annual I
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/20">
                  {annualOneStats.totalStudents} Students
                </span>
              </h2>
              <p className="text-[13px] sm:text-sm text-slate-600 dark:text-slate-300">
                Annual I admission enrollment, financial totals, and progress stages
              </p>
            </div>
          </div>

          <Link
            to="/enroll?session=Annual+I"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-teal-600/20 transition-all active:scale-[0.98] w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Annual I Admission</span>
          </Link>
        </div>

        {/* Annual I Metrics Grid (6 clean cards, without partial) */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 pt-5">
          {/* 1. Total Number of Students (Actionable Link) */}
          <Link
            to="/students?session=Annual+I"
            aria-label="View Annual I enrolled students in directory"
            className="group bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/40 flex flex-col justify-between min-h-[110px] shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                Total Students
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualOneStats.totalStudents}
            </div>
            <div className="flex items-center justify-between text-[13px] text-slate-600 dark:text-slate-300 font-medium">
              <span>Annual I enrolled</span>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
          </Link>

          {/* 2. Total Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Total Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatMoney(annualOneStats.totalAmount)}
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">Gross fee</span>
          </div>

          {/* 3. Paid Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Paid Amount
            </span>
            <div className="mt-1.5">
              <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
                {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatMoney(annualOneStats.paidAmount)}
              </div>
              {/* Collection Progress Indicator */}
              <div
                role="progressbar"
                aria-valuenow={annualOneCollectionPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Annual I fee collection progress: ${annualOneCollectionPercent}%`}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2"
              >
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${annualOneCollectionPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1 tabular-nums">
              {annualOneCollectionPercent}% collected
            </span>
          </div>

          {/* 4. Remaining Amount (Actionable Link) */}
          <Link
            to="/students?session=Annual+I&dues=pending"
            aria-label="View Annual I students with remaining dues in directory"
            className="group bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 flex flex-col justify-between min-h-[110px] shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                Remaining Amount
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-amber-800 dark:text-amber-300 mt-1.5 tabular-nums">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatMoney(annualOneStats.remainingAmount)}
            </div>
            <div className="flex items-center justify-between text-[13px] text-slate-600 dark:text-slate-300 font-medium">
              <span>Outstanding dues</span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View dues &rarr;
              </span>
            </div>
          </Link>

          {/* 5. Enrollment Issued */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Enrollment Issued
              </span>
              <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="mt-1.5">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                {loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-300">
                      {annualOneStats.enrollmentIssuedCount}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      / {annualOneStats.totalStudents}
                    </span>
                  </>
                )}
              </div>
              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={annualOneEnrollmentPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Annual I enrollment card issued progress: ${annualOneStats.enrollmentIssuedCount} of ${annualOneStats.totalStudents} students (${annualOneEnrollmentPercent}%)`}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2"
              >
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${annualOneEnrollmentPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1">Step 2 completed</span>
          </div>

          {/* 6. Examination in Verification */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Exam Verification
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-1.5">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                {loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-300">
                      {annualOneStats.examinationVerificationCount}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      / {annualOneStats.totalStudents}
                    </span>
                  </>
                )}
              </div>
              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={annualOneExamPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Annual I exam verification progress: ${annualOneStats.examinationVerificationCount} of ${annualOneStats.totalStudents} students (${annualOneExamPercent}%)`}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2"
              >
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${annualOneExamPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1">Step 3 verified</span>
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
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Details of Annual II
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-500/20">
                  {annualTwoStats.totalStudents} Students
                </span>
              </h2>
              <p className="text-[13px] sm:text-sm text-slate-600 dark:text-slate-300">
                Annual II admission enrollment, financial totals, and progress stages
              </p>
            </div>
          </div>

          <Link
            to="/enroll?session=Annual+II"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-[0.98] w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Annual II Admission</span>
          </Link>
        </div>

        {/* Annual II Metrics Grid (6 clean cards, without partial) */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 pt-5">
          {/* 1. Total Number of Students (Actionable Link) */}
          <Link
            to="/students?session=Annual+II"
            aria-label="View Annual II enrolled students in directory"
            className="group bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 flex flex-col justify-between min-h-[110px] shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                Total Students
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : annualTwoStats.totalStudents}
            </div>
            <div className="flex items-center justify-between text-[13px] text-slate-600 dark:text-slate-300 font-medium">
              <span>Annual II enrolled</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View &rarr;
              </span>
            </div>
          </Link>

          {/* 2. Total Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Total Amount
            </span>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatMoney(annualTwoStats.totalAmount)}
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">Gross fee</span>
          </div>

          {/* 3. Paid Amount */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Paid Amount
            </span>
            <div className="mt-1.5">
              <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
                {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatMoney(annualTwoStats.paidAmount)}
              </div>
              {/* Collection Progress Indicator */}
              <div
                role="progressbar"
                aria-valuenow={annualTwoCollectionPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Annual II fee collection progress: ${annualTwoCollectionPercent}%`}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2"
              >
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${annualTwoCollectionPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1 tabular-nums">
              {annualTwoCollectionPercent}% collected
            </span>
          </div>

          {/* 4. Remaining Amount (Actionable Link) */}
          <Link
            to="/students?session=Annual+II&dues=pending"
            aria-label="View Annual II students with remaining dues in directory"
            className="group bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 flex flex-col justify-between min-h-[110px] shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                Remaining Amount
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-amber-800 dark:text-amber-300 mt-1.5 tabular-nums">
              {loading ? <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : formatMoney(annualTwoStats.remainingAmount)}
            </div>
            <div className="flex items-center justify-between text-[13px] text-slate-600 dark:text-slate-300 font-medium">
              <span>Outstanding dues</span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View dues &rarr;
              </span>
            </div>
          </Link>

          {/* 5. Enrollment Issued */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Enrollment Issued
              </span>
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-1.5">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                {loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-300">
                      {annualTwoStats.enrollmentIssuedCount}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      / {annualTwoStats.totalStudents}
                    </span>
                  </>
                )}
              </div>
              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={annualTwoEnrollmentPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Annual II enrollment card issued progress: ${annualTwoStats.enrollmentIssuedCount} of ${annualTwoStats.totalStudents} students (${annualTwoEnrollmentPercent}%)`}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2"
              >
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${annualTwoEnrollmentPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1">Step 2 completed</span>
          </div>

          {/* 6. Examination in Verification */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Exam Verification
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-1.5">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                {loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-300">
                      {annualTwoStats.examinationVerificationCount}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      / {annualTwoStats.totalStudents}
                    </span>
                  </>
                )}
              </div>
              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={annualTwoExamPercent}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Annual II exam verification progress: ${annualTwoStats.examinationVerificationCount} of ${annualTwoStats.totalStudents} students (${annualTwoExamPercent}%)`}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2"
              >
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${annualTwoExamPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1">Step 3 verified</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PORTION 4: TOP PENDING DUES (Highest Remaining Balances)             */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm transition-colors duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Pending Dues
                {totalStudentsWithDues > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-500/20">
                    {totalStudentsWithDues} with dues
                  </span>
                )}
              </h2>
              <p className="text-[13px] text-slate-600 dark:text-slate-300">
                Top {topPendingStudents.length} students with highest remaining fee balances
              </p>
            </div>
          </div>

          <Link
            to="/students?dues=pending"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 transition-colors py-1 focus:outline-none focus-visible:underline"
          >
            <span>View All Students With Dues</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Content */}
        <div className="pt-2">
          {loading ? (
            <div className="space-y-2.5 pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : topPendingStudents.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Dues</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All enrolled students are currently paid in full.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {topPendingStudents.map((student, idx) => {
                const initials = (student.student_name || 'S')
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isOverdue =
                  student.next_payment_due_date &&
                  new Date(student.next_payment_due_date) < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <Link
                    key={student.id}
                    to={`/students/${student.id}`}
                    aria-label={`View profile of ${toTitleCase(student.student_name)}, remaining dues ${formatMoney(student.dues)}`}
                    className="group flex items-center justify-between py-3 px-2 sm:px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    {/* Left: Rank, Avatar, Name & Class */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="hidden sm:inline-block w-5 text-center text-xs font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center border border-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                        {initials}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                          {toTitleCase(student.student_name)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-medium truncate">
                            {student.academic_class || 'Class'}
                          </span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {student.admission_session || 'Session'}
                          </span>
                          {student.next_payment_due_date && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className={`hidden sm:inline text-[11px] ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                                Due: {formatDate(student.next_payment_due_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Remaining Amount & Chevron */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-extrabold text-amber-800 dark:text-amber-300 tabular-nums">
                          {formatMoney(student.dues)}
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          isOverdue
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {isOverdue ? 'Overdue' : 'Dues'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* QUICK NAVIGATION ACTIONS (Monthly Reports & Students Directory)      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Monthly Reports Box */}
        <Link
          to="/monthly-reports"
          className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-500 transition-colors">
                View Monthly Reports
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-300">
                Month-by-month admissions &amp; collections ledger
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Students Directory Box */}
        <Link
          to="/students"
          className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                Open Students Directory
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-300">
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

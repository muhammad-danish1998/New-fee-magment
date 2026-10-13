import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Handshake, ShieldCheck, Lock, Unlock, AlertTriangle, CheckCircle2,
  Calendar, Search, Filter, Printer, DollarSign, Users, Award, FileText,
  Clock, Phone, RefreshCw, XCircle
} from 'lucide-react';
import { getBrokerPortalDataByRpc } from '../services/brokerService';
import { formatCurrency, formatDate } from '../utils/feeCalculator';
import { printBrokerStatement } from '../utils/printBrokerStatement';

export function BrokerPortalPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [portalData, setPortalData] = useState(null);

  // Authentication PIN state
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [progressFilter, setProgressFilter] = useState('All');

  useEffect(() => {
    // Check if previously unlocked in this session
    const savedPin = sessionStorage.getItem(`broker_pin_${token}`);
    if (savedPin) {
      handleUnlockWithPin(savedPin);
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleUnlockWithPin = async (pin) => {
    try {
      setIsVerifying(true);
      setPinError('');
      const data = await getBrokerPortalDataByRpc(token, pin);

      if (!data || !data.isLinkActive) {
        setPortalError(data?.error || 'This portal link has been deactivated by college administration.');
        setPortalData(null);
        setIsUnlocked(false);
      } else {
        setPortalData(data);
        setIsUnlocked(true);
        sessionStorage.setItem(`broker_pin_${token}`, pin);
      }
    } catch (err) {
      console.error('Portal unlock error:', err);
      setPinError(err.message || 'Incorrect PIN or portal link is inactive.');
      setIsUnlocked(false);
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter your 4-digit security PIN.');
      return;
    }
    await handleUnlockWithPin(pinInput.trim());
  };

  const handleLockSession = () => {
    setIsUnlocked(false);
    setPinInput('');
    setPortalData(null);
    sessionStorage.removeItem(`broker_pin_${token}`);
  };

  const handlePrint = () => {
    if (!portalData || !portalData.broker) return;
    printBrokerStatement({
      broker: portalData.broker,
      students: filteredStudents,
      sessionFilter: sessionFilter,
      progressFilter: progressFilter,
    });
  };

  // Filter students
  const filteredStudents = (portalData?.students || []).filter((student) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = student.student_name?.toLowerCase().includes(q);
      const matchFather = student.father_name?.toLowerCase().includes(q);
      if (!matchName && !matchFather) return false;
    }

    // Session filter (Annual I / Annual II)
    if (sessionFilter !== 'All') {
      if (student.admission_session !== sessionFilter) return false;
    }

    // Progress filter
    if (progressFilter !== 'All') {
      if (student.current_progress !== progressFilter) return false;
    }

    return true;
  });

  // Calculate aggregates for current filtered list
  const totalStudents = filteredStudents.length;
  const totalAgreedVolume = filteredStudents.reduce((sum, s) => sum + (s.agreed_snapshot || s.total_fee || 0), 0);
  const totalPaidVolume = filteredStudents.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const totalDuesVolume = filteredStudents.reduce((sum, s) => sum + (s.dues || 0), 0);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Securing and loading partner portal...</p>
        </div>
      </div>
    );
  }

  // --- Deactivated / Permanent Error State ---
  if (portalError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Portal Access Unavailable</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {portalError}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
            Please contact the College Admissions &amp; Accounts Office to request an active link.
          </div>
        </div>
      </div>
    );
  }

  // --- PIN Protection Lock Screen ---
  if (!isUnlocked || !portalData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-lg shadow-purple-950/50">
              <Lock className="w-7 h-7" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-purple-900/40 text-purple-300 text-[11px] font-bold border border-purple-500/30">
              Verified Partner Portal
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {portalData?.broker?.name || 'Referral Partner Portal'}
            </h2>
            <p className="text-xs text-slate-400">
              Enter your 4-digit security PIN to access your student records &amp; statements.
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            {pinError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold text-xs mb-1.5 text-center">
                Security PIN (4 Digits)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="8"
                autoFocus
                required
                disabled={isVerifying}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-purple-500/40 text-purple-200 text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Unlock className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying PIN...' : 'Unlock Partner Dashboard'}</span>
            </button>
          </form>

          <div className="text-center pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            Protected &amp; encrypted • College Admission Management
          </div>
        </div>
      </div>
    );
  }

  // --- Active Unlocked Partner Dashboard ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Partner Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5" />
                <span>Referral Partner Portal</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure Session Active</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
              {portalData.broker.name}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Contact: {portalData.broker.phone || 'Registered Partner'}</span>
              <span>•</span>
              <span>Updated: {formatDate(new Date().toISOString())}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleLockSession}
              title="Lock and sign out of this session"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Lock Session</span>
            </button>
          </div>
        </div>

        {/* 4 Key Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Referred</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalStudents}</div>
            <div className="text-[10px] text-slate-500">Enrolled Students</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Volume</span>
              <DollarSign className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-mono font-black text-teal-300">{formatCurrency(totalAgreedVolume)}</div>
            <div className="text-[10px] text-slate-500">Agreed Package Value</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Paid</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-black text-emerald-400">{formatCurrency(totalPaidVolume)}</div>
            <div className="text-[10px] text-slate-500">Received to Date</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Remaining Dues</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-mono font-black text-amber-400">{formatCurrency(totalDuesVolume)}</div>
            <div className="text-[10px] text-slate-500">Outstanding Balance</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or father name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Session & Progress Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Session Tabs: All | Annual I | Annual II */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['All', 'Annual I', 'Annual II'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSessionFilter(s)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                    sessionFilter === s
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'All' ? 'All Sessions' : s}
                </button>
              ))}
            </div>

            {/* Progress Stage Filter Dropdown */}
            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:border-purple-500"
            >
              <option value="All">All Verification Stages</option>
              <option value="Enrollment in Verification">1. Enrollment in Verification</option>
              <option value="Enrollment Card Issued">2. Enrollment Card Issued</option>
              <option value="Examination in Verification">3. Examination in Verification</option>
              <option value="Admit Card Issued">4. Admit Card Issued</option>
            </select>
          </div>
        </div>

        {/* Student Referral Ledger Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Class &amp; Stream</th>
                  <th className="py-3.5 px-4">Session</th>
                  <th className="py-3.5 px-4">Admission Date</th>
                  <th className="py-3.5 px-4 text-right">Agreed Fee</th>
                  <th className="py-3.5 px-4 text-right">Paid</th>
                  <th className="py-3.5 px-4 text-right">Dues</th>
                  <th className="py-3.5 px-4">Current Verification Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400 space-y-2">
                      <Users className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-semibold text-sm">No student records found.</p>
                      <p className="text-[11px] text-slate-500">Try adjusting your session or search filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{s.student_name}</div>
                        <div className="text-[11px] text-slate-400">S/O {s.father_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{s.academic_class}</div>
                        <div className="text-[11px] text-slate-400">{s.program_group}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-teal-300 border border-slate-700">
                          {s.admission_session}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-300">
                        {formatCurrency(s.agreed_snapshot || s.total_fee || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(s.total_paid || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={s.dues === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                          {s.dues === 0 ? 'Paid in Full' : formatCurrency(s.dues)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            s.step_number === 4
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : s.step_number === 3
                              ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                              : s.step_number === 2
                              ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                              : 'bg-amber-950 text-amber-300 border-amber-500/40'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>Step {s.step_number}: {s.current_progress}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>College Admission &amp; Fee Management System • Referral Partner Portal</span>
          <span>Read-Only Statement &amp; Real-time Verification Tracker</span>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Users, Search, Plus, FileText, CreditCard, ArrowRight, AlertTriangle,
  Download, Trash2, Edit3, Phone, RefreshCw, BellRing, ShieldCheck,
  MoreVertical, X, Filter, ChevronUp, ChevronDown, ArrowUpDown,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, Calendar, Printer,
  ArrowRightLeft, RotateCcw
} from 'lucide-react';
import { getStudents } from '../services/studentService';
import { getAdmissionConfig } from '../services/configService';
import { getBrokers } from '../services/brokerService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { FeeSlipModal } from '../components/fee-slip/FeeSlipModal';
import { AddPaymentModal } from '../components/payments/AddPaymentModal';
import { ManageProgressModal } from '../components/progress/ManageProgressModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { FeeDueNoticeModal } from '../components/notices/FeeDueNoticeModal';
import { PrintReportModal } from '../components/students/PrintReportModal';
import { StudentStatusBadge } from '../components/students/StudentStatusBadge';
import { ChangeStatusModal } from '../components/students/ChangeStatusModal';
import { ReopenStudentModal } from '../components/students/ReopenStudentModal';
import { DeleteStudentSafeModal } from '../components/students/DeleteStudentSafeModal';
import { isActive, isArchived, getStudentStatus } from '../utils/studentStatus';
import { formatCurrency, formatDate, getFeeStatus, toTitleCase } from '../utils/feeCalculator';
import { formatPhoneNumber } from '../utils/phoneHelper';
import { exportStudentsToCSV } from '../utils/csvExport';

export function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  // Primary Data State
  const [allStudents, setAllStudents] = useState([]);
  const [config, setConfig] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status Tab: 'active' | 'passed_out' | 'left' | 'all'
  const initialStatusTab = useMemo(() => {
    const s = searchParams.get('status') || searchParams.get('tab');
    if (s === 'left' || s === 'transferred' || s === 'struck_off') return 'left';
    if (s === 'passed_out') return 'passed_out';
    if (s === 'all') return 'all';
    return 'active';
  }, [searchParams]);
  const [statusTab, setStatusTab] = useState(initialStatusTab);

  // Parse session from query params ('Annual I' or 'Annual II')
  const initialAdmissionSession = useMemo(() => {
    const s = searchParams.get('session');
    if (s === 'Annual I' || s === 'Annual 1') return 'Annual I';
    if (s === 'Annual II' || s === 'Annual 2') return 'Annual II';
    return 'All';
  }, [searchParams]);

  // Parse fee status / dues from query params
  const initialFeeStatus = useMemo(() => {
    const duesParam = searchParams.get('dues');
    const feeStatusParam = searchParams.get('fee_status') || searchParams.get('feeStatus');
    if (duesParam === 'pending' || duesParam === 'true' || feeStatusParam === 'dues' || feeStatusParam === 'Has Dues' || feeStatusParam === 'has_dues') {
      return 'Has Dues';
    }
    if (feeStatusParam === 'Paid in Full' || feeStatusParam === 'paid') return 'Paid in Full';
    if (feeStatusParam === 'No fee / Waived' || feeStatusParam === 'no_fee' || feeStatusParam === 'waived') return 'No fee / Waived';
    if (feeStatusParam === 'Overdue' || feeStatusParam === 'overdue') return 'Overdue';
    if (feeStatusParam === 'Due' || feeStatusParam === 'due') return 'Due';
    if (feeStatusParam === 'Unpaid' || feeStatusParam === 'unpaid') return 'Unpaid';
    if (feeStatusParam === 'No due date' || feeStatusParam === 'no_due_date' || feeStatusParam === 'nodate') return 'No due date';
    return 'All';
  }, [searchParams]);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [chipFilter, setChipFilter] = useState('All'); // 'All' | 'Overdue' | 'Due this week' | 'Paid'
  const [admissionType, setAdmissionType] = useState('All');
  const [admissionSession, setAdmissionSession] = useState(initialAdmissionSession);
  const [admissionSource, setAdmissionSource] = useState('All');
  const [feeStatus, setFeeStatus] = useState(initialFeeStatus);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync state whenever query parameters change
  useEffect(() => {
    setStatusTab(initialStatusTab);
    setAdmissionSession(initialAdmissionSession);
    setFeeStatus(initialFeeStatus);
  }, [initialStatusTab, initialAdmissionSession, initialFeeStatus]);

  // Sorting & Pagination State
  const [sortField, setSortField] = useState('created_at'); // 'name' | 'dues' | 'due_date' | 'created_at'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem('students_page_size');
      return saved ? Number(saved) || 40 : 40;
    } catch {
      return 40;
    }
  });

  const handlePageSizeChange = (newSize) => {
    const numericSize = newSize === 'all' ? 999999 : Number(newSize);
    setPageSize(numericSize);
    setCurrentPage(1);
    try {
      localStorage.setItem('students_page_size', String(numericSize));
    } catch (e) {
      // ignore
    }
  };

  // Active Menu & Modals State
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal Handlers
  const [selectedStudentForSlip, setSelectedStudentForSlip] = useState(null);
  const [selectedStudentForNotice, setSelectedStudentForNotice] = useState(null);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [selectedStudentForChangeStatus, setSelectedStudentForChangeStatus] = useState(null);
  const [selectedStudentForReopen, setSelectedStudentForReopen] = useState(null);
  const [selectedStudentForSafeDelete, setSelectedStudentForSafeDelete] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load students data from service
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [studentsData, configData, brokersData] = await Promise.all([
        getStudents({}), // Load all students to allow instantaneous client-side search across name and father name
        getAdmissionConfig(),
        getBrokers()
      ]);
      setAllStudents(studentsData || []);
      setConfig(configData);
      setBrokers(brokersData || []);
    } catch (err) {
      console.error('Failed to load students:', err);
      setError('Unable to load student database. Please check connectivity and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.student-action-menu-container')) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setMobileFiltersOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset to first page whenever search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, debouncedSearch, chipFilter, admissionType, admissionSession, admissionSource, feeStatus, pageSize]);

  // Check if student is due within the next 7 days
  const isDueThisWeek = (student) => {
    if (!student?.next_payment_due_date || (student.dues || 0) <= 0) return false;
    const dueDate = new Date(student.next_payment_due_date);
    if (isNaN(dueDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return dueDate >= today && dueDate <= nextWeek;
  };

  // Helper to extract stage progress (counts completed steps so directory agrees with detail page)
  const getStageInfo = (student) => {
    const completedCount = [
      student.enrollment_verification,
      student.enrollment_card_issued,
      student.examination_verification,
      student.admit_card_issued
    ].filter(Boolean).length;

    if (completedCount === 0) return null;

    return {
      step: completedCount,
      completedCount,
      label: `${completedCount} of 4 Completed`
    };
  };

  // Compute counts per status tab from allStudents
  const tabCounts = useMemo(() => {
    let active = 0;
    let passedOut = 0;
    let left = 0;

    allStudents.forEach((s) => {
      if (isActive(s)) {
        active++;
      } else if (s.status === 'passed_out') {
        passedOut++;
      } else if (['left', 'transferred', 'struck_off'].includes(s.status)) {
        left++;
      }
    });

    return {
      active,
      passed_out: passedOut,
      left,
      all: allStudents.length
    };
  }, [allStudents]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return allStudents.filter((student) => {
      // 0. Status Tab Filter
      if (statusTab === 'active' && !isActive(student)) {
        return false;
      }
      if (statusTab === 'passed_out' && student.status !== 'passed_out') {
        return false;
      }
      if (statusTab === 'left' && !['left', 'transferred', 'struck_off'].includes(student.status)) {
        return false;
      }

      // 1. Search filter: name, father name, id/roll number (contact number excluded)
      if (q) {
        const matchesName = student.student_name && student.student_name.toLowerCase().includes(q);
        const matchesFather = student.father_name && student.father_name.toLowerCase().includes(q);
        const matchesId = student.id && String(student.id).toLowerCase().includes(q);
        const matchesRoll = student.roll_number && String(student.roll_number).toLowerCase().includes(q);

        if (!matchesName && !matchesFather && !matchesId && !matchesRoll) {
          return false;
        }
      }

      // 2. Dropdown Filters
      if (admissionSource !== 'All' && student.admission_source !== admissionSource) {
        return false;
      }
      if (admissionType !== 'All' && student.admission_type !== admissionType) {
        return false;
      }
      if (admissionSession !== 'All' && student.admission_session !== admissionSession) {
        return false;
      }

      // Compute status for precise filtering
      const computed = getFeeStatus(student);

      if (feeStatus !== 'All') {
        if (feeStatus === 'Has Dues' && (Number(student.dues) || 0) <= 0) return false;
        if (feeStatus === 'Paid in Full' && ((Number(student.total_fee) || 0) <= 0 || !computed.isPaid)) return false;
        if (feeStatus === 'No fee / Waived' && (Number(student.total_fee) || 0) > 0) return false;
        if (feeStatus === 'Overdue' && !computed.isOverdue) return false;
        if (feeStatus === 'Due' && (computed.isPaid || computed.isNoFee || computed.isOverdue)) return false;
        if (feeStatus === 'Unpaid' && (student.total_paid > 0 || computed.isPaid || computed.isNoFee)) return false;
        if (feeStatus === 'No due date') {
          const hasDues = (Number(student.dues) || 0) > 0;
          const hasNoDueDate = !student.next_payment_due_date || !String(student.next_payment_due_date).trim();
          if (!hasDues || !hasNoDueDate) return false;
        }
      }

      // 3. Quick Filter Chips
      if (chipFilter === 'Overdue' && !computed.isOverdue) {
        return false;
      }
      if (chipFilter === 'Due this week' && !isDueThisWeek(student)) {
        return false;
      }
      if (chipFilter === 'Paid' && ((Number(student.total_fee) || 0) <= 0 || !computed.isPaid)) {
        return false;
      }

      return true;
    });
  }, [allStudents, statusTab, debouncedSearch, admissionSource, admissionType, admissionSession, feeStatus, chipFilter]);

  // Sort students
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      if (sortField === 'name') {
        const nameA = a.student_name || '';
        const nameB = b.student_name || '';
        return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortField === 'dues') {
        const duesA = a.dues || 0;
        const duesB = b.dues || 0;
        return sortDirection === 'asc' ? duesA - duesB : duesB - duesA;
      }
      if (sortField === 'due_date') {
        const dateA = a.next_payment_due_date ? new Date(a.next_payment_due_date).getTime() : 9999999999999;
        const dateB = b.next_payment_due_date ? new Date(b.next_payment_due_date).getTime() : 9999999999999;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      // default: created_at / newest first
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [filteredStudents, sortField, sortDirection]);

  // Pagination Slice
  const totalFilteredCount = sortedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  // Summary Metrics (Computed dynamically from active filtered list)
  const summaryMetrics = useMemo(() => {
    let duesSum = 0;
    let paidSum = 0;
    let overdueCount = 0;

    filteredStudents.forEach((s) => {
      duesSum += Number(s.dues) || 0;
      paidSum += Number(s.total_paid) || 0;
      const statusInfo = getFeeStatus(s);
      if (statusInfo.isOverdue && isActive(s)) {
        overdueCount += 1;
      }
    });

    return {
      totalStudents: filteredStudents.length,
      totalDues: duesSum,
      totalPaid: paidSum,
      overdueStudents: overdueCount
    };
  }, [filteredStudents]);

  // Check if any filter is active
  const isAnyFilterActive = useMemo(() => {
    return (
      searchInput.trim() !== '' ||
      chipFilter !== 'All' ||
      admissionSource !== 'All' ||
      admissionType !== 'All' ||
      admissionSession !== 'All' ||
      feeStatus !== 'All'
    );
  }, [searchInput, chipFilter, admissionSource, admissionType, admissionSession, feeStatus]);

  // Active filter label description for print report header
  const activeFilterDescription = useMemo(() => {
    const parts = [];
    if (admissionSession !== 'All') parts.push(admissionSession);
    if (admissionType !== 'All') parts.push(admissionType);
    if (admissionSource !== 'All') parts.push(admissionSource);
    if (feeStatus !== 'All') {
      parts.push(
        feeStatus === 'Has Dues'
          ? 'Remaining Dues'
          : feeStatus === 'No due date'
          ? 'No Due Date'
          : feeStatus === 'No fee / Waived'
          ? 'No Fee / Waived'
          : `Status: ${feeStatus}`
      );
    }
    if (chipFilter !== 'All') parts.push(chipFilter);
    if (debouncedSearch.trim()) parts.push(`Search: "${debouncedSearch.trim()}"`);
    return parts.length > 0 ? parts.join(' • ') : 'All Students';
  }, [admissionSession, admissionType, admissionSource, feeStatus, chipFilter, debouncedSearch]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setChipFilter('All');
    setAdmissionSource('All');
    setAdmissionType('All');
    setAdmissionSession('All');
    setFeeStatus('All');
    setMobileFiltersOpen(false);
    if (searchParams.get('session') || searchParams.get('dues') || searchParams.get('fee_status') || searchParams.get('feeStatus')) {
      const next = new URLSearchParams(searchParams);
      next.delete('session');
      next.delete('dues');
      next.delete('fee_status');
      next.delete('feeStatus');
      setSearchParams(next, { replace: true });
    }
  };

  // Toggle sorting
  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Student Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Search students, monitor fee dues, and manage college admissions
          </p>
        </div>

        {/* Action Buttons: Desktop and Mobile Optimized */}
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => loadData()}
            disabled={loading}
            aria-label="Refresh student list"
            title="Refresh student records"
            className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 shadow-sm transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 dark:text-teal-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline ml-1.5">Refresh</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={() =>
              exportStudentsToCSV(
                sortedStudents,
                `JMT_Students_Report_${new Date().toISOString().split('T')[0]}.csv`,
                brokers
              )
            }
            aria-label="Export students to CSV"
            title="Download active student records as CSV"
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 shadow-sm transition-colors active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden xs:inline">Export Excel</span>
          </button>

          {/* Print Report / Preview button */}
          <button
            onClick={() => setShowPrintPreview(true)}
            disabled={loading || sortedStudents.length === 0}
            aria-label="Print preview report"
            title="Open printable report preview"
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 shadow-sm transition-colors active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden xs:inline">Print Report</span>
          </button>

          {/* Primary Action: Enroll Student */}
          <Link
            to="/enroll"
            aria-label="Enroll new student"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 min-h-[44px] focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Enroll Student</span>
          </Link>
        </div>
      </div>

      {/* 2. Status Segmented Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'active', label: 'Active Students', count: tabCounts.active },
          { id: 'passed_out', label: 'Passed Out', count: tabCounts.passed_out },
          { id: 'left', label: 'Left', count: tabCounts.left },
          { id: 'all', label: 'All Students', count: tabCounts.all }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setStatusTab(tab.id);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all min-h-[40px] ${
              statusTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-sans tabular-nums font-extrabold ${
                statusTab === tab.id
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700/60'
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Summary Cards (3 small cards, calculated from filtered data) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Total / Matching Students */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="truncate">
                {statusTab === 'left'
                  ? 'Left Students'
                  : statusTab === 'passed_out'
                  ? 'Passed Out Students'
                  : isAnyFilterActive
                  ? 'Matching Students'
                  : 'Total Students'}
              </span>
            </div>
            {isAnyFilterActive && (
              <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                Filtered
              </span>
            )}
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-slate-900 dark:text-white font-sans tabular-nums">
            {loading ? (
              <div className="h-6 sm:h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-0.5" />
            ) : (
              summaryMetrics.totalStudents.toLocaleString()
            )}
          </div>
        </div>

        {/* Total Dues / Outstanding Dues */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <CreditCard className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                {statusTab === 'left'
                  ? 'Outstanding Dues (Left)'
                  : statusTab === 'passed_out'
                  ? 'Outstanding Dues (Passed Out)'
                  : isAnyFilterActive
                  ? 'Dues in Results'
                  : 'Total Dues'}
              </span>
            </div>
            {isAnyFilterActive && (
              <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                Filtered
              </span>
            )}
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-amber-800 dark:text-amber-300 font-sans tabular-nums whitespace-nowrap truncate">
            {loading ? (
              <div className="h-6 sm:h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-0.5" />
            ) : (
              formatCurrency(summaryMetrics.totalDues)
            )}
          </div>
        </div>

        {/* Overdue Students (Active/All) OR Total Collected (Left/Passed Out) */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400 text-xs font-semibold mb-1">
            <div className="flex items-center gap-1.5 truncate">
              {statusTab === 'left' || statusTab === 'passed_out' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Total Collected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="truncate">{isAnyFilterActive ? 'Overdue in Results' : 'Overdue Students'}</span>
                </>
              )}
            </div>
            {isAnyFilterActive && (
              <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                Filtered
              </span>
            )}
          </div>
          <div className={`text-base sm:text-2xl font-extrabold font-sans tabular-nums ${
            statusTab === 'left' || statusTab === 'passed_out'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          }`}>
            {loading ? (
              <div className="h-6 sm:h-8 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-0.5" />
            ) : statusTab === 'left' || statusTab === 'passed_out' ? (
              formatCurrency(summaryMetrics.totalPaid)
            ) : (
              summaryMetrics.overdueStudents.toLocaleString()
            )}
          </div>
        </div>
      </div>

      {/* 4. Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        {/* Search Input & Mobile Filter Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              aria-label="Search students by name or father name"
              placeholder="Search student name or father name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Sheet Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            aria-label="Toggle filters"
            className={`md:hidden px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 min-h-[44px] transition-colors ${
              mobileFiltersOpen || isAnyFilterActive
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-800 dark:text-teal-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Filters</span>
            {isAnyFilterActive && (
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
            )}
          </button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {(statusTab === 'left' || statusTab === 'passed_out'
              ? [
                  { id: 'All', label: 'All' },
                  { id: 'Paid', label: 'Paid in Full', badgeColor: 'bg-emerald-500' }
                ]
              : [
                  { id: 'All', label: 'All' },
                  { id: 'Overdue', label: 'Overdue', badgeColor: 'bg-rose-500' },
                  { id: 'Due this week', label: 'Due this week', badgeColor: 'bg-amber-500' },
                  { id: 'Paid', label: 'Paid', badgeColor: 'bg-emerald-500' }
                ]
            ).map((chip) => {
              const isActive = chipFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setChipFilter(chip.id)}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {chip.badgeColor && !isActive && (
                    <span className={`w-2 h-2 rounded-full ${chip.badgeColor}`}></span>
                  )}
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Clear Filters Button (Desktop & Inline) */}
          {isAnyFilterActive && (
            <button
              onClick={handleClearFilters}
              aria-label="Clear all filters"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Collapsible Dropdowns: Always visible on md+, toggled on mobile */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 ${
            mobileFiltersOpen ? 'block' : 'hidden md:grid'
          }`}
        >
          {/* Admission Channel */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Admission Channel
            </label>
            <select
              value={admissionSource}
              onChange={(e) => setAdmissionSource(e.target.value)}
              aria-label="Filter by Admission Channel"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="All">All Channels</option>
              <option value="Direct">Direct</option>
              <option value="Referral">Referral</option>
            </select>
          </div>

          {/* Admission Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Admission Type
            </label>
            <select
              value={admissionType}
              onChange={(e) => setAdmissionType(e.target.value)}
              aria-label="Filter by Admission Type"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="All">All Admission Types</option>
              <option value="Regular">Regular</option>
              <option value="Private">Private</option>
              <option value="Combine (Gap)">Combine (Gap)</option>
            </select>
          </div>

          {/* Admission Session */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Admission Session
            </label>
            <select
              value={admissionSession}
              onChange={(e) => setAdmissionSession(e.target.value)}
              aria-label="Filter by Admission Session"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="All">All Sessions</option>
              <option value="Annual I">Annual I</option>
              <option value="Annual II">Annual II</option>
            </select>
          </div>

          {/* Fee Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Fee Status
            </label>
            <select
              value={feeStatus}
              onChange={(e) => setFeeStatus(e.target.value)}
              aria-label="Filter by Fee Status"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="All">All Fee Statuses</option>
              <option value="Has Dues">Has Remaining Dues</option>
              <option value="No due date">No Due Date (Dues without date)</option>
              <option value="Paid in Full">Paid in Full</option>
              <option value="No fee / Waived">No fee / Waived</option>
              <option value="Due">Due</option>
              <option value="Overdue">Overdue</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          {/* Mobile Clear Filters Button */}
          {isAnyFilterActive && (
            <div className="sm:hidden pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <X className="w-4 h-4" />
                <span>Clear All Active Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Table & Cards Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Loading State: Skeleton Cards / Rows */}
        {loading ? (
          <div className="p-4 sm:p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
            <div className="text-base font-bold text-slate-800 dark:text-slate-200">
              {error}
            </div>
            <button
              onClick={() => loadData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        ) : allStudents.length === 0 ? (
          /* Empty Database State */
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600" />
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No students enrolled yet
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Get started by enrolling your first student into Annual I or Annual II.
            </p>
            <div className="pt-2">
              <Link
                to="/enroll"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Enroll Student</span>
              </Link>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          /* Empty Filters / Search Result State */
          <div className="p-12 text-center space-y-3">
            <Search className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600" />
            <div className="text-base font-bold text-slate-800 dark:text-slate-200">
              No students match your filters
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your search query, selecting another session, or clearing filters.
            </p>
            <div className="pt-2">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ============================================================= */}
            {/* 5. Mobile Layout (Below 768px): Card List                      */}
            {/* ============================================================= */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800/80">
              {paginatedStudents.map((student) => {
                const statusInfo = getFeeStatus(student);
                const stageInfo = getStageInfo(student);
                const isPaidFull = statusInfo.isPaid;
                const isNoFee = (Number(student.total_fee) || 0) <= 0;
                const paidPercent = !isNoFee && student.total_fee > 0
                  ? Math.min(100, Math.round(((student.total_paid || 0) / student.total_fee) * 100))
                  : 0;

                return (
                  <div
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer select-none"
                  >
                    {/* Line 1: Student Name + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                            {toTitleCase(student.student_name)}
                          </span>
                          {isArchived(student) && (
                            <StudentStatusBadge status={student.status} size="xs" />
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge
                          status={statusInfo.status}
                          label={statusInfo.isOverdue ? statusInfo.label : statusInfo.badge}
                        />
                      </div>
                    </div>

                    {/* Line 2: Father Name + Tap-to-call Phone */}
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center flex-wrap gap-2">
                      <span>Father: <strong className="text-slate-800 dark:text-slate-200">{toTitleCase(student.father_name)}</strong></span>
                      {student.contact_number ? (
                        <a
                          href={`tel:${student.contact_number}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-sans tabular-nums text-teal-700 dark:text-teal-400 hover:underline min-h-[36px] py-1 px-1.5 -my-1 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-500/30"
                          title="Call student contact"
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{formatPhoneNumber(student.contact_number)}</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForEdit(student);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                          title="Click to edit and add phone number"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>No phone number</span>
                        </button>
                      )}
                    </div>

                    {/* Line 3: Academic Stream + Small Tags */}
                    <div className="flex items-center flex-wrap gap-1.5 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {student.academic_class} · {student.program_group}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 text-[11px]">
                        {student.admission_type}
                      </span>
                      {student.admission_source === 'Referral' && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30 text-[11px]">
                          Referral
                        </span>
                      )}
                      {stageInfo && (
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          • {stageInfo.label}
                        </span>
                      )}
                    </div>

                    {/* Fee Block: High-Visibility Progress Bar */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="text-slate-700 dark:text-slate-300 font-sans">
                          <span className="text-slate-500 dark:text-slate-400">Paid: </span>
                          <strong className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{formatCurrency(student.total_paid)}</strong>
                          <span className="text-slate-400 dark:text-slate-500 mx-1">of</span>
                          <span className="text-slate-700 dark:text-slate-300 tabular-nums">{formatCurrency(student.total_fee)}</span>
                        </div>
                        {isNoFee ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                            No Fee
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-sans tabular-nums font-extrabold border ${
                              paidPercent === 100
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                                : paidPercent > 0
                                ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/40'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {paidPercent}% Paid
                          </span>
                        )}
                      </div>

                      {/* Recessed High-Contrast Progress Gauge */}
                      <div
                        className="w-full h-3 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner"
                        role="progressbar"
                        aria-valuenow={isNoFee ? 0 : paidPercent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label={isNoFee ? 'No fee applies to this student' : `Fee payment progress: ${paidPercent}%`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                            isNoFee
                              ? 'bg-transparent'
                              : paidPercent === 100
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : paidPercent > 0
                              ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 dark:from-teal-400 dark:to-emerald-400'
                              : 'bg-transparent'
                          }`}
                          style={{ width: isNoFee ? '0%' : `${paidPercent}%` }}
                        ></div>
                      </div>

                      {/* Dues & Due Date */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800/80 font-sans tabular-nums">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 mr-1.5">Dues:</span>
                          <span
                            className={`font-extrabold ${
                              statusInfo.isOverdue
                                ? 'text-rose-600 dark:text-rose-400'
                                : student.dues > 0
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatCurrency(student.dues)}
                          </span>
                        </div>

                        {student.dues > 0 && (
                          student.next_payment_due_date ? (
                            <div
                              className={`text-[11px] font-semibold ${
                                statusInfo.isOverdue
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Due {formatDate(student.next_payment_due_date)}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForEdit(student);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                              title="Click to set due date"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>No due date set</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Bottom Row Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {!isPaidFull && !isArchived(student) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForPayment(student);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Record Payment</span>
                        </button>
                      )}

                      {/* ⋯ Actions Menu Button */}
                      <div className="relative student-action-menu-container">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === student.id ? null : student.id);
                          }}
                          aria-label={`Actions for ${student.student_name}`}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Menu Dropdown */}
                        {openMenuId === student.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-full mb-1 w-52 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-30 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-700/60"
                          >
                            <div className="py-1">
                              {!isArchived(student) && student.dues > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedStudentForNotice(student);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 min-h-[40px]"
                                >
                                  <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>Fee Due Notice</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setSelectedStudentForSlip(student);
                                }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 min-h-[40px]"
                              >
                                <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                                <span>Generate Fee Slip</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setSelectedStudentForEdit(student);
                                }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 min-h-[40px]"
                              >
                                <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Edit Student</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setSelectedStudentForProgress(student);
                                }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 min-h-[40px]"
                              >
                                <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0" />
                                <span>Enrollment Card / Stages</span>
                              </button>

                              {/* Change Status (Active students) */}
                              {!isArchived(student) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedStudentForChangeStatus(student);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-2 min-h-[40px] font-semibold"
                                >
                                  <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Change Status…</span>
                                </button>
                              )}

                              {/* Reopen as Active (Archived students, Admin only) */}
                              {isArchived(student) && isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedStudentForReopen(student);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 flex items-center gap-2 min-h-[40px] font-semibold"
                                >
                                  <RotateCcw className="w-4 h-4 text-teal-600 shrink-0" />
                                  <span>Reopen as Active</span>
                                </button>
                              )}
                            </div>

                            {/* Safe Delete (Admin only) */}
                            {isAdmin && (
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedStudentForSafeDelete(student);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2 min-h-[40px]"
                                >
                                  <Trash2 className="w-4 h-4 shrink-0" />
                                  <span>Delete Student</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============================================================= */}
            {/* 6. Desktop Table (Simplified 6 Columns)                       */}
            {/* ============================================================= */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {/* Column 1: Student (Sortable) */}
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('name')}
                        className="inline-flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors uppercase font-bold"
                      >
                        <span>Student</span>
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </th>

                    {/* Column 2: Class / Program */}
                    <th className="py-3 px-4">Class / Program</th>

                    {/* Column 3: Fee */}
                    <th className="py-3 px-4">Fee Progress</th>

                    {/* Column 4: Dues (Sortable) */}
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('dues')}
                        className="inline-flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors uppercase font-bold"
                      >
                        <span>Dues</span>
                        {sortField === 'dues' ? (
                          sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </th>

                    {/* Column 5: Status & Due Date (Sortable) */}
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('due_date')}
                        className="inline-flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors uppercase font-bold"
                      >
                        <span>Status &amp; Due Date</span>
                        {sortField === 'due_date' ? (
                          sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </th>

                    {/* Column 6: Actions */}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
                  {paginatedStudents.map((student) => {
                    const statusInfo = getFeeStatus(student);
                    const stageInfo = getStageInfo(student);
                    const isPaidFull = statusInfo.isPaid;
                    const isNoFee = (Number(student.total_fee) || 0) <= 0;
                    const paidPercent = !isNoFee && student.total_fee > 0
                      ? Math.min(100, Math.round(((student.total_paid || 0) / student.total_fee) * 100))
                      : 0;

                    return (
                      <tr
                        key={student.id}
                        tabIndex={0}
                        role="row"
                        onClick={() => navigate(`/students/${student.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/students/${student.id}`);
                        }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800/60 focus:outline-none"
                      >
                        {/* Col 1: Student */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {toTitleCase(student.student_name)}
                            </span>
                            {isArchived(student) && (
                              <StudentStatusBadge status={student.status} size="xs" />
                            )}
                            {student.admission_source === 'Referral' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                                Referral
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Father: <span className="font-medium">{toTitleCase(student.father_name)}</span>
                            {student.contact_number ? (
                              <span className="font-sans tabular-nums text-slate-500 dark:text-slate-400 ml-2">
                                {formatPhoneNumber(student.contact_number)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudentForEdit(student);
                                }}
                                className="inline-flex items-center gap-1 ml-2 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                title="Click to edit and add phone number"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>No phone number</span>
                              </button>
                            )}
                          </div>
                          {stageInfo && (
                            <div className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                              {stageInfo.label}
                            </div>
                          )}
                        </td>

                        {/* Col 2: Class / Program */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {student.academic_class} · {student.program_group}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            <span className="font-semibold text-teal-700 dark:text-teal-400">{student.admission_type}</span>
                            <span className="mx-1">•</span>
                            <span>{student.admission_session}</span>
                          </div>
                        </td>

                        {/* Col 3: Fee Progress */}
                        <td className="py-3 px-4 min-w-[180px]">
                          <div className="flex items-center justify-between text-xs font-sans tabular-nums mb-1.5 gap-2">
                            <div className="font-bold truncate text-slate-800 dark:text-slate-200">
                              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{formatCurrency(student.total_paid)}</span>
                              <span className="text-slate-400 dark:text-slate-500 font-normal mx-1">/</span>
                              <span className="text-slate-600 dark:text-slate-400 font-semibold">{formatCurrency(student.total_fee)}</span>
                            </div>
                            {isNoFee ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold shrink-0 border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                                No Fee
                              </span>
                            ) : (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-sans tabular-nums font-extrabold shrink-0 border ${
                                  paidPercent === 100
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                                    : paidPercent > 0
                                    ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {paidPercent}%
                              </span>
                            )}
                          </div>

                          {/* Recessed High-Contrast Progress Gauge */}
                          <div
                            className="w-full h-2.5 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner"
                            role="progressbar"
                            aria-valuenow={isNoFee ? 0 : paidPercent}
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label={isNoFee ? 'No fee applies to this student' : `Fee payment progress: ${paidPercent}%`}
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                                isNoFee
                                  ? 'bg-transparent'
                                  : paidPercent === 100
                                  ? 'bg-emerald-500 dark:bg-emerald-400'
                                  : paidPercent > 0
                                  ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 dark:from-teal-400 dark:to-emerald-400'
                                  : 'bg-transparent'
                              }`}
                              style={{ width: isNoFee ? '0%' : `${paidPercent}%` }}
                            ></div>
                          </div>
                        </td>

                        {/* Col 4: Dues */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans tabular-nums">
                          <span
                            className={`font-bold text-sm ${
                              statusInfo.isOverdue
                                ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                : student.dues > 0
                                ? 'text-amber-700 dark:text-amber-400 font-bold'
                                : 'text-emerald-600 dark:text-emerald-400 font-bold'
                            }`}
                          >
                            {formatCurrency(student.dues)}
                          </span>
                        </td>

                        {/* Col 5: Status & Due Date */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <StatusBadge
                              status={statusInfo.status}
                              label={statusInfo.isOverdue ? statusInfo.label : statusInfo.badge}
                            />
                            {student.dues > 0 && (
                              student.next_payment_due_date ? (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                                  Due: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(student.next_payment_due_date)}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudentForEdit(student);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-left"
                                  title="Click to set due date"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>No due date set</span>
                                </button>
                              )
                            )}
                          </div>
                        </td>

                        {/* Col 6: Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaidFull && !isArchived(student) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudentForPayment(student);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold border border-teal-300 dark:border-teal-500/40 shadow-sm transition-colors whitespace-nowrap"
                              >
                                Record Payment
                              </button>
                            )}

                            {/* ⋯ Menu */}
                            <div className="relative student-action-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === student.id ? null : student.id);
                                }}
                                aria-label={`Actions for ${student.student_name}`}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === student.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-30 py-1 text-left divide-y divide-slate-100 dark:divide-slate-700/60"
                                >
                                  <div className="py-1">
                                    {!isArchived(student) && student.dues > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setSelectedStudentForNotice(student);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2"
                                      >
                                        <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span>Fee Due Notice</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedStudentForSlip(student);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                      <span>Generate Fee Slip</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedStudentForEdit(student);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span>Edit Student</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedStudentForProgress(student);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                      <span>Enrollment Card / Stages</span>
                                    </button>

                                    {/* Change Status (Active students) */}
                                    {!isArchived(student) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setSelectedStudentForChangeStatus(student);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Change Status…</span>
                                      </button>
                                    )}

                                    {/* Reopen as Active (Archived students, Admin only) */}
                                    {isArchived(student) && isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setSelectedStudentForReopen(student);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 flex items-center gap-2 font-semibold"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                        <span>Reopen as Active</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Safe Delete (Admin only) */}
                                  {isAdmin && (
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setSelectedStudentForSafeDelete(student);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Delete Student</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Showing{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {totalFilteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {Math.min(currentPage * pageSize, totalFilteredCount)}
                  </strong>{' '}
                  of{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {totalFilteredCount}
                  </strong>{' '}
                  students
                </span>

                {/* Rows per page dropdown selector */}
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="text-[11px] font-semibold">Rows per page:</span>
                  <select
                    value={pageSize >= 99999 ? 'all' : pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    aria-label="Students per page"
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-teal-500 shadow-sm cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={40}>40 (Default)</option>
                    <option value={60}>60</option>
                    <option value={100}>100</option>
                    <option value="all">All ({totalFilteredCount})</option>
                  </select>
                </div>
              </div>

              {/* Prev / Next Pagination Controls */}
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 shadow-sm transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 shadow-sm transition-colors flex items-center gap-1 min-h-[36px]"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>


      {/* ================================================================= */}
      {/* 8. Linked Modals (Fee Slip, Notice, Payment, Progress, Edit)      */}
      {/* ================================================================= */}

      {/* Fee Slip Modal */}
      {selectedStudentForSlip && (
        <FeeSlipModal
          isOpen={!!selectedStudentForSlip}
          onClose={() => setSelectedStudentForSlip(null)}
          student={selectedStudentForSlip}
          latestPayment={
            selectedStudentForSlip.payments?.[selectedStudentForSlip.payments.length - 1]
          }
        />
      )}

      {/* Fee Due Notice Modal */}
      {selectedStudentForNotice && (
        <FeeDueNoticeModal
          isOpen={!!selectedStudentForNotice}
          onClose={() => setSelectedStudentForNotice(null)}
          student={selectedStudentForNotice}
          onNoticeCreated={() => loadData()}
        />
      )}

      {/* Add Payment Modal */}
      {selectedStudentForPayment && (
        <AddPaymentModal
          isOpen={!!selectedStudentForPayment}
          onClose={() => setSelectedStudentForPayment(null)}
          student={selectedStudentForPayment}
          onPaymentAdded={() => loadData()}
        />
      )}

      {/* Manage Progress Modal */}
      {selectedStudentForProgress && (
        <ManageProgressModal
          isOpen={!!selectedStudentForProgress}
          onClose={() => setSelectedStudentForProgress(null)}
          student={selectedStudentForProgress}
          onProgressUpdated={() => loadData()}
        />
      )}

      {/* Edit Student Modal */}
      {selectedStudentForEdit && (
        <EditStudentModal
          isOpen={!!selectedStudentForEdit}
          onClose={() => setSelectedStudentForEdit(null)}
          student={selectedStudentForEdit}
          onStudentUpdated={() => loadData()}
        />
      )}

      {/* Print Preview & Report Modal */}
      {showPrintPreview && (
        <PrintReportModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          students={sortedStudents}
          brokers={brokers}
          activeFilterDescription={activeFilterDescription}
        />
      )}

      {/* Change Status Modal (Passed Out, Left, Transferred, Struck Off) */}
      <ChangeStatusModal
        isOpen={!!selectedStudentForChangeStatus}
        onClose={() => setSelectedStudentForChangeStatus(null)}
        student={selectedStudentForChangeStatus}
        onStatusChanged={() => loadData()}
      />

      {/* Reopen as Active Modal (Admin only) */}
      <ReopenStudentModal
        isOpen={!!selectedStudentForReopen}
        onClose={() => setSelectedStudentForReopen(null)}
        student={selectedStudentForReopen}
        onStudentReopened={() => loadData()}
      />

      {/* Safe Delete Student Modal (Admin only) */}
      <DeleteStudentSafeModal
        isOpen={!!selectedStudentForSafeDelete}
        onClose={() => setSelectedStudentForSafeDelete(null)}
        student={selectedStudentForSafeDelete}
        onDeleted={() => loadData()}
        onChangeStatusInstead={() => {
          const s = selectedStudentForSafeDelete;
          setSelectedStudentForSafeDelete(null);
          setSelectedStudentForChangeStatus(s);
        }}
      />
    </div>
  );
}
export default StudentsPage;

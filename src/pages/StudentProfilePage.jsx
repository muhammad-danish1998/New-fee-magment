import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, BookOpen, DollarSign, Calendar, CreditCard, FileText,
  Share2, Printer, Plus, Trash2, ArrowLeft, CheckCircle2,
  AlertTriangle, Phone, ShieldCheck, Clock, UserCheck, CalendarClock,
  History, Edit3, BellRing, Handshake, RefreshCw, MoreVertical,
  Eye, EyeOff, RotateCcw, ArrowRightLeft, Info, ShieldAlert
} from 'lucide-react';
import { getStudentById, updateStudentProgress, deleteStudent } from '../services/studentService';
import { deletePayment } from '../services/paymentService';
import { getCommitmentsByStudentId } from '../services/commitmentService';
import { getNoticesByStudentId } from '../services/noticeService';
import { getBrokers } from '../services/brokerService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ProgressTracker } from '../components/progress/ProgressTracker';
import { FeeSlipModal } from '../components/fee-slip/FeeSlipModal';
import { AddPaymentModal } from '../components/payments/AddPaymentModal';
import { SetCommitmentModal } from '../components/commitments/SetCommitmentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { AssignBrokerModal } from '../components/brokers/AssignBrokerModal';
import { FeeDueNoticeModal } from '../components/notices/FeeDueNoticeModal';
import { NoticeHistoryList } from '../components/notices/NoticeHistoryList';
import { StudentStatusBadge } from '../components/students/StudentStatusBadge';
import { ChangeStatusModal } from '../components/students/ChangeStatusModal';
import { ReopenStudentModal } from '../components/students/ReopenStudentModal';
import { DeleteStudentSafeModal } from '../components/students/DeleteStudentSafeModal';
import { isArchived, isActive, getStudentStatusConfig } from '../utils/studentStatus';
import { formatCurrency, formatDate, getFeeStatus } from '../utils/feeCalculator';

export function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  const [student, setStudent] = useState(null);
  const [commitments, setCommitments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals and Menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFeeSlip, setShowFeeSlip] = useState(false);
  const [showFeeDueNotice, setShowFeeDueNotice] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showSetCommitment, setShowSetCommitment] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showAssignBroker, setShowAssignBroker] = useState(false);
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showSafeDeleteModal, setShowSafeDeleteModal] = useState(false);
  const [selectedSlipPayment, setSelectedSlipPayment] = useState(null);

  // CNIC Masking visibility (Only Administrator role can toggle)
  const [revealStudentCnic, setRevealStudentCnic] = useState(false);
  const [revealFatherCnic, setRevealFatherCnic] = useState(false);

  // Safety Confirmations
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  const moreMenuRef = useRef(null);

  // Close more menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadStudent = async () => {
    try {
      setLoading(true);
      setError('');
      const [data, commitmentList, noticeList, brokersList] = await Promise.all([
        getStudentById(id),
        getCommitmentsByStudentId(id),
        getNoticesByStudentId(id),
        getBrokers()
      ]);

      if (!data) {
        setError('Student record not found.');
      } else {
        setStudent(data);
        setCommitments(commitmentList);
        setNotices(noticeList || []);
        setBrokers(brokersList || []);
      }
    } catch (err) {
      console.error('Error fetching student:', err);
      setError('Unable to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadStudent();
    }
  }, [id]);

  const handleUpdateProgress = async (stepUpdates) => {
    try {
      await updateStudentProgress(student.id, stepUpdates);
      await loadStudent();
    } catch (err) {
      alert('Failed to update student progress: ' + err.message);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      setIsDeletingPayment(true);
      await deletePayment(paymentToDelete.id);
      await loadStudent();
      setPaymentToDelete(null);
    } catch (err) {
      alert('Failed to delete payment: ' + err.message);
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const confirmDeleteStudent = async () => {
    try {
      setIsDeleting(true);
      await deleteStudent(student.id);
      navigate('/students');
    } catch (err) {
      alert('Failed to delete student: ' + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";

  const handleDirectWhatsApp = () => {
    if (!student) return;
    const isPaidInFull = student.dues === 0;
    let message = '';
    if (isPaidInFull) {
      message = `Dear ${student.student_name},\n\nYour fee payment has been received successfully.\n\nTotal Fee: ${formatCurrency(student.total_fee)}\nTotal Paid: ${formatCurrency(student.total_paid)}\nRemaining Dues: Rs.0\n\nStatus: PAID IN FULL\n\nThank you.\n${collegeName}`;
    } else {
      message = `Dear ${student.student_name},\n\nFee Summary & Payment Reminder:\n\nTotal Fee: ${formatCurrency(student.total_fee)}\nTotal Paid: ${formatCurrency(student.total_paid)}\nRemaining Dues: ${formatCurrency(student.dues)}\n${student.next_payment_due_date ? `Next Due Date: ${formatDate(student.next_payment_due_date)}\n` : ''}${student.promised_amount ? `Promised Amount: ${formatCurrency(student.promised_amount)}\n` : ''}\nThank you.\n${collegeName}`;
    }

    const cleanPhone = (student.contact_number || '').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  const maskCNIC = (cnic, isRevealed) => {
    if (!cnic) return 'N/A';
    if (isRevealed && isAdmin) return cnic;
    const digits = cnic.replace(/[^0-9]/g, '');
    if (digits.length === 13) {
      return `${digits.slice(0, 5)}-*****-${digits.slice(12)}`;
    }
    if (cnic.length > 6) {
      return `${cnic.slice(0, 3)}****${cnic.slice(-2)}`;
    }
    return '*****';
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-56"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-32"></div>
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
          <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
        </div>
        <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{error || 'Student Not Found'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested student record could not be loaded from the database.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => loadStudent()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try again</span>
          </button>
          <Link
            to="/students"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Students</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getFeeStatus(student);
  const paidPercent = student && student.total_fee > 0
    ? Math.min(100, Math.round(((student.total_paid || 0) / student.total_fee) * 100))
    : 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28 md:pb-8">
      {/* ============================================================= */}
      {/* 1. Header (Mobile-First 3-Action Header)                       */}
      {/* ============================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-white transition-colors mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students List</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {student.student_name}
            </h1>
            <StudentStatusBadge status={student.status} size="sm" />
            <StatusBadge
              status={statusInfo.status}
              label={statusInfo.isOverdue ? statusInfo.label : statusInfo.badge}
            />
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              student.admission_source === 'Referral'
                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-500/40'
                : 'bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-600/50'
            }`}>
              {student.admission_source === 'Referral' ? '🤝 Referral Student' : 'Direct Student'}
            </span>
            {student.commitment_status && student.commitment_status !== 'None' && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                student.commitment_status === 'Fulfilled'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600/50'
                  : 'bg-amber-50 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-600/50'
              }`}>
                Commitment: {student.commitment_status}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            S/O {student.father_name} • Enrolled: {formatDate(student.created_at)}
          </p>
        </div>

        {/* 3 Main Actions Header: Record Payment, Send Reminder, ⋯ More */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {!isArchived(student) && student.dues > 0 && (
            <button
              type="button"
              onClick={() => setShowAddPayment(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] min-h-[44px]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          {!isArchived(student) && (
            <button
              type="button"
              onClick={handleDirectWhatsApp}
              title="Send WhatsApp Fee Reminder"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700/60 transition-colors shadow-sm min-h-[44px]"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Send Reminder</span>
            </button>
          )}

          {isArchived(student) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSlipPayment(student.payments?.[student.payments.length - 1] || null);
                setShowFeeSlip(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors shadow-sm min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Print Fee Slip</span>
            </button>
          )}

          {/* ⋯ More Dropdown Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="More actions"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-30 py-1.5 text-xs divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setSelectedSlipPayment(student.payments?.[student.payments.length - 1] || null);
                      setShowFeeSlip(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 min-h-[40px]"
                  >
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Generate Fee Slip</span>
                  </button>

                  {!isArchived(student) && student.dues > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowFeeDueNotice(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 min-h-[40px]"
                    >
                      <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Fee Due Notice</span>
                    </button>
                  )}

                  {!isArchived(student) && student.dues > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowSetCommitment(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 min-h-[40px]"
                    >
                      <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Set / Extend Commitment</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowAssignBroker(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 min-h-[40px]"
                  >
                    <Handshake className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{student.admission_source === 'Referral' ? 'Change Broker' : 'Assign Broker'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowEditStudent(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 min-h-[40px]"
                  >
                    <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Edit Profile</span>
                  </button>

                  {/* Change Status Modal (Available for Active students) */}
                  {!isArchived(student) && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowChangeStatus(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-2.5 min-h-[40px] font-semibold"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Change Status…</span>
                    </button>
                  )}

                  {/* Reopen Modal (Available for Archived students, Admin only) */}
                  {isArchived(student) && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowReopenModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 flex items-center gap-2.5 min-h-[40px] font-semibold"
                    >
                      <RotateCcw className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Reopen as Active</span>
                    </button>
                  )}
                </div>

                {/* Administrator Danger Zone */}
                {isAdmin && (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowSafeDeleteModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2.5 min-h-[40px]"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Delete Profile</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Archival Banner for Archived Students */}
      {isArchived(student) && (
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300/80 dark:border-amber-700/60 shadow-sm space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StudentStatusBadge status={student.status} size="md" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {student.left_date ? `Effective Date: ${formatDate(student.left_date)}` : 'Archived Student'}
              </span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowReopenModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm self-start sm:self-auto min-h-[36px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen as Active</span>
              </button>
            )}
          </div>
          {student.left_reason && (
            <p className="text-xs text-amber-950 dark:text-amber-200 font-medium pl-0.5">
              <span className="font-bold text-amber-900 dark:text-amber-300">Reason / Remarks:</span> {student.left_reason}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300/80 pl-0.5 pt-1.5 border-t border-amber-200 dark:border-amber-800/40 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>This record is archived. All payment transactions and fee records are preserved permanently for accounting integrity.</span>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. Top Section: Fee Summary (Left) + Payment Ledger (Right)    */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Fee Summary Card (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Fee Summary
              </span>
              <StatusBadge
                status={statusInfo.status}
                label={statusInfo.isOverdue ? statusInfo.label : statusInfo.badge}
              />
            </div>

            <div className="space-y-3 text-xs sm:text-sm pt-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                <span>Total Fee</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(student.total_fee)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                <span>Total Paid</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(student.total_paid)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">Remaining Dues</span>
                <span className={`font-mono font-extrabold text-base sm:text-lg ${
                  statusInfo.isOverdue
                    ? 'text-rose-600 dark:text-rose-400'
                    : student.dues > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {formatCurrency(student.dues)}
                </span>
              </div>

              {/* Clearance Progress Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Fee Clearance</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                      paidPercent === 100
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                        : paidPercent > 0
                        ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {paidPercent}% Paid
                  </span>
                </div>
                <div
                  className="w-full h-3 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner"
                  role="progressbar"
                  aria-valuenow={paidPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label={`Fee payment clearance: ${paidPercent}%`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                      paidPercent === 100
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : paidPercent > 0
                        ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 dark:from-teal-400 dark:to-emerald-400'
                        : 'bg-transparent'
                    }`}
                    style={{ width: `${paidPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Due Date Indicator with warning if missing */}
              {student.dues > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/50 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
                  <div className="font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-900 dark:text-amber-200 font-bold">Next Due Date</span>
                    </span>
                    {student.promised_amount && (
                      <span className="font-bold text-amber-900 dark:text-amber-200 font-mono">
                        {formatCurrency(student.promised_amount)}
                      </span>
                    )}
                  </div>

                  {student.next_payment_due_date ? (
                    <div className="text-sm font-extrabold text-amber-950 dark:text-white pl-5">
                      {formatDate(student.next_payment_due_date)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pl-5 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>No due date set</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSetCommitment(true)}
                        className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white text-[10px] font-bold hover:bg-amber-300"
                      >
                        Set Due Date
                      </button>
                    </div>
                  )}

                  {student.commitment_notes && (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300/80 pl-5 italic border-t border-amber-200 dark:border-amber-500/20 pt-1 mt-1">
                      "{student.commitment_notes}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>All tuition fees are paid in full.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Print & Share Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSlipPayment(student.payments?.[student.payments.length - 1] || null);
                setShowFeeSlip(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold border dark:border-slate-700 transition-colors shadow-sm min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Fee Slip</span>
            </button>

            <button
              type="button"
              onClick={handleDirectWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:text-emerald-300 text-xs font-bold border dark:border-emerald-500/30 transition-colors shadow-sm min-h-[44px]"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp Slip</span>
            </button>
          </div>
        </div>

        {/* Right: Payment Ledger / Transactions Card (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                <CreditCard className="w-4 h-4" />
                <span>Payment History &amp; Transactions</span>
              </div>

              {!isArchived(student) && student.dues > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddPayment(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-600/20 hover:bg-teal-100 dark:hover:bg-teal-600/30 text-teal-800 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-500/30 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Payment</span>
                </button>
              )}
            </div>

            {student.payments?.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium space-y-1">
                <p>No payment transactions recorded yet.</p>
                {student.dues > 0 && (
                  <p className="text-teal-600 dark:text-teal-400">Click "Add Payment" above to record the initial tuition receipt.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mobile Transaction Cards (<640px) */}
                <div className="sm:hidden space-y-2.5">
                  {student.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-teal-700 dark:text-teal-300 font-bold">
                          {p.receipt_no || 'RCP-N/A'}
                        </span>
                        <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                        <span>{formatDate(p.payment_date)} • {p.payment_method}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlipPayment(p);
                              setShowFeeSlip(true);
                            }}
                            aria-label={`View fee slip for receipt ${p.receipt_no}`}
                            className="p-1 rounded text-teal-700 dark:text-teal-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentToDelete(p)}
                            aria-label={`Delete payment receipt ${p.receipt_no}`}
                            className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-slate-500 italic border-t border-slate-200 dark:border-slate-800/60 pt-1">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop / Tablet Table (>=640px) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase">
                        <th className="py-2 px-2.5">Receipt #</th>
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Amount</th>
                        <th className="py-2 px-2.5">Method</th>
                        <th className="py-2 px-2.5">Notes</th>
                        <th className="py-2 px-2.5 text-right">Receipt / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {student.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-2.5 font-mono text-teal-700 dark:text-teal-300 font-bold">
                            {p.receipt_no || 'RCP-N/A'}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-800 dark:text-slate-300 font-medium whitespace-nowrap">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="py-2.5 px-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-800 dark:text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-semibold border border-slate-300 dark:border-slate-700">
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-400 text-[11px] max-w-[120px] truncate" title={p.notes || ''}>
                            {p.notes || '-'}
                          </td>
                          <td className="py-2.5 px-2.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSlipPayment(p);
                                setShowFeeSlip(true);
                              }}
                              title="View Fee Slip for this payment"
                              aria-label={`View fee slip for receipt ${p.receipt_no}`}
                              className="p-1 rounded text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentToDelete(p)}
                              title="Delete payment record"
                              aria-label={`Delete payment receipt ${p.receipt_no}`}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3. Lifecycle 4-Step Progress Tracker                           */}
      {/* ============================================================= */}
      <ProgressTracker
        student={student}
        interactive={!isArchived(student)}
        onUpdateStep={handleUpdateProgress}
      />

      {/* ============================================================= */}
      {/* 4. Student Personal Info & Academic Allocation (2 Columns)     */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Details with Role-Guarded CNIC Masking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Student Personal Information</span>
            </div>
            <button
              type="button"
              onClick={() => setShowEditStudent(true)}
              className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Full Name</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">{student.student_name}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Father Name</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{student.father_name}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Gender</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{student.gender || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Date of Birth</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(student.date_of_birth)}</span>
            </div>

            {/* Student CNIC with Masking */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold">Student CNIC / B-Form</span>
                {isAdmin && student.student_cnic && (
                  <button
                    type="button"
                    onClick={() => setRevealStudentCnic(!revealStudentCnic)}
                    className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5"
                    aria-label="Toggle student CNIC visibility"
                  >
                    {revealStudentCnic ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{revealStudentCnic ? 'Hide' : 'Reveal'}</span>
                  </button>
                )}
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-300">
                {maskCNIC(student.student_cnic, revealStudentCnic)}
              </span>
            </div>

            {/* Father CNIC with Masking */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold">Father CNIC</span>
                {isAdmin && student.father_cnic && (
                  <button
                    type="button"
                    onClick={() => setRevealFatherCnic(!revealFatherCnic)}
                    className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5"
                    aria-label="Toggle father CNIC visibility"
                  >
                    {revealFatherCnic ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{revealFatherCnic ? 'Hide' : 'Reveal'}</span>
                  </button>
                )}
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-300">
                {maskCNIC(student.father_cnic, revealFatherCnic)}
              </span>
            </div>

            {/* Contact Number with subtle warning if missing */}
            <div className="col-span-2">
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold mb-0.5">Contact Number</span>
              {student.contact_number ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${student.contact_number}`}
                    className="font-mono font-bold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{student.contact_number}</span>
                  </a>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded px-2 py-0.5">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>No phone number</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEditStudent(true)}
                    className="text-[11px] text-teal-700 dark:text-teal-400 font-bold hover:underline"
                  >
                    Add Number
                  </button>
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Admission Source</span>
              <span className={`inline-block font-extrabold mt-0.5 ${
                student.admission_source === 'Referral' ? 'text-purple-700 dark:text-purple-300' : 'text-teal-700 dark:text-teal-300'
              }`}>
                {student.admission_source || 'Direct'}
              </span>
            </div>

            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Reference / Remarks</span>
              <span className="text-slate-800 dark:text-slate-300 font-medium">{student.reference || 'Direct Admission'}</span>
            </div>
          </div>

          {/* Referral Broker Channel Info Banner if Referral */}
          {student.admission_source === 'Referral' ? (
            <div className="mt-4 p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
                  <Handshake className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300/90 block">Referring Broker / Partner</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {brokers.find(b => b.id === student.broker_id)?.name || 'Referral Partner'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-purple-200 dark:border-purple-500/20 pt-2 sm:pt-0">
                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Agreed Snapshot Amount</span>
                  <span className="font-mono font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                    {formatCurrency(student.broker_agreed_amount || 0)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssignBroker(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-600/30 dark:hover:bg-purple-600/50 text-purple-800 dark:text-purple-200 text-[11px] font-bold border border-purple-300 dark:border-purple-400/30 transition-colors shadow-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Academic Stream & Group Allocation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Admission &amp; Academic Allocation</span>
            </div>
            <button
              type="button"
              onClick={() => setShowEditStudent(true)}
              className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Admission Session</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">{student.admission_session}</span>
            </div>

            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Admission Type</span>
              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-50 dark:bg-slate-800 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-slate-700">
                {student.admission_type}
              </span>
            </div>

            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Program / Group</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{student.program_group}</span>
            </div>

            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[11px] font-bold">Academic Class</span>
              <span className="font-extrabold text-teal-700 dark:text-teal-300 text-sm">{student.academic_class}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <p>
              Class stream and academic group are tied to official Board submission records. Any change will be reflected across fee slips and roll lists.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 5. Payment Commitment & Extension Log Card                    */}
      {/* ============================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Payment Commitment &amp; Extension Log</span>
          </div>

          {!isArchived(student) && student.dues > 0 && (
            <button
              type="button"
              onClick={() => setShowSetCommitment(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-600/20 dark:hover:bg-amber-600/30 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300 dark:border-amber-500/30 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Reschedule Commitment</span>
            </button>
          )}
        </div>

        {commitments.length === 0 ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
            No commitment history recorded yet. You can set a promised payment date anytime.
          </div>
        ) : (
          <div className="space-y-3">
            {commitments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-200">
                      Promised: {formatCurrency(c.promised_amount)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">by</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {formatDate(c.promised_date)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'Fulfilled'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                        : c.status.includes('Extended') || c.status.includes('Partially')
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {c.reason_or_notes && (
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">{c.reason_or_notes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {c.paid_amount > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold block text-[11px]">
                      Paid: {formatCurrency(c.paid_amount)}
                    </span>
                  )}
                  {c.extended_to_date && (
                    <span className="text-amber-700 dark:text-amber-300 block text-[11px]">
                      Extended to: {formatDate(c.extended_to_date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 6. Fee Due Notices & Reminders History Card                   */}
      {/* ============================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
            <BellRing className="w-4 h-4" />
            <span>Fee Due Notices &amp; Reminders ({notices.length})</span>
          </div>
          {!isArchived(student) && student.dues > 0 && (
            <button
              type="button"
              onClick={() => setShowFeeDueNotice(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300 dark:border-amber-500/30 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Notice</span>
            </button>
          )}
        </div>

        <NoticeHistoryList
          student={student}
          notices={notices}
          onReload={() => loadStudent()}
        />
      </div>

      {/* ============================================================= */}
      {/* 7. Mobile Sticky Bottom Action Bar (<768px)                   */}
      {/* ============================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 z-20 shadow-xl">
        {!isArchived(student) ? (
          <>
            {student.dues > 0 && (
              <button
                type="button"
                onClick={() => setShowAddPayment(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDirectWhatsApp}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center gap-1.5 min-h-[44px] transition-colors shadow-sm"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Send Reminder</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedSlipPayment(student.payments?.[student.payments.length - 1] || null);
                setShowFeeSlip(true);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
            >
              <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Print Slip</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowReopenModal(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reopen</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* ============================================================= */}
      {/* 8. Safety Confirmation Modals                                  */}
      {/* ============================================================= */}
      {/* Payment Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleConfirmDeletePayment}
        loading={isDeletingPayment}
        title="Delete Payment Transaction?"
        description={
          paymentToDelete ? (
            <span>
              Are you sure you want to delete payment receipt{' '}
              <strong className="font-mono text-slate-900 dark:text-white">{paymentToDelete.receipt_no}</strong> for{' '}
              <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(paymentToDelete.amount)}</strong>?
              Total paid and student dues will be automatically recalculated.
            </span>
          ) : null
        }
        confirmLabel="Delete Payment"
        cancelLabel="Cancel"
        variant="danger"
        focusCancel={true}
      />

      {/* Change Status Modal (Passed Out, Left, Transferred, Struck Off) */}
      <ChangeStatusModal
        isOpen={showChangeStatus}
        onClose={() => setShowChangeStatus(false)}
        student={student}
        onStatusChanged={() => loadStudent()}
      />

      {/* Reopen as Active Modal (Admin only) */}
      <ReopenStudentModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        student={student}
        onStudentReopened={() => loadStudent()}
      />

      {/* Protected Safe Delete Student Modal (Admin only) */}
      <DeleteStudentSafeModal
        isOpen={showSafeDeleteModal}
        onClose={() => setShowSafeDeleteModal(false)}
        student={student}
        onDeleted={() => navigate('/students')}
        onChangeStatusInstead={() => setShowChangeStatus(true)}
      />

      {/* ============================================================= */}
      {/* 9. Feature Modals                                             */}
      {/* ============================================================= */}
      {/* Fee Slip Modal */}
      {showFeeSlip && (
        <FeeSlipModal
          isOpen={showFeeSlip}
          onClose={() => {
            setShowFeeSlip(false);
            setSelectedSlipPayment(null);
          }}
          student={student}
          latestPayment={selectedSlipPayment}
        />
      )}

      {/* Fee Due Notice Modal */}
      {showFeeDueNotice && (
        <FeeDueNoticeModal
          isOpen={showFeeDueNotice}
          onClose={() => setShowFeeDueNotice(false)}
          student={student}
          onNoticeCreated={() => loadStudent()}
        />
      )}

      {/* Add Payment Modal */}
      {showAddPayment && (
        <AddPaymentModal
          isOpen={showAddPayment}
          onClose={() => setShowAddPayment(false)}
          student={student}
          onPaymentAdded={() => loadStudent()}
        />
      )}

      {/* Set / Reschedule Commitment Modal */}
      {showSetCommitment && (
        <SetCommitmentModal
          isOpen={showSetCommitment}
          onClose={() => setShowSetCommitment(false)}
          student={student}
          onCommitmentSaved={() => loadStudent()}
        />
      )}

      {/* Edit Student Profile Modal */}
      {showEditStudent && (
        <EditStudentModal
          isOpen={showEditStudent}
          onClose={() => setShowEditStudent(false)}
          student={student}
          onStudentUpdated={() => loadStudent()}
        />
      )}

      {/* Quick Assign / Change Broker Modal */}
      {showAssignBroker && (
        <AssignBrokerModal
          isOpen={showAssignBroker}
          onClose={() => setShowAssignBroker(false)}
          student={student}
          onAssigned={() => loadStudent()}
        />
      )}
    </div>
  );
}

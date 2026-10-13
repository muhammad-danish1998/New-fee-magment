import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  AlertCircle,
  DollarSign,
  Calendar,
  BookOpen,
  User,
  Handshake,
  Phone,
  CreditCard,
  CalendarClock,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { updateStudent } from '../../services/studentService';
import { adjustStudentPaidAmount } from '../../services/paymentService';
import { getAdmissionConfig } from '../../services/configService';
import { getActiveBrokers } from '../../services/brokerService';
import { formatCurrency } from '../../utils/feeCalculator';
import { formatCNIC, isValidCNIC } from '../../utils/cnicHelper';
import { formatPakistaniPhoneInput } from '../../utils/phoneHelper';

export function EditStudentModal({ isOpen, onClose, student, onStudentUpdated }) {
  if (!isOpen || !student) return null;

  const [config, setConfig] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    student_name: student.student_name || '',
    father_name: student.father_name || '',
    date_of_birth: student.date_of_birth || '',
    student_cnic: student.student_cnic || '',
    father_cnic: student.father_cnic || '',
    gender: student.gender || 'Male',
    contact_number: student.contact_number || '',
    reference: student.reference || '',
    admission_source: student.admission_source || 'Direct',
    broker_id: student.broker_id || '',
    broker_agreed_amount:
      student.broker_agreed_amount !== null && student.broker_agreed_amount !== undefined
        ? String(student.broker_agreed_amount)
        : '',
    admission_session: student.admission_session || 'Annual I',
    admission_type: student.admission_type || 'Regular',
    program_group: student.program_group || '',
    academic_class: student.academic_class || '',
    total_fee: student.total_fee || 0,
    paid_amount: student.total_paid !== undefined ? String(student.total_paid) : '0',
    next_payment_due_date: student.next_payment_due_date || '',
    commitment_notes: student.commitment_notes || ''
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load config & active brokers
  useEffect(() => {
    async function loadData() {
      try {
        const [configData, brokersData] = await Promise.all([
          getAdmissionConfig(),
          getActiveBrokers()
        ]);
        setConfig(configData);
        setBrokers(brokersData || []);
      } catch (err) {
        console.error('Failed to load config or brokers in EditStudentModal:', err);
      }
    }
    loadData();
  }, []);

  const handleAdmissionTypeChange = (newType) => {
    if (!config) return;
    const programs = config.programGroups[newType] || [];
    const classes = config.academicClasses[newType] || [];

    setFormData((prev) => ({
      ...prev,
      admission_type: newType,
      program_group: programs[0] || prev.program_group,
      academic_class: classes[0] || prev.academic_class
    }));
  };

  const handleBrokerChange = (brokerId) => {
    const found = brokers.find((b) => b.id === brokerId);
    const agreed = found ? String(found.current_agreed_amount || '') : '';
    setFormData((prev) => ({
      ...prev,
      broker_id: brokerId,
      broker_agreed_amount: agreed || prev.broker_agreed_amount,
      total_fee: agreed || prev.total_fee,
      // If contact number is empty, default to broker's phone
      contact_number: !prev.contact_number && found?.phone ? formatPakistaniPhoneInput(found.phone) : prev.contact_number
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const totalFeeNum = Number(formData.total_fee) || 0;
    const paidNum = Number(formData.paid_amount) >= 0 ? Number(formData.paid_amount) : 0;
    const rawCnic = formData.student_cnic?.trim();

    if (!formData.student_name.trim() || !formData.father_name.trim()) {
      setError('Student Name and Father Name are required.');
      return;
    }

    if (!rawCnic) {
      setError('Student CNIC is required.');
      return;
    }

    if (!isValidCNIC(rawCnic)) {
      setError('Student CNIC must match the required pattern: XXXXX-XXXXXXX-X (13 digits).');
      return;
    }

    if (paidNum > totalFeeNum) {
      setError(`Paid amount (${formatCurrency(paidNum)}) cannot exceed Total Fee (${formatCurrency(totalFeeNum)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await updateStudent(student.id, {
        student_name: formData.student_name.trim(),
        father_name: formData.father_name.trim(),
        date_of_birth: formData.date_of_birth || null,
        student_cnic: rawCnic,
        father_cnic: formData.father_cnic.trim() ? formatCNIC(formData.father_cnic) : null,
        gender: formData.gender,
        contact_number: formData.contact_number.trim() || null,
        reference: formData.reference.trim() || null,
        admission_source: formData.admission_source,
        broker_id: formData.admission_source === 'Referral' ? formData.broker_id : null,
        broker_agreed_amount:
          formData.admission_source === 'Referral' ? Number(formData.broker_agreed_amount) || 0 : null,
        admission_session: formData.admission_session,
        admission_type: formData.admission_type,
        program_group: formData.program_group,
        academic_class: formData.academic_class,
        total_fee: totalFeeNum,
        commitment_notes: formData.commitment_notes?.trim() || null,
        next_payment_due_date: formData.next_payment_due_date || null
      });

      if (paidNum !== Number(student.total_paid || 0)) {
        await adjustStudentPaidAmount(student.id, paidNum, 'Profile Edit Fee Adjustment');
      }

      if (onStudentUpdated) {
        onStudentUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Error updating student:', err);
      setError(err.message || 'Failed to update student profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentProgramList = config?.programGroups?.[formData.admission_type] || [];
  const currentClassList = config?.academicClasses?.[formData.admission_type] || [];

  // Live calculation of remaining dues
  const totalFeeVal = Number(formData.total_fee) || 0;
  const paidVal = Number(formData.paid_amount) || 0;
  const liveDues = Math.max(0, totalFeeVal - paidVal);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="edit-student-modal-title" className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Edit Student Profile
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Editing: <span className="font-semibold text-slate-800 dark:text-slate-200">{student.student_name}</span>
                {student.program_group ? ` • ${student.program_group}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-student-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Section 1: Admission Source Channel */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Handshake className="w-4 h-4" />
                <span>Admission Source Channel</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Current: <strong className="text-slate-800 dark:text-slate-200">{formData.admission_source}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, admission_source: 'Direct' })}
                className={`p-2.5 sm:p-3 rounded-xl border font-bold text-center transition-all ${
                  formData.admission_source === 'Direct'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
              >
                Direct Student
              </button>

              <button
                type="button"
                onClick={() => {
                  const defaultBrokerId = formData.broker_id || (brokers[0]?.id || '');
                  const defaultBrokerAmount =
                    formData.broker_agreed_amount ||
                    (brokers[0]?.current_agreed_amount ? String(brokers[0].current_agreed_amount) : '');
                  const foundBroker = brokers.find((b) => b.id === defaultBrokerId);

                  setFormData({
                    ...formData,
                    admission_source: 'Referral',
                    broker_id: defaultBrokerId,
                    broker_agreed_amount: defaultBrokerAmount,
                    contact_number:
                      !formData.contact_number && foundBroker?.phone
                        ? formatPakistaniPhoneInput(foundBroker.phone)
                        : formData.contact_number
                  });
                }}
                className={`p-2.5 sm:p-3 rounded-xl border font-bold text-center transition-all ${
                  formData.admission_source === 'Referral'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
              >
                Referral / Broker Student
              </button>
            </div>

            {formData.admission_source === 'Referral' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Referring Broker
                  </label>
                  <select
                    value={formData.broker_id}
                    onChange={(e) => handleBrokerChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-teal-500 font-medium"
                  >
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.phone ? `(${b.phone})` : ''} - Rs. {Number(b.current_agreed_amount).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Agreed Broker Fee (PKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.broker_agreed_amount}
                      onChange={(e) => setFormData({ ...formData, broker_agreed_amount: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-500/50 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Personal Details */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                1. Personal Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Row 1: Student Name & Father Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Father Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Khan"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-medium"
                />
              </div>

              {/* Row 2: Gender & Date of Birth */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-medium"
                />
              </div>

              {/* Row 3: Student CNIC & Father CNIC */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Student CNIC / B-Form <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="42101-1234567-1"
                  value={formData.student_cnic}
                  onChange={(e) => setFormData({ ...formData, student_cnic: formatCNIC(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-mono font-medium tracking-wide"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Father CNIC (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="42101-7654321-1"
                  value={formData.father_cnic}
                  onChange={(e) => setFormData({ ...formData, father_cnic: formatCNIC(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-mono font-medium tracking-wide"
                />
              </div>

              {/* Row 4: Contact Number & Reference */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Contact Number (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={formData.contact_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_number: formatPakistaniPhoneInput(e.target.value)
                      })
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Reference / Recommended By
                </label>
                <input
                  type="text"
                  placeholder="e.g. Self, Friend, or Staff Name"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Academic Allocation */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                2. Academic Allocation
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Row 1: Session & Admission Type */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Admission Session
                </label>
                <select
                  value={formData.admission_session}
                  onChange={(e) => setFormData({ ...formData, admission_session: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="Annual I">Annual I</option>
                  <option value="Annual II">Annual II</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Admission Type
                </label>
                <select
                  value={formData.admission_type}
                  onChange={(e) => handleAdmissionTypeChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-teal-700 dark:text-teal-300 font-bold focus:outline-none focus:border-teal-500"
                >
                  <option value="Regular">Regular</option>
                  <option value="Private">Private</option>
                  <option value="Combine (Gap)">Combine (Gap)</option>
                </select>
              </div>

              {/* Row 2: Program / Group & Academic Class */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Program / Group
                </label>
                <select
                  value={formData.program_group}
                  onChange={(e) => setFormData({ ...formData, program_group: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-medium"
                >
                  {currentProgramList.map((p, idx) => (
                    <option key={idx} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Academic Class
                </label>
                <select
                  value={formData.academic_class}
                  onChange={(e) => setFormData({ ...formData, academic_class: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-teal-500"
                >
                  {currentClassList.map((c, idx) => (
                    <option key={idx} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Fee & Payment Management */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  3. Fee &amp; Payment Commitment
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Live Dues:</span>
                <span
                  className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                    liveDues === 0
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  }`}
                >
                  {liveDues === 0 ? 'PAID IN FULL' : formatCurrency(liveDues)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Row 1: Total Fee & Recorded Paid */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Total Course Fee (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.total_fee}
                    onChange={(e) => setFormData({ ...formData, total_fee: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Recorded Paid (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 2: Next Due Date & Milestone Notes */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Next Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.next_payment_due_date}
                  onChange={(e) => setFormData({ ...formData, next_payment_due_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Milestone / Stage Condition (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. On Enrollment Card Issuance"
                  value={formData.commitment_notes}
                  onChange={(e) => setFormData({ ...formData, commitment_notes: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Calculated Dues:{' '}
            <strong className={`font-mono ${liveDues > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {liveDues === 0 ? 'Rs. 0 (Fully Paid)' : formatCurrency(liveDues)}
            </strong>
          </div>

          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors flex-1 sm:flex-none justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-student-form"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 transition-all active:scale-95 disabled:opacity-50 flex-1 sm:flex-none justify-center"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

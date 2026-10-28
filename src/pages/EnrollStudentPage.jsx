import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UserPlus, User, BookOpen, DollarSign, Calendar, AlertCircle, CheckCircle2, ArrowLeft, CreditCard, ShieldAlert, Clock, Award, Users, Handshake, Info } from 'lucide-react';
import { createStudent, checkDuplicateStudentCnic, checkArchiveDuplicate } from '../services/studentService';
import { getAdmissionConfig } from '../services/configService';
import { getActiveBrokers } from '../services/brokerService';
import { calculateDues, formatCurrency, toTitleCase } from '../utils/feeCalculator';
import { formatCNIC, isValidCNIC } from '../utils/cnicHelper';
import { isValidPakistaniPhone, normalizePakistaniPhone, formatPakistaniPhoneInput } from '../utils/phoneHelper';

export function EnrollStudentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSession = searchParams.get('session');
  const initialSession = (requestedSession === 'Annual II' || requestedSession === 'Annual I') ? requestedSession : '';

  const [config, setConfig] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [cnicChecking, setCnicChecking] = useState(false);
  const [cnicDuplicateError, setCnicDuplicateError] = useState('');
  const [archiveWarning, setArchiveWarning] = useState(null);

  // Admission Source: 'Direct' | 'Referral'
  const [admissionSource, setAdmissionSource] = useState('Direct');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [brokerAgreedAmount, setBrokerAgreedAmount] = useState('');

  // Commitment mode state when dues > 0
  const [commitmentType, setCommitmentType] = useState('stage'); // 'stage' | 'date' | 'both'
  const [selectedStagePreset, setSelectedStagePreset] = useState('On Enrollment Card Issuance');
  const [customStageNote, setCustomStageNote] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    student_name: '',
    father_name: '',
    date_of_birth: '',
    student_cnic: '',
    father_cnic: '',
    gender: 'Male',
    contact_number: '',
    reference: '',
    admission_session: initialSession,
    admission_type: '',
    program_group: '',
    academic_class: '',
    total_fee: '',
    initial_payment: '',
    payment_method: 'Cash',
    bank_reference: '',
    next_payment_due_date: ''
  });

  useEffect(() => {
    if (requestedSession && (requestedSession === 'Annual I' || requestedSession === 'Annual II')) {
      setFormData(prev => ({ ...prev, admission_session: requestedSession }));
    }
  }, [requestedSession]);

  // Load admission configuration and active brokers
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingConfig(true);
        const [configData, brokersData] = await Promise.all([
          getAdmissionConfig(),
          getActiveBrokers()
        ]);
        setConfig(configData);
        setBrokers(brokersData || []);
      } catch (err) {
        console.error('Failed to load admission config or brokers:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadData();
  }, []);

  const handleBrokerChange = (brokerId) => {
    setSelectedBrokerId(brokerId);
    if (!brokerId) {
      setBrokerAgreedAmount('');
      return;
    }
    const found = brokers.find(b => b.id === brokerId);
    if (found) {
      const isPartner = Boolean(found.is_partner);
      const agreed = isPartner ? '0' : String(found.current_agreed_amount || '');
      setBrokerAgreedAmount(agreed);
      // Auto-set total_fee to agreed broker amount by default
      setFormData(prev => ({
        ...prev,
        total_fee: agreed !== '' ? agreed : prev.total_fee,
        contact_number: found.phone ? formatPakistaniPhoneInput(found.phone) : prev.contact_number,
        reference: (!prev.reference || prev.reference === 'Direct Admission' || prev.reference === 'Direct') ? found.name : prev.reference
      }));
      setFieldErrors(prev => ({ ...prev, contact_number: undefined, total_fee: undefined, broker_id: undefined }));
    }
  };

  const handleBrokerAgreedAmountChange = (val) => {
    setBrokerAgreedAmount(val);
    // When staff types or adjusts agreed amount, keep total fee synchronized by default
    setFormData(prev => ({
      ...prev,
      total_fee: val
    }));
    setFieldErrors(prev => ({ ...prev, total_fee: undefined }));
  };

  const handleAdmissionSourceToggle = (source) => {
    setAdmissionSource(source);
    if (source === 'Referral') {
      if (selectedBrokerId) {
        handleBrokerChange(selectedBrokerId);
      } else {
        setSelectedBrokerId('');
        setBrokerAgreedAmount('');
        if (!formData.reference || formData.reference === 'Direct' || formData.reference === 'Direct Admission') {
          setFormData(prev => ({ ...prev, reference: '' }));
        }
      }
    } else if (source === 'Direct') {
      // If contact_number is currently the selected broker's phone number, reset it
      const found = brokers.find(b => b.id === selectedBrokerId);
      if (found && found.phone) {
        const cleanBrokerPhone = found.phone.replace(/[\s\-\(\)\+]/g, '');
        const cleanCurrentPhone = (formData.contact_number || '').replace(/[\s\-\(\)\+]/g, '');
        if (cleanCurrentPhone === cleanBrokerPhone) {
          setFormData(prev => ({ ...prev, contact_number: '' }));
        }
      }
      if (found && formData.reference === found.name) {
        setFormData(prev => ({ ...prev, reference: '' }));
      }
    }
  };

  // Handle dependent dropdown updates when admission type changes
  const handleAdmissionTypeChange = (newType) => {
    if (!config) return;
    setFormData(prev => ({
      ...prev,
      admission_type: newType,
      program_group: '',
      academic_class: ''
    }));
    setFieldErrors(prev => ({
      ...prev,
      admission_type: undefined,
      program_group: undefined,
      academic_class: undefined
    }));
  };

  // CNIC input handler with auto-hyphenation (XXXXX-XXXXXXX-X)
  const handleStudentCnicChange = (e) => {
    const formatted = formatCNIC(e.target.value);
    setFormData(prev => ({ ...prev, student_cnic: formatted }));
    setCnicDuplicateError('');
    if (formError && formError.toLowerCase().includes('cnic')) {
      setFormError('');
    }
  };

  // Check duplicate on blur if valid CNIC pattern
  const handleStudentCnicBlur = async () => {
    const cnic = formData.student_cnic.trim();
    if (!cnic) return;

    if (!isValidCNIC(cnic)) {
      setCnicDuplicateError('Invalid CNIC format. Required pattern: XXXXX-XXXXXXX-X (13 digits)');
      return;
    }

    try {
      setCnicChecking(true);
      const existing = await checkDuplicateStudentCnic(cnic);
      if (existing) {
        setCnicDuplicateError(`A student is already enrolled with this CNIC (${existing.student_name} S/O ${existing.father_name} - Class: ${existing.academic_class}). Duplicate CNIC is not allowed.`);
      } else {
        setCnicDuplicateError('');
      }
    } catch (err) {
      console.warn('CNIC duplicate check error:', err);
    } finally {
      setCnicChecking(false);
    }
  };

  // Check for archive duplicates (non-blocking warning)
  const handleCheckArchiveDuplicate = async (overrideName, overridePhone) => {
    const nameToCheck = overrideName !== undefined ? overrideName : formData.student_name;
    const phoneToCheck = overridePhone !== undefined ? overridePhone : formData.contact_number;

    if (!nameToCheck.trim() && !phoneToCheck.trim()) {
      setArchiveWarning(null);
      return;
    }

    try {
      const match = await checkArchiveDuplicate({
        studentName: nameToCheck,
        contactNumber: phoneToCheck
      });

      if (match) {
        const typeLabel = match.type === 'phone' ? 'phone number' : 'name';
        const statusLabel = (match.student.status || 'Archived').replace('_', ' ');
        setArchiveWarning(`Notice: A student with this ${typeLabel} exists in the archive (${match.student.student_name}, Class: ${match.student.academic_class || 'N/A'}, Status: ${statusLabel}). You may proceed if this is a fresh admission.`);
      } else {
        setArchiveWarning(null);
      }
    } catch (err) {
      console.warn('Archive duplicate check error:', err);
    }
  };

  // Financial calculations
  const totalFeeNum = Number(formData.total_fee) || 0;
  const initialPaidNum = Number(formData.initial_payment) || 0;
  const duesNum = calculateDues(totalFeeNum, initialPaidNum);
  const isPaymentExceeded = formData.initial_payment !== '' && initialPaidNum > totalFeeNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Strict Validation of All 9 Required Fields
    const trimmedName = toTitleCase(formData.student_name);
    const trimmedFatherName = toTitleCase(formData.father_name);
    const gender = formData.gender?.trim();
    const trimmedCnic = formData.student_cnic.trim();
    const session = formData.admission_session?.trim();
    const type = formData.admission_type?.trim();
    const program = formData.program_group?.trim();
    const academicClass = formData.academic_class?.trim();
    const rawTotalFee = formData.total_fee;

    const errors = {};
    const trimmedPhone = formData.contact_number.trim();

    if (!trimmedName) {
      errors.student_name = 'Student Name is required.';
    }
    if (!trimmedFatherName) {
      errors.father_name = 'Father Name is required.';
    }
    if (!gender) {
      errors.gender = 'Gender is required.';
    }
    if (!trimmedCnic) {
      errors.student_cnic = 'Student CNIC is required.';
    } else if (!isValidCNIC(trimmedCnic)) {
      errors.student_cnic = 'Student CNIC must match the required pattern: XXXXX-XXXXXXX-X (13 digits).';
    }

    // Task 4.b: contact phone is required (Pakistani mobile format, accept 03XX-XXXXXXX or 03XXXXXXXXX)
    if (!trimmedPhone) {
      errors.contact_number = 'Contact phone number is required.';
    } else if (!isValidPakistaniPhone(trimmedPhone)) {
      errors.contact_number = 'Invalid format. Enter a valid Pakistani mobile number (e.g., 0300-1234567 or 03001234567).';
    }

    if (!session) {
      errors.admission_session = 'Admission Session is required.';
    }
    if (!type) {
      errors.admission_type = 'Admission Type is required.';
    }
    if (!program) {
      errors.program_group = 'Program / Group is required.';
    }
    if (!academicClass) {
      errors.academic_class = 'Academic Class is required.';
    }
    if (rawTotalFee === '' || rawTotalFee === null || isNaN(Number(rawTotalFee)) || Number(rawTotalFee) < 0) {
      errors.total_fee = 'Total Fee is required and cannot be negative.';
    }
    if (initialPaidNum < 0) {
      errors.initial_payment = 'Initial payment amount cannot be negative.';
    }
    if (initialPaidNum > totalFeeNum) {
      errors.initial_payment = 'Initial payment cannot be more than the total fee.';
    }

    // Task 4.b: If the remaining dues are greater than 0, a due/promised date is required.
    const today = new Date().toISOString().split('T')[0];
    if (duesNum > 0) {
      if (!formData.next_payment_due_date) {
        errors.next_payment_due_date = 'A payment due date is required when there are remaining dues.';
      } else if (formData.next_payment_due_date < today) {
        errors.next_payment_due_date = 'Payment due date cannot be in the past.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Please resolve the highlighted field errors below before saving.');
      return;
    }
    setFieldErrors({});

    try {
      setIsSubmitting(true);

      // Pre-check duplicate CNIC before submission
      const existing = await checkDuplicateStudentCnic(trimmedCnic);
      if (existing) {
        setFormError(`A student is already enrolled with CNIC "${trimmedCnic}" (${existing.student_name} S/O ${existing.father_name}). Duplicate CNIC is not permitted.`);
        setCnicDuplicateError(`Duplicate CNIC! Already enrolled: ${existing.student_name} (${existing.academic_class})`);
        return;
      }

      // Compute commitment notes and date based on selected mode
      let finalCommitmentNote = null;
      let finalDueDate = null;

      if (duesNum > 0) {
        finalDueDate = formData.next_payment_due_date;
        if (commitmentType === 'stage' || commitmentType === 'both') {
          finalCommitmentNote = customStageNote.trim() || selectedStagePreset || 'On Enrollment Card Issuance';
        } else if (customStageNote.trim()) {
          finalCommitmentNote = customStageNote.trim();
        }
      }

      // Referral validation
      if (admissionSource === 'Referral') {
        if (!selectedBrokerId) {
          setFieldErrors(prev => ({ ...prev, broker_id: 'Please select a Referral Broker / Partner.' }));
          setFormError('Please select a Referral Broker / Partner before saving.');
          return;
        }
      }

      let finalReference = formData.reference.trim();
      if (admissionSource === 'Referral') {
        if (!finalReference || finalReference === 'Direct Admission' || finalReference === 'Direct') {
          const foundBroker = brokers.find(b => b.id === selectedBrokerId);
          finalReference = foundBroker?.name || '';
        }
      }

      const student = await createStudent(
        {
          student_name: trimmedName,
          father_name: trimmedFatherName,
          date_of_birth: formData.date_of_birth || null,
          student_cnic: trimmedCnic,
          father_cnic: formData.father_cnic.trim() ? formatCNIC(formData.father_cnic) : null,
          gender: gender,
          contact_number: normalizePakistaniPhone(trimmedPhone),
          reference: finalReference || null,
          admission_source: admissionSource,
          broker_id: admissionSource === 'Referral' ? selectedBrokerId : null,
          broker_agreed_amount: admissionSource === 'Referral' ? (Number(brokerAgreedAmount) || 0) : null,
          admission_session: session,
          admission_type: type,
          program_group: program,
          academic_class: academicClass,
          total_fee: totalFeeNum,
          commitment_notes: finalCommitmentNote,
          next_payment_due_date: finalDueDate,
          status: 'active'
        },
        initialPaidNum > 0
          ? {
              amount: initialPaidNum,
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: formData.payment_method,
              notes: formData.payment_method === 'Bank' && formData.bank_reference.trim()
                ? `Ref/Txn: ${formData.bank_reference.trim()}`
                : 'Initial enrollment payment'
            }
          : null
      );

      // Successfully saved - scroll to top and navigate directly to Student Profile
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      navigate(`/students/${student.id}`, { state: { justEnrolled: true } });
    } catch (err) {
      console.error('Enrollment error:', err);
      setFormError(err.message || 'Failed to enroll student. Please check database connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentProgramList = config?.programGroups?.[formData.admission_type] || [];
  const currentClassList = config?.academicClasses?.[formData.admission_type] || [];
  const isCnicValidFormat = isValidCNIC(formData.student_cnic);
  const selectedBroker = brokers.find((b) => b.id === selectedBrokerId);
  const isSelectedBrokerPartner = Boolean(selectedBroker?.is_partner);
  const isBrokerMissing = admissionSource === 'Referral' && !selectedBrokerId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Student Enrollment</h2>
          <p className="text-xs md:text-sm text-slate-400">
            Fill in admission source, student bio, academic stream, and fee structure
          </p>
        </div>
      </div>

      {archiveWarning && (
        <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <div className="font-bold text-amber-300">Archive Record Found</div>
              <div className="text-amber-200/90 mt-0.5">{archiveWarning}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setArchiveWarning(null)}
            className="text-amber-400 hover:text-amber-200 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <div className="font-bold text-rose-200">Validation Error</div>
            <div className="text-xs text-rose-300/90 mt-0.5">{formError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 0: Admission Source (Direct vs Referral) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm uppercase tracking-wider">
              <Handshake className="w-4 h-4" />
              <span>Admission Source</span>
            </div>
            <span className="text-[11px] text-slate-400">Select student enrollment channel</span>
          </div>

          {/* Toggle Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleAdmissionSourceToggle('Direct')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                admissionSource === 'Direct'
                  ? 'bg-teal-950/50 border-teal-500/60 ring-1 ring-teal-500/40 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${
                admissionSource === 'Direct' ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>Direct Student</span>
                  {admissionSource === 'Direct' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Standard
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enrolled directly with the college. No broker or external referral involved.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAdmissionSourceToggle('Referral')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                admissionSource === 'Referral'
                  ? 'bg-teal-950/50 border-teal-500/60 ring-1 ring-teal-500/40 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${
                admissionSource === 'Referral' ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
              }`}>
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>Referral / Broker Student</span>
                  {admissionSource === 'Referral' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Partner
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Referred by a broker/partner. Record institutional agreed snapshot amount.
                </p>
              </div>
            </button>
          </div>

          {/* Referral Broker Details Box (Conditional) */}
          {admissionSource === 'Referral' && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-teal-500/30 space-y-3.5 mt-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wide">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Broker / Partner Allocation</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Broker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Referring Broker <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required={admissionSource === 'Referral'}
                    value={selectedBrokerId}
                    onChange={(e) => handleBrokerChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm focus:outline-none font-semibold ${
                      !selectedBrokerId ? 'border-amber-500/60 text-slate-400' : 'border-slate-700 text-white focus:border-teal-500'
                    }`}
                  >
                    <option value="" disabled>Select broker / partner...</option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.is_partner ? '(Partner - No Commission)' : ''} {b.phone ? `(${b.phone})` : ''} {!b.is_partner && b.current_agreed_amount ? `• Standard: Rs. ${Number(b.current_agreed_amount).toLocaleString()}` : ''}
                      </option>
                    ))}
                  </select>
                  {brokers.length === 0 ? (
                    <span className="text-[11px] text-amber-400 mt-1 block">
                      ⚠️ No brokers found.{' '}
                      <Link to="/config" className="underline font-bold text-teal-300 hover:text-teal-200">
                        Click here to add your actual brokers
                      </Link>
                    </span>
                  ) : !selectedBrokerId ? (
                    <span className="text-[11px] text-amber-400 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Please select a broker to continue.</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Referred by: {selectedBroker?.name} {isSelectedBrokerPartner ? '(Partner - Rs 0 rate)' : ''}
                    </span>
                  )}
                </div>

                {/* Historical Snapshot Agreed Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Agreed Broker Amount (PKR) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      required={admissionSource === 'Referral'}
                      readOnly={isSelectedBrokerPartner}
                      placeholder={isSelectedBrokerPartner ? '0' : 'e.g. 3000'}
                      value={brokerAgreedAmount}
                      onChange={(e) => {
                        if (!isSelectedBrokerPartner) {
                          handleBrokerAgreedAmountChange(e.target.value);
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border font-sans tabular-nums text-base font-bold focus:outline-none ${
                        isSelectedBrokerPartner
                          ? 'border-slate-700 bg-slate-950/70 text-slate-400 cursor-not-allowed'
                          : 'border-teal-500/50 text-teal-300 focus:border-teal-400 focus:ring-1 focus:ring-teal-400'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-teal-400 shrink-0 inline" />
                    <span>
                      {isSelectedBrokerPartner
                        ? 'Partner broker (no commission) — rate is fixed at Rs 0.'
                        : 'Locked snapshot for this student; immune to future broker rate changes.'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Student Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm uppercase tracking-wider mb-5 pb-3 border-b border-slate-800">
            <User className="w-4 h-4" />
            <span>1. Student Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Student Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ahmed Khan"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                onBlur={() => handleCheckArchiveDuplicate(formData.student_name, undefined)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Father Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Muhammad Khan"
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Gender <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500 font-medium"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Student CNIC / B-Form */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Student CNIC / B-Form <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">Pattern: XXXXX-XXXXXXX-X</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="42101-1234567-1"
                  value={formData.student_cnic}
                  onChange={handleStudentCnicChange}
                  onBlur={handleStudentCnicBlur}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-500 text-sm font-mono focus:outline-none transition-colors ${
                    cnicDuplicateError
                      ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/50'
                      : isCnicValidFormat
                      ? 'border-emerald-500/70 focus:border-emerald-500'
                      : 'border-slate-700 focus:border-teal-500'
                  }`}
                />
                {cnicChecking && (
                  <span className="absolute right-3 top-3 text-[10px] text-teal-400 animate-pulse">Checking...</span>
                )}
                {!cnicChecking && isCnicValidFormat && !cnicDuplicateError && (
                  <CheckCircle2 className="w-4 h-4 absolute right-3 top-3 text-emerald-400" />
                )}
              </div>

              {/* CNIC Feedback */}
              {cnicDuplicateError ? (
                <div className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{cnicDuplicateError}</span>
                </div>
              ) : formData.student_cnic && !isCnicValidFormat ? (
                <span className="text-[10px] text-amber-400/90 mt-1 block">
                  Format: 5 digits - 7 digits - 1 digit (13 numbers total)
                </span>
              ) : isCnicValidFormat ? (
                <span className="text-[10px] text-emerald-400/90 mt-1 block">
                  ✓ Valid CNIC format • Unique student identity
                </span>
              ) : null}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Father CNIC */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Father CNIC (Optional)
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="42101-7654321-1"
                value={formData.father_cnic}
                onChange={(e) => setFormData({ ...formData, father_cnic: formatCNIC(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Contact Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Contact Number (WhatsApp) <span className="text-rose-400">*</span>
                </label>
                {admissionSource === 'Referral' && (
                  <span className="text-[11px] font-medium text-teal-400">
                    Default: Broker Number
                  </span>
                )}
              </div>
              <input
                type="tel"
                placeholder="e.g. 0300-1234567 or 03001234567"
                value={formData.contact_number}
                onChange={(e) => {
                  setFormData({ ...formData, contact_number: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, contact_number: undefined }));
                }}
                onBlur={() => handleCheckArchiveDuplicate(undefined, formData.contact_number)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border text-white placeholder-slate-500 text-sm focus:outline-none ${
                  fieldErrors.contact_number
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-700 focus:border-teal-500'
                }`}
              />
              {fieldErrors.contact_number ? (
                <p className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.contact_number}</span>
                </p>
              ) : admissionSource === 'Referral' ? (
                <p className="text-teal-400/90 text-[11px] mt-1">
                  Auto-filled with referring broker's phone number. You can change it if the student has a personal phone.
                </p>
              ) : (
                <p className="text-slate-500 text-[11px] mt-1">Pakistani mobile format (03XX-XXXXXXX or 03XXXXXXXXX)</p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reference / Recommended By
              </label>
              <input
                type="text"
                placeholder={
                  admissionSource === 'Referral'
                    ? (selectedBroker ? `e.g. ${selectedBroker.name}` : 'e.g. Referring broker name or remarks')
                    : 'e.g. Direct / Sir Aslam / Broker'
                }
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Admission Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm uppercase tracking-wider mb-5 pb-3 border-b border-slate-800">
            <BookOpen className="w-4 h-4" />
            <span>2. Admission Stream & Program</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Admission Session */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admission Session <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.admission_session}
                onChange={(e) => {
                  setFormData({ ...formData, admission_session: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, admission_session: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                  fieldErrors.admission_session ? 'border-rose-500' : 'border-slate-700'
                } ${!formData.admission_session ? 'text-slate-400' : 'text-white'} text-sm focus:outline-none focus:border-teal-500 font-medium`}
              >
                <option value="" disabled>Select admission session...</option>
                <option value="Annual I">Annual I</option>
                <option value="Annual II">Annual II</option>
              </select>
              {fieldErrors.admission_session && (
                <p className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.admission_session}</span>
                </p>
              )}
            </div>

            {/* Admission Type (Triggers dependent program and class updates) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admission Type <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.admission_type}
                onChange={(e) => handleAdmissionTypeChange(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                  fieldErrors.admission_type ? 'border-rose-500' : 'border-slate-700'
                } ${!formData.admission_type ? 'text-slate-400' : 'text-teal-300'} font-semibold text-sm focus:outline-none focus:border-teal-500`}
              >
                <option value="" disabled>Select admission type...</option>
                <option value="Regular">Regular</option>
                <option value="Private">Private</option>
                <option value="Combine (Gap)">Combine (Gap)</option>
              </select>
              {fieldErrors.admission_type && (
                <p className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.admission_type}</span>
                </p>
              )}
            </div>

            {/* Program / Group (Dependent on Admission Type) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Program / Group <span className="text-rose-400">*</span>
              </label>
              <select
                required
                disabled={!formData.admission_type}
                value={formData.program_group}
                onChange={(e) => {
                  setFormData({ ...formData, program_group: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, program_group: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                  fieldErrors.program_group ? 'border-rose-500' : 'border-slate-700'
                } ${!formData.program_group ? 'text-slate-400' : 'text-white'} text-sm focus:outline-none focus:border-teal-500 disabled:opacity-50`}
              >
                <option value="" disabled>
                  {formData.admission_type ? 'Select program / group...' : 'Select admission type first...'}
                </option>
                {currentProgramList.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
              {fieldErrors.program_group ? (
                <p className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.program_group}</span>
                </p>
              ) : (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {formData.admission_type ? `Filtered automatically for ${formData.admission_type}` : 'Choose admission type above to see options'}
                </span>
              )}
            </div>

            {/* Academic Class (Dependent on Admission Type) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Academic Class <span className="text-rose-400">*</span>
              </label>
              <select
                required
                disabled={!formData.admission_type}
                value={formData.academic_class}
                onChange={(e) => {
                  setFormData({ ...formData, academic_class: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, academic_class: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                  fieldErrors.academic_class ? 'border-rose-500' : 'border-slate-700'
                } ${!formData.academic_class ? 'text-slate-400' : 'text-white'} text-sm focus:outline-none focus:border-teal-500 font-semibold disabled:opacity-50`}
              >
                <option value="" disabled>
                  {formData.admission_type ? 'Select academic class...' : 'Select admission type first...'}
                </option>
                {currentClassList.map((c, idx) => (
                  <option key={idx} value={c}>{c}</option>
                ))}
              </select>
              {fieldErrors.academic_class ? (
                <p className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.academic_class}</span>
                </p>
              ) : (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {formData.admission_type ? `Applicable classes for ${formData.admission_type}` : 'Choose admission type above to see options'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Fee & Payment Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm uppercase tracking-wider mb-5 pb-3 border-b border-slate-800">
            <DollarSign className="w-4 h-4" />
            <span>3. Fee Structure & Payment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Fee */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Total Fee (PKR) <span className="text-rose-400">*</span>
                </label>
                {admissionSource === 'Referral' && brokerAgreedAmount && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, total_fee: brokerAgreedAmount }))}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Match Broker (Rs. {Number(brokerAgreedAmount).toLocaleString()})</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                required
                placeholder="e.g. 45000"
                value={formData.total_fee}
                onChange={(e) => {
                  setFormData({ ...formData, total_fee: e.target.value });
                  if (fieldErrors.total_fee || fieldErrors.initial_payment) {
                    setFieldErrors(prev => ({ ...prev, total_fee: undefined, initial_payment: undefined }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-sans tabular-nums text-base font-bold focus:outline-none focus:border-teal-500"
              />
              {admissionSource === 'Referral' && brokerAgreedAmount && (
                <span className="text-[10px] text-teal-400 mt-1 flex items-center gap-1 font-medium">
                  <Handshake className="w-3 h-3 shrink-0 inline" />
                  <span>Auto-defaulted to Agreed Broker Amount (Rs {Number(brokerAgreedAmount).toLocaleString('en-PK')}). You can adjust if needed.</span>
                </span>
              )}
            </div>

            {/* Initial Paid Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Initial Payment (PKR)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 10000 (or leave 0 for unpaid)"
                value={formData.initial_payment}
                onChange={(e) => {
                  setFormData({ ...formData, initial_payment: e.target.value });
                  if (fieldErrors.initial_payment) {
                    setFieldErrors(prev => ({ ...prev, initial_payment: undefined }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border font-sans tabular-nums text-base font-bold focus:outline-none placeholder-slate-500 ${
                  isPaymentExceeded || fieldErrors.initial_payment
                    ? 'border-rose-500 text-rose-400 focus:border-rose-400'
                    : 'border-slate-700 text-emerald-400 focus:border-teal-500'
                }`}
              />
              {(isPaymentExceeded || fieldErrors.initial_payment) && (
                <p className="text-rose-400 text-xs font-semibold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isPaymentExceeded
                      ? 'Initial payment cannot be more than the total fee.'
                      : fieldErrors.initial_payment}
                  </span>
                </p>
              )}
            </div>

            {/* Payment Method */}
            {initialPaidNum > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Initial Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.payment_method === 'Bank' && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-teal-500/40 animate-fadeIn space-y-1">
                    <label className="block text-xs font-semibold text-teal-300">
                      Reference / Transaction no. <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bank_reference}
                      onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
                      placeholder="e.g. TXN-948214, Cheque #, or Transfer ID"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dues Commitment Section (When Dues > 0) */}
          {duesNum > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Remaining Fee Payment Schedule &amp; Due Date <span className="text-rose-400">*</span></span>
                </label>
                <span className="text-[10px] text-slate-400">Payment due date is required for outstanding dues</span>
              </div>

              {/* Toggle: Milestone Stage vs Calendar Date vs Both */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCommitmentType('stage')}
                  className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    commitmentType === 'stage'
                      ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span className="truncate">Stage Milestone</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommitmentType('date')}
                  className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    commitmentType === 'date'
                      ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span className="truncate">Calendar Date</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommitmentType('both')}
                  className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                    commitmentType === 'both'
                      ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span className="truncate">Date &amp; Stage</span>
                </button>
              </div>

              {/* Stage Milestone Selection */}
              {(commitmentType === 'stage' || commitmentType === 'both') && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Payment Milestone Condition:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { title: 'On Enrollment Card Issuance', desc: 'When Enrollment Card is delivered' },
                      { title: 'On Examination in Verification', desc: 'When Examination is submitted' },
                      { title: 'On Admit Card Issuance', desc: 'When Admit Card is ready' },
                      { title: 'On Class Commencement', desc: 'When regular classes start' },
                    ].map((preset) => {
                      const isSelected = selectedStagePreset === preset.title && !customStageNote;
                      return (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setSelectedStagePreset(preset.title);
                            setCustomStageNote('');
                          }}
                          className={`p-3 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-teal-900/90 border-teal-400 ring-2 ring-teal-400/50 shadow-md'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className={`font-bold tracking-wide text-xs ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {preset.title}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-teal-200 font-medium' : 'text-slate-400'}`}>
                            {preset.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Stage Note */}
                  <div className="pt-1.5">
                    <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                      Or custom condition / notes (optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Promised to pay remaining 10,000 when enrollment card is issued"
                      value={customStageNote}
                      onChange={(e) => setCustomStageNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* Specific Calendar Date Selection (Required when dues > 0) */}
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Payment Due Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.next_payment_due_date}
                  onChange={(e) => {
                    setFormData({ ...formData, next_payment_due_date: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, next_payment_due_date: undefined }));
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none font-mono ${
                    fieldErrors.next_payment_due_date
                      ? 'border-rose-500 focus:border-rose-400'
                      : 'border-slate-700 focus:border-teal-500'
                  }`}
                />
                {fieldErrors.next_payment_due_date && (
                  <p className="text-rose-400 text-xs font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.next_payment_due_date}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Automatic Dues Calculation Preview (Sections 13 & 17) */}
          <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block">Automatic Dues Calculation (Read-Only)</span>
              <div className="text-xs text-slate-500 mt-0.5">
                Total Fee ({formatCurrency(totalFeeNum)}) - Paid ({formatCurrency(initialPaidNum)})
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Remaining Dues</span>
                <span className={`text-xl font-extrabold font-sans tabular-nums ${
                  isPaymentExceeded
                    ? 'text-rose-400'
                    : duesNum > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {isPaymentExceeded ? 'Exceeds Total Fee' : formatCurrency(duesNum)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Initial Status</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isPaymentExceeded
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    : duesNum === 0 && totalFeeNum > 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : initialPaidNum > 0
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    : 'bg-orange-950 text-orange-300 border border-orange-500/30'
                }`}>
                  {isPaymentExceeded
                    ? 'EXCEEDS TOTAL FEE'
                    : duesNum === 0 && totalFeeNum > 0
                    ? 'PAID IN FULL'
                    : initialPaidNum > 0
                    ? 'DUE'
                    : 'UNPAID'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !!cnicDuplicateError || isPaymentExceeded || isBrokerMissing}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Enrollment...' : 'Enroll & Save Student'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

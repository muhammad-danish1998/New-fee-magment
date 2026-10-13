import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Handshake, Plus, Edit2, Trash2, Users, DollarSign, Phone, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, ArrowRight, Info, Share2, Copy,
  Lock, Unlock, Key, RefreshCw, Power, ExternalLink
} from 'lucide-react';
import {
  getBrokers, createBroker, updateBroker, deleteBroker,
  getBrokerAccountingSummary, toggleBrokerPortalStatus,
  regenerateBrokerAccessToken, updateBrokerSecurityPin
} from '../../services/brokerService';
import { formatCurrency, formatDate } from '../../utils/feeCalculator';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function BrokerManagementTab() {
  const [brokersSummary, setBrokersSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [brokerToDelete, setBrokerToDelete] = useState(null);
  const [isDeletingBroker, setIsDeletingBroker] = useState(false);
  const [brokerToRegenerateKey, setBrokerToRegenerateKey] = useState(null);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);

  // Add broker form state
  const [newBrokerName, setNewBrokerName] = useState('');
  const [newBrokerPhone, setNewBrokerPhone] = useState('');
  const [newBrokerAmount, setNewBrokerAmount] = useState('');
  const [newBrokerPin, setNewBrokerPin] = useState('1234');
  const [newBrokerNotes, setNewBrokerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit broker modal state
  const [editingBroker, setEditingBroker] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPin, setEditPin] = useState('1234');
  const [editIsPortalActive, setEditIsPortalActive] = useState(true);
  const [editNotes, setEditNotes] = useState('');
  const [expandedBrokerId, setExpandedBrokerId] = useState(null);

  // Quick PIN modal
  const [pinModalBroker, setPinModalBroker] = useState(null);
  const [quickPin, setQuickPin] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getBrokerAccountingSummary();
      setBrokersSummary(data || []);
    } catch (err) {
      console.error('Failed to load brokers summary:', err);
      setError('Failed to load referral brokers and accounting data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddBroker = async (e) => {
    e.preventDefault();
    if (!newBrokerName.trim()) {
      setError('Broker Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createBroker({
        name: newBrokerName.trim(),
        phone: newBrokerPhone.trim(),
        currentAgreedAmount: Number(newBrokerAmount) || 0,
        securityPin: newBrokerPin.trim() || '1234',
        notes: newBrokerNotes.trim()
      });

      setNewBrokerName('');
      setNewBrokerPhone('');
      setNewBrokerAmount('');
      setNewBrokerPin('1234');
      setNewBrokerNotes('');
      setSuccess('Referral broker added successfully with portal link & PIN.');
      setTimeout(() => setSuccess(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to add broker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (broker) => {
    setEditingBroker(broker);
    setEditName(broker.name || '');
    setEditPhone(broker.phone || '');
    setEditAmount(String(broker.current_agreed_amount || 0));
    setEditPin(broker.security_pin || '1234');
    setEditIsPortalActive(broker.is_portal_active !== false);
    setEditNotes(broker.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setIsSubmitting(true);
      setError('');
      await updateBroker(editingBroker.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        current_agreed_amount: Number(editAmount) || 0,
        security_pin: editPin.trim() || '1234',
        is_portal_active: editIsPortalActive,
        notes: editNotes.trim()
      });

      setEditingBroker(null);
      setSuccess('Broker updated successfully.');
      setTimeout(() => setSuccess(''), 3500);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update broker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePortalStatus = async (broker) => {
    const nextState = !broker.is_portal_active;
    try {
      await toggleBrokerPortalStatus(broker.id, nextState);
      setSuccess(`Portal link for "${broker.name}" is now ${nextState ? 'ACTIVATED' : 'DEACTIVATED'}.`);
      setTimeout(() => setSuccess(''), 3500);
      await loadData();
    } catch (err) {
      alert('Failed to toggle portal status: ' + err.message);
    }
  };

  const handleRegenerateKey = (broker) => {
    setBrokerToRegenerateKey(broker);
  };

  const handleConfirmRegenerateKey = async () => {
    if (!brokerToRegenerateKey) return;
    try {
      setIsRegeneratingKey(true);
      await regenerateBrokerAccessToken(brokerToRegenerateKey.id);
      setSuccess(`New portal link generated for "${brokerToRegenerateKey.name}".`);
      setTimeout(() => setSuccess(''), 3500);
      await loadData();
      setBrokerToRegenerateKey(null);
    } catch (err) {
      alert('Failed to regenerate access key: ' + err.message);
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  const handleSaveQuickPin = async (e) => {
    e.preventDefault();
    if (!quickPin.trim()) return;

    try {
      await updateBrokerSecurityPin(pinModalBroker.id, quickPin.trim());
      setPinModalBroker(null);
      setSuccess(`Security PIN updated for "${pinModalBroker.name}".`);
      setTimeout(() => setSuccess(''), 3500);
      await loadData();
    } catch (err) {
      alert('Failed to update PIN: ' + err.message);
    }
  };

  const getPortalUrl = (token) => {
    const origin = window.location.origin;
    return `${origin}/broker-portal/${token}`;
  };

  const handleCopyLink = (broker) => {
    const url = getPortalUrl(broker.access_token);
    navigator.clipboard.writeText(url);
    setSuccess(`Portal link copied to clipboard! (PIN: ${broker.security_pin || '1234'})`);
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleWhatsAppShare = (broker) => {
    const url = getPortalUrl(broker.access_token);
    const pin = broker.security_pin || '1234';
    const message = `*College Admission & Student Referral Portal*\n\n` +
      `Dear ${broker.name},\n` +
      `Here is your secure access link to view your referred students, fee dues, and admission/admit card progress in real time:\n\n` +
      `🔗 *Portal Link:* ${url}\n` +
      `🔑 *Security PIN:* ${pin}\n\n` +
      `_This portal is private and secure for your referral records._`;

    const encoded = encodeURIComponent(message);
    const target = broker.phone ? `https://wa.me/${broker.phone.replace(/[^0-9]/g, '')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(target, '_blank');
  };

  const handleDeleteBroker = (id, name) => {
    setBrokerToDelete({ id, name });
  };

  const handleConfirmDeleteBroker = async () => {
    if (!brokerToDelete) return;
    try {
      setIsDeletingBroker(true);
      await deleteBroker(brokerToDelete.id);
      setSuccess(`Broker "${brokerToDelete.name}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
      setBrokerToDelete(null);
    } catch (err) {
      alert('Failed to delete broker: ' + err.message);
    } finally {
      setIsDeletingBroker(false);
    }
  };

  // Overall totals
  const totalReferralStudents = brokersSummary.reduce((acc, b) => acc + (b.total_students_count || 0), 0);
  const totalSnapshotAmountSum = brokersSummary.reduce((acc, b) => acc + (b.total_snapshot_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Feedback alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Brokers</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{brokersSummary.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">partners</span>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">Partners with secure portals</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Referral Students</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-300">{totalReferralStudents}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">enrolled via brokers</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Agreed Institutional Balance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
              {formatCurrency(totalSnapshotAmountSum)}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
            Calculated from student snapshot agreed rates
          </p>
        </div>
      </div>

      {/* Add New Broker Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add New Referral Broker / Partner</span>
        </h3>

        <form onSubmit={handleAddBroker} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Broker Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ali Khan / Bright Star"
              value={newBrokerName}
              onChange={(e) => setNewBrokerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Phone / WhatsApp
            </label>
            <input
              type="text"
              placeholder="e.g. 03001234567"
              value={newBrokerPhone}
              onChange={(e) => setNewBrokerPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Standard Agreed Rate (PKR)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 5000"
              value={newBrokerAmount}
              onChange={(e) => setNewBrokerAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-teal-700 dark:text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Portal PIN (4 Digits)
            </label>
            <input
              type="text"
              maxLength="8"
              placeholder="1234"
              value={newBrokerPin}
              onChange={(e) => setNewBrokerPin(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-purple-700 dark:text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Broker & Link'}
            </button>
          </div>
        </form>
      </div>

      {/* Broker List & Accounting Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Referral Partner Master &amp; Secure Portals</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage portal access links, 4-digit PINs, and real-time student tracking statements.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading broker ledgers...
          </div>
        ) : brokersSummary.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No referral brokers registered yet. Add your first broker using the form above.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {brokersSummary.map((broker) => {
              const isExpanded = expandedBrokerId === broker.id;
              const isPortalActive = broker.is_portal_active !== false;

              return (
                <div key={broker.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Top Bar: Broker Main Info & Financials */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                    {/* Left: Name, Phone & Status Badge */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{broker.name}</span>
                        {broker.phone && (
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {broker.phone}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPortalActive
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                        }`}>
                          {isPortalActive ? '● Portal Active' : '○ Portal Deactivated'}
                        </span>
                      </div>
                      {broker.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{broker.notes}</p>
                      )}
                    </div>

                    {/* Middle: Financial Metrics */}
                    <div className="flex items-center gap-5 flex-wrap">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Default Rate</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                          {formatCurrency(broker.current_agreed_amount || 0)}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Referred</span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {broker.total_students_count || 0} students
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Institutional Balance</span>
                        <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatCurrency(broker.total_snapshot_amount || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions (Edit & Delete) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(broker)}
                        title="Edit Broker Details / Rate / PIN"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 border border-slate-300 dark:border-slate-700 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBroker(broker.id, broker.name)}
                        title="Delete Broker"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {broker.total_students_count > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedBrokerId(isExpanded ? null : broker.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 text-[11px]"
                        >
                          <span>Students ({broker.total_students_count})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Bar: Portal Sharing & Security Controls */}
                  <div className="pt-2.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Portal PIN & Active Switch */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                        <Key className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-slate-400">Security PIN:</span>
                        <span className="font-mono font-bold text-purple-300 tracking-wider">
                          {broker.security_pin || '1234'}
                        </span>
                        <button
                          onClick={() => {
                            setPinModalBroker(broker);
                            setQuickPin(broker.security_pin || '1234');
                          }}
                          className="text-[10px] text-teal-400 hover:underline font-semibold ml-1"
                        >
                          Change
                        </button>
                      </div>

                      {/* Active/Deactive Toggle Button */}
                      <button
                        onClick={() => handleTogglePortalStatus(broker)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          isPortalActive
                            ? 'bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{isPortalActive ? 'Deactivate Portal Link' : 'Activate Portal Link'}</span>
                      </button>
                    </div>

                    {/* Sharing Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(broker)}
                        title="Copy direct portal link to clipboard"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors"
                      >
                        <Copy className="w-3 h-3 text-teal-400" />
                        <span>Copy Link</span>
                      </button>

                      <button
                        onClick={() => handleWhatsAppShare(broker)}
                        title="Share portal link and PIN via WhatsApp"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition-colors"
                      >
                        <Share2 className="w-3 h-3 text-emerald-400" />
                        <span>Share on WhatsApp</span>
                      </button>

                      <a
                        href={getPortalUrl(broker.access_token)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open portal in new tab"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleRegenerateKey(broker)}
                        title="Regenerate access token (revokes old links)"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-purple-950/60 text-slate-400 hover:text-purple-300 border border-slate-700 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Referred Students Drawer */}
                  {isExpanded && broker.students?.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs animate-fadeIn space-y-2">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span>Referred Students for {broker.name}</span>
                        <span className="text-slate-500 text-[10px]">Snapshot rate recorded at enrollment</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-800/60">
                              <th className="py-1.5 px-2">Student Name</th>
                              <th className="py-1.5 px-2">Class &amp; Stream</th>
                              <th className="py-1.5 px-2">Admission Date</th>
                              <th className="py-1.5 px-2 text-right">Agreed Snapshot Amount</th>
                              <th className="py-1.5 px-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {broker.students.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-900/60 transition-colors">
                                <td className="py-1.5 px-2 font-semibold text-slate-200">
                                  {s.student_name} <span className="text-[10px] text-slate-400 font-normal">(S/O {s.father_name})</span>
                                </td>
                                <td className="py-1.5 px-2 text-slate-300">
                                  {s.academic_class} • {s.program_group}
                                </td>
                                <td className="py-1.5 px-2 text-slate-400 text-[11px]">
                                  {formatDate(s.created_at)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-purple-300">
                                  {formatCurrency(s.broker_agreed_amount || 0)}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  <Link
                                    to={`/students/${s.id}`}
                                    className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium"
                                  >
                                    <span>Profile</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Broker Modal */}
      {editingBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-teal-400" />
              <span>Edit Broker &amp; Portal Settings</span>
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Broker Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Agreed Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Portal PIN (4 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength="8"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300 font-semibold text-xs">Portal Link Access Status</span>
                <button
                  type="button"
                  onClick={() => setEditIsPortalActive(!editIsPortalActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    editIsPortalActive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-950 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {editIsPortalActive ? 'Active' : 'Deactivated'}
                </button>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBroker(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick PIN Modal */}
      {pinModalBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              <span>Update Security PIN: {pinModalBroker.name}</span>
            </h3>

            <form onSubmit={handleSaveQuickPin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Enter 4-Digit PIN</label>
                <input
                  type="text"
                  maxLength="8"
                  required
                  autoFocus
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-purple-500/40 text-purple-200 font-mono font-bold text-center text-lg focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalBroker(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Broker Confirmation */}
      <ConfirmDialog
        isOpen={!!brokerToDelete}
        onClose={() => setBrokerToDelete(null)}
        onConfirm={handleConfirmDeleteBroker}
        loading={isDeletingBroker}
        title="Delete Broker Partner?"
        description={
          brokerToDelete ? (
            <span>
              Are you sure you want to delete <strong>"{brokerToDelete.name}"</strong>? Existing student records will retain their referral data.
            </span>
          ) : null
        }
        confirmLabel="Yes, Delete Broker"
        cancelLabel="Cancel"
        variant="danger"
        focusCancel={true}
      />

      {/* Regenerate Key Confirmation */}
      <ConfirmDialog
        isOpen={!!brokerToRegenerateKey}
        onClose={() => setBrokerToRegenerateKey(null)}
        onConfirm={handleConfirmRegenerateKey}
        loading={isRegeneratingKey}
        title="Regenerate Portal Link?"
        description={
          brokerToRegenerateKey ? (
            <span>
              Are you sure you want to regenerate the portal link for <strong>"{brokerToRegenerateKey.name}"</strong>? All previously shared links will stop working immediately.
            </span>
          ) : null
        }
        confirmLabel="Regenerate Link"
        cancelLabel="Cancel"
        variant="warning"
        focusCancel={true}
      />
    </div>
  );
}

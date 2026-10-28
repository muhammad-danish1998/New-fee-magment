import React from 'react';
import { X, Printer, Download, Users, CreditCard, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/feeCalculator';
import { toTitleCase } from '../../utils/textHelper';
import { formatPhoneNumber } from '../../utils/phoneHelper';
import { CollegeLogo } from '../common/CollegeLogo';
import { printStudentReport } from '../../utils/printStudentReport';
import { exportStudentsToCSV } from '../../utils/csvExport';

export function PrintReportModal({ isOpen, onClose, students = [], brokers = [], activeFilterDescription = '' }) {
  if (!isOpen) return null;

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const brokerMap = new Map((brokers || []).map(b => [b.id, b.name]));

  // Calculate totals
  const totalStudents = students.length;
  const totalFeeSum = students.reduce((acc, s) => acc + (Number(s.total_fee) || 0), 0);
  const totalPaidSum = students.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0);
  const totalDuesSum = students.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);

  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = () => {
    printStudentReport({
      students,
      brokers,
      subtitle: activeFilterDescription
    });
  };

  const handleExportCSV = () => {
    exportStudentsToCSV(
      students,
      `JMT_Students_Report_${new Date().toISOString().split('T')[0]}.csv`,
      brokers
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action & Controls Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="print-preview-modal-title" className="text-sm sm:text-base font-extrabold text-white truncate">
                Print Preview: Student Directory &amp; Fee Report
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'} in current view
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
              title="Download Excel / CSV file"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition-all active:scale-95"
              title="Print document or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/80">
          {/* Printable White Sheet Canvas */}
          <div className="w-full bg-white text-slate-900 rounded-xl p-4 sm:p-8 shadow-2xl border border-slate-200 max-w-full mx-auto space-y-4">
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-teal-700 gap-3">
              <div className="flex items-center gap-3">
                <CollegeLogo className="w-12 h-12 rounded-full border border-teal-600/30 shadow-sm shrink-0" />
                <div>
                  <h1 className="text-base sm:text-lg font-black text-teal-800 tracking-tight uppercase leading-tight">
                    {collegeName}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {collegeAddress} • Tel: {collegePhone}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Student Directory &amp; Fee Report
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Date: <span className="font-bold text-slate-800">{reportDate}</span>
                  {activeFilterDescription && (
                    <span className="ml-2 font-normal">({activeFilterDescription})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Students</span>
                <span className="font-sans tabular-nums font-black text-sm text-teal-800">{totalStudents}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Fee</span>
                <span className="font-sans tabular-nums font-black text-sm text-slate-900">{formatCurrency(totalFeeSum)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Paid</span>
                <span className="font-sans tabular-nums font-black text-sm text-emerald-700">{formatCurrency(totalPaidSum)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Outstanding Dues</span>
                <span className={`font-sans tabular-nums font-black text-sm ${totalDuesSum > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatCurrency(totalDuesSum)}
                </span>
              </div>
            </div>

            {/* The 8-Column Data Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-teal-700 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father Name</th>
                    <th className="py-2.5 px-3">Class / Program</th>
                    <th className="py-2.5 px-3 text-right">Total Fee</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Due Amount</th>
                    <th className="py-2.5 px-2.5">Referral</th>
                    <th className="py-2.5 px-3">Contact Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {students.map((s, idx) => {
                    const classProgram = [s.academic_class, s.program_group].filter(Boolean).join(' - ');
                    const brokerName = s.broker_id ? brokerMap.get(s.broker_id) : null;
                    let referral = '';
                    if (s.admission_source === 'Referral') {
                      referral = brokerName || s.reference || 'Referral';
                    } else {
                      referral = s.reference && s.reference !== 'Direct' ? s.reference : 'Direct';
                    }
                    const dues = Number(s.dues) || 0;
                    const isOverdue = dues > 0 && s.next_payment_due_date && new Date(s.next_payment_due_date) < new Date();

                    return (
                      <tr key={s.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="py-2 px-2 text-center font-sans tabular-nums text-slate-500 text-[10px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{toTitleCase(s.student_name)}</td>
                        <td className="py-2 px-3 text-slate-700">{toTitleCase(s.father_name)}</td>
                        <td className="py-2 px-3 text-slate-700">{classProgram}</td>
                        <td className="py-2 px-3 text-right font-sans tabular-nums font-medium text-slate-800">
                          {formatCurrency(s.total_fee)}
                        </td>
                        <td className="py-2 px-3 text-right font-sans tabular-nums font-bold text-emerald-700">
                          {formatCurrency(s.total_paid)}
                        </td>
                        <td className={`py-2 px-3 text-right font-sans tabular-nums font-extrabold ${
                          dues > 0 ? (isOverdue ? 'text-rose-600' : 'text-amber-700') : 'text-emerald-700'
                        }`}>
                          {formatCurrency(dues)}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            s.admission_source === 'Referral'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {referral}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans tabular-nums text-slate-800 text-[10px]">
                          {formatPhoneNumber(s.contact_number)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Totals Summary Row at End of Table */}
                  <tr className="bg-teal-50/90 border-t-2 border-b-2 border-teal-700 font-extrabold text-xs">
                    <td colSpan={4} className="py-3 px-3 text-slate-900 font-black">
                      GRAND TOTAL ({totalStudents} Students)
                    </td>
                    <td className="py-3 px-3 text-right font-sans tabular-nums font-black text-slate-900">
                      {formatCurrency(totalFeeSum)}
                    </td>
                    <td className="py-3 px-3 text-right font-sans tabular-nums font-black text-emerald-700">
                      {formatCurrency(totalPaidSum)}
                    </td>
                    <td className={`py-3 px-3 text-right font-sans tabular-nums font-black ${
                      totalDuesSum > 0 ? 'text-amber-800' : 'text-emerald-700'
                    }`}>
                      {formatCurrency(totalDuesSum)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-[10px] text-slate-500 font-normal">
                      — End of Report —
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures Line */}
            <div className="flex justify-between pt-8 border-t border-slate-200 text-xs font-semibold text-slate-700">
              <div className="text-center w-1/4 border-t-2 border-dashed border-slate-400 pt-1.5">
                Prepared By (Accounts)
              </div>
              <div className="text-center w-1/4 border-t-2 border-dashed border-slate-400 pt-1.5">
                Verified By (Admissions)
              </div>
              <div className="text-center w-1/4 border-t-2 border-dashed border-slate-400 pt-1.5">
                Principal / Administrator
              </div>
            </div>

            {/* Footnote */}
            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              Generated via JMT Fee &amp; Admission Portal • Official Confidential Document
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>
            Paper format: <strong className="text-slate-200 font-mono">A4 Landscape</strong> recommended
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status, label, className = '' }) {
  const normStatus = (status || '').toUpperCase();

  switch (normStatus) {
    case 'PAID IN FULL':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{label || 'PAID IN FULL'}</span>
        </span>
      );
    case 'DUE':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 whitespace-nowrap ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{label || 'DUE'}</span>
        </span>
      );
    case 'OVERDUE':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 whitespace-nowrap ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{label || 'OVERDUE'}</span>
        </span>
      );
    case 'UNPAID':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/80 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30 whitespace-nowrap ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
          <span>{label || 'UNPAID'}</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 whitespace-nowrap ${className}`}>
          <span>{label || status || 'UNKNOWN'}</span>
        </span>
      );
  }
}

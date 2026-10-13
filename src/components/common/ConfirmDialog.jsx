import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, Trash2, X } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
  focusCancel = true,
  icon: CustomIcon
}) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Autofocus cancel button on open for safety against accidental enter
    if (focusCancel && cancelBtnRef.current) {
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusCancel, loading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: CustomIcon || Trash2,
          iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60',
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500 text-white shadow-md shadow-rose-600/20'
        };
      case 'warning':
        return {
          icon: CustomIcon || AlertTriangle,
          iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60',
          confirmBtn: 'bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-500 text-white shadow-md shadow-amber-600/20'
        };
      case 'primary':
      default:
        return {
          icon: CustomIcon || Info,
          iconBg: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-800/60',
          confirmBtn: 'bg-teal-600 hover:bg-teal-500 focus-visible:ring-teal-500 text-white shadow-md shadow-teal-600/20'
        };
    }
  };

  const currentVariant = getVariantStyles();
  const IconComponent = currentVariant.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${currentVariant.iconBg}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-extrabold text-slate-900 dark:text-white leading-tight"
            >
              {title}
            </h3>
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {description}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none min-h-[44px]"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:outline-none min-h-[44px] flex items-center justify-center gap-2 ${currentVariant.confirmBtn}`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

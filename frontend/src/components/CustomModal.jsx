import React, { useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Info,
  X,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning', // 'danger' | 'warning' | 'info' | 'success'
  confirmText,
  cancelText,
  confirmLoading = false,
  isAlertOnly = false,
  children,
}) {
  const { t } = useI18n();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !confirmLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmLoading, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
        );
      case 'success':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
        );
      case 'info':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Info size={22} />
          </div>
        );
      case 'warning':
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle size={22} />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (type === 'danger') {
      return 'btn bg-[#b52025] hover:bg-[#9d1b20] text-white';
    }
    if (type === 'success') {
      return 'btn bg-[#059669] hover:bg-[#047857] text-white';
    }
    return 'btn btn-primary';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Icon and Title */}
        <div className="flex items-start justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base leading-snug">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={confirmLoading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Message */}
        {message && (
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
            {message}
          </div>
        )}

        {/* Custom Children Content if provided */}
        {children && <div className="space-y-3 pt-1">{children}</div>}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onClose}
              disabled={confirmLoading}
              className="btn btn-ghost text-xs py-2 px-4"
            >
              {cancelText || t('Batal')}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm || onClose}
            disabled={confirmLoading}
            className={`${getConfirmButtonClass()} text-xs py-2 px-4 font-bold flex items-center gap-2`}
          >
            {confirmLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>
              {confirmText || (isAlertOnly ? t('Mengerti') : t('Konfirmasi'))}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


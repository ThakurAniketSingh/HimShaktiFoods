// ConfirmDialog — a themed yes/no dialog, used for deleting a product and
// for resetting the catalog. Mirrors the visual language of the product
// detail modal already used on the storefront (same overlay, radius, motion).
import { useEffect, useRef, useCallback } from 'react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  if (!open) return null;

  const confirmClasses = tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber hover:bg-amber-lt';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-forest/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={ref}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl2 max-w-[400px] w-full p-6 sm:p-7 shadow-2xl animate-modal-in outline-none text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-2xl mx-auto mb-4">
          {tone === 'danger' ? '🗑️' : '❓'}
        </div>
        <h3 className="font-serif text-forest text-xl mb-2">{title}</h3>
        <p className="text-sm text-ink-3 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full text-sm font-semibold border border-forest/15 text-ink-2 hover:border-forest/40 hover:text-forest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-full text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

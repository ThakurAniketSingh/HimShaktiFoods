// ReviewFormModal — the Add/Edit form for a single customer review. The
// live preview on the right mirrors the actual <TestiCard/> markup used
// on the Home page, so what you see here is what visitors will see.
import { useState, useEffect, useCallback, useRef, useId } from 'react';

const EMPTY_FORM = {
  name: '',
  location: '',
  rating: 5,
  text: '',
  avatar: '👤',
};

function inputClass(error) {
  return `w-full px-4 py-2.5 rounded-xl border text-sm text-ink bg-mist
    focus:outline-none focus:ring-2 focus:ring-amber/20 transition-shadow
    ${error ? 'border-red-400' : 'border-forest/15 focus:border-amber'}`;
}

function Field({ label, hint, error, required, children }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-amber">*</span>}
      </p>
      {children}
      {hint && !error && <p className="text-[11px] text-ink-3 mt-1.5">{hint}</p>}
      {error && <p className="text-red-600 text-xs mt-1.5 font-medium">⚠️ {error}</p>}
    </div>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className="text-2xl leading-none transition-transform hover:scale-110"
        >
          <span className={n <= value ? 'text-amber' : 'text-forest/15'}>★</span>
        </button>
      ))}
      <span className="text-xs text-ink-3 ml-2">{value} / 5</span>
    </div>
  );
}

/* Mirrors Home.jsx's TestiCard markup exactly, for the live preview. */
function PreviewCard({ t }) {
  return (
    <div className="bg-white rounded-xl2 p-6 flex flex-col border border-forest/8">
      <div className="text-4xl font-serif text-forest/10 leading-none mb-1 select-none">"</div>
      <div className="text-amber text-base mb-3">
        {'★'.repeat(t.rating)}
        {'☆'.repeat(5 - t.rating)}
      </div>
      <p className="text-sm text-ink-2 leading-relaxed flex-1 italic">{t.text || 'The review text will appear here.'}</p>
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-forest/6">
        <div className="w-9 h-9 rounded-full bg-earth flex items-center justify-center text-lg shrink-0">{t.avatar}</div>
        <div className="leading-none">
          <p className="text-[13px] font-bold text-forest">{t.name || 'Customer Name'}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">{t.location || 'City'}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReviewFormModal({ open, mode, initial, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name ?? '',
        location: initial.location ?? '',
        rating: initial.rating ?? 5,
        text: initial.text ?? '',
        avatar: initial.avatar ?? '👤',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    containerRef.current?.focus();
  }, [open, initial]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Reviewer name is required.';
    if (!form.text.trim()) next.text = 'Add the review text.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, rating: Number(form.rating) });
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Edit review' : 'Add review'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-forest/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-xl2 w-full max-w-[820px] max-h-[92vh] overflow-y-auto shadow-2xl animate-modal-in outline-none"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-earth hover:bg-forest/10 flex items-center justify-center text-ink-3 hover:text-forest transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <div className="p-5 sm:p-8">
          <div className="eyebrow mb-2">{mode === 'edit' ? 'Edit Review' : 'New Review'}</div>
          <h2 className="font-serif text-forest text-2xl mb-6">
            {mode === 'edit' ? `Edit ${initial?.name}'s review` : 'Add a customer review'}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Reviewer Name" error={errors.name} required>
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className={inputClass(errors.name)}
                  />
                </Field>
                <Field label="City" hint="Shown under the name">
                  <input
                    value={form.location}
                    onChange={(e) => setField('location', e.target.value)}
                    placeholder="New Delhi"
                    className={inputClass()}
                  />
                </Field>
              </div>

              <Field label="Rating">
                <StarPicker value={form.rating} onChange={(n) => setField('rating', n)} />
              </Field>

              <Field label="Review Text" error={errors.text} required>
                <textarea
                  rows={4}
                  value={form.text}
                  onChange={(e) => setField('text', e.target.value)}
                  placeholder="What did the customer say?"
                  className={inputClass(errors.text)}
                />
              </Field>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-full text-sm font-semibold border border-forest/15 text-ink-2 hover:border-forest/40 hover:text-forest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full text-sm font-bold text-white bg-amber hover:bg-amber-lt transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30"
                >
                  {mode === 'edit' ? 'Save Changes' : 'Add Review'}
                </button>
              </div>
            </form>

            <div className="lg:sticky lg:top-0 self-start">
              <p className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">Live Preview</p>
              <div className="max-w-[320px] mx-auto lg:mx-0">
                <PreviewCard t={form} />
              </div>
              <p className="text-[11px] text-ink-3 mt-3 leading-relaxed">
                This is exactly how the review card will look in the "What People Say" section on the Home page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

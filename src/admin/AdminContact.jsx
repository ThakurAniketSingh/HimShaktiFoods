// AdminContact — lets the admin edit everything shown on the public
// Contact page: address, phone, hours, email, delivery note, the
// WhatsApp button, and the Google Maps embed. Unlike Products/Reviews
// this is a single settings record, not a list — one form, one Save
// button. Saving writes straight to MongoDB Atlas via /api/contact, live
// for every visitor immediately.
import { useState, useEffect, useId } from 'react';
import { useContactInfo } from '../context/ContactContext';
import { useToast } from './ToastContext';
import { Skeleton, FormFieldSkeleton, ContactDetailSkeleton } from '../components/Skeleton';

function inputClass() {
  return `w-full px-4 py-2.5 rounded-xl border border-forest/15 text-sm text-ink bg-mist
    focus:outline-none focus:ring-2 focus:ring-amber/20 focus:border-amber transition-shadow`;
}

function Field({ label, hint, children }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">{label}</p>
      {children}
      {hint && <p className="text-[11px] text-ink-3 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function AdminContact() {
  const { contact, loading, error, updateContact } = useContactInfo();
  const { notify } = useToast();

  const [form, setForm] = useState(contact);
  const [saving, setSaving] = useState(false);

  // Seed the form once the real data has finished loading from the server.
  useEffect(() => {
    if (!loading) setForm(contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateContact(form);
      notify('Contact page updated.');
    } catch (err) {
      notify(err.message || 'Could not save contact info.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewDetails = [
    { icon: '📍', label: 'Address', content: form.address },
    { icon: '✉️', label: 'Email', content: form.email },
    { icon: '📱', label: 'Phone', content: form.phone },
    { icon: '🕐', label: 'Timing', content: form.hours },
    { icon: '🚚', label: 'Delivery', content: form.delivery },
  ];

  return (
    <>
      <div className="wrap py-8 sm:py-10">
        <div className="mb-7">
          <div className="eyebrow mb-2">Admin Panel</div>
          <h1 className="font-serif text-forest text-[1.8rem] sm:text-[2.1rem]">Manage Contact Page</h1>
          <p className="text-ink-3 text-sm mt-1">
            Everything here shows up on the public <strong>Contact &amp; Location</strong> page immediately after saving.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl2 px-5 py-3.5 mb-5 flex items-start gap-2.5">
            <span>⚠️</span>
            <span>
              Couldn't reach the database: {error}. Double-check your <code className="bg-white/60 px-1 rounded">MONGODB_URI</code>{' '}
              environment variable, then refresh this page.
            </span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8" aria-hidden="true">
            <div className="flex flex-col gap-5">
              <FormFieldSkeleton tall />
              <FormFieldSkeleton />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </div>
              <FormFieldSkeleton tall />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </div>
              <FormFieldSkeleton tall />
              <Skeleton className="h-12 w-full rounded-full mt-1" />
            </div>
            <div className="flex flex-col gap-4">
              <Skeleton className="h-2.5 w-24 rounded" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ContactDetailSkeleton key={i} />
                ))}
              </div>
              <Skeleton className="aspect-[4/3] w-full rounded-xl2" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
            {/* ── Form ─────────────────────────────── */}
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <Field label="Address" hint="Shown with a 📍 icon. Use a new line to break it into two lines.">
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  className={inputClass()}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass()}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone" hint="Shown in its own 📱 card">
                  <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClass()} />
                </Field>
                <Field label="Timing" hint="Shown in its own 🕐 card — e.g. Mon–Sat · 9 AM – 7 PM">
                  <input value={form.hours} onChange={(e) => setField('hours', e.target.value)} className={inputClass()} />
                </Field>
              </div>

              <Field label="Delivery Note" hint="Shown with a 🚚 icon. Use a new line for two lines.">
                <textarea
                  rows={2}
                  value={form.delivery}
                  onChange={(e) => setField('delivery', e.target.value)}
                  className={inputClass()}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="WhatsApp Number" hint="Digits only, with country code — e.g. 918923429380">
                  <input
                    value={form.whatsappNumber}
                    onChange={(e) => setField('whatsappNumber', e.target.value.replace(/[^0-9]/g, ''))}
                    className={inputClass()}
                  />
                </Field>
                <Field label="WhatsApp Message" hint="Pre-filled text when someone taps the button">
                  <input
                    value={form.whatsappMessage}
                    onChange={(e) => setField('whatsappMessage', e.target.value)}
                    className={inputClass()}
                  />
                </Field>
              </div>

              <Field
                label="Google Maps Embed URL"
                hint={
                  'In Google Maps: open your location → Share → Embed a map → copy ONLY the link inside src="…" from the <iframe> code, and paste it here.'
                }
              >
                <textarea
                  rows={3}
                  value={form.mapEmbedUrl}
                  onChange={(e) => setField('mapEmbedUrl', e.target.value)}
                  className={`${inputClass()} font-mono text-[11px]`}
                />
              </Field>

              <button
                type="submit"
                disabled={saving}
                className="py-3 rounded-full text-sm font-bold text-white bg-amber hover:bg-amber-lt transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </form>

            {/* ── Live preview ─────────────────────── */}
            <div className="lg:sticky lg:top-0 self-start flex flex-col gap-4">
              <p className="text-[11px] font-bold text-ink-3 uppercase tracking-widest">Live Preview</p>

              <div className="flex flex-col gap-3">
                {previewDetails.map(({ icon, label, content }) => (
                  <div key={label} className="flex gap-3 bg-white rounded-xl2 p-4 border border-forest/8">
                    <div className="w-9 h-9 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center text-lg shrink-0">
                      {icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-line">{content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {form.mapEmbedUrl && (
                <div className="rounded-xl2 overflow-hidden border border-forest/10 shadow-sm aspect-[4/3]">
                  <iframe
                    src={form.mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Map preview"
                  />
                </div>
              )}
              <p className="text-[11px] text-ink-3 leading-relaxed">
                This is exactly how the Contact page will look after you save.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

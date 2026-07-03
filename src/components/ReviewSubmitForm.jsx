// ReviewSubmitForm — lets any visitor leave a review from the Contact
// page. Submissions go to /api/testimonials/submit and land as "pending"
// — they don't show anywhere on the site until an admin approves them
// from the Reviews tab. This component collects the info and shows a
// thank-you state; the only thing it reads back from the response is
// `canSubmitAgain` (see api/testimonials/submit.js), used to decide
// whether to offer a "leave another review" button — visitors can submit
// up to RATE_LIMIT_MAX reviews per day, so it disappears once that's used up.
//
// Two quiet anti-spam touches live here:
//  - A "company" field that's visually hidden — real visitors never see
//    or fill it, so if it arrives non-empty the backend knows it's a bot
//    and silently ignores the submission.
//  - A required phone number, which is never shown anywhere on the
//    public site — it only lets an admin verify a review is from a real
//    customer before approving it.
//
// Every submission gets the same default avatar (no picker here) — keeps
// the form short and avoids a "which emoji am I" decision for a one-time
// reviewer.
import { useState, useId } from 'react';
import { useTestimonials } from '../context/TestimonialsContext';

const EMPTY_FORM = {
  name: '',
  city: '',
  phone: '',
  rating: 5,
  text: '',
  avatar: '👤',
  company: '', // honeypot — must stay empty
};

export default function ReviewSubmitForm() {
  const { submitTestimonial } = useTestimonials();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [canSubmitAgain, setCanSubmitAgain] = useState(true);
  const nameId = useId();
  const cityId = useId();
  const phoneId = useId();
  const ratingLabelId = useId();
  const textId = useId();
  const [submitError, setSubmitError] = useState('');

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Helper to clean phone input: only digits, max 10
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setField('phone', raw);
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Please tell us your name.';
    if (!form.city.trim()) next.city = 'Please tell us your city.';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length !== 10) next.phone = 'Phone number must be exactly 10 digits.';
    if (!form.text.trim() || form.text.trim().length < 10) next.text = 'Please write a few words about your experience.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitTestimonial({
        name: form.name.trim(),
        rating: form.rating,
        text: form.text.trim(),
        avatar: form.avatar,
        location: form.city.trim(),
        phone: form.phone.trim(),
        company: form.company, // honeypot, should always be empty
      });
      // Defaults to true if the server response is ever missing this
      // field for some reason — better to over-offer the button than to
      // silently hide a valid option.
      setCanSubmitAgain(result?.canSubmitAgain ?? true);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Couldn't submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center bg-white rounded-xl2 p-8 border border-forest/8">
        <p className="text-4xl mb-3">🙏</p>
        <h3 className="font-serif text-forest text-xl mb-2">Thank you!</h3>
        <p className="text-sm text-ink-2 leading-relaxed max-w-sm mx-auto">
          We've received your review. It'll appear on our Home page once one of our team approves it.
        </p>
        {canSubmitAgain && (
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setSubmitted(false);
            }}
            className="mt-5 text-sm font-semibold text-forest underline underline-offset-2 hover:text-grove"
          >
            Leave another review
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-xl2 p-6 sm:p-7 border border-forest/8">
      <p className="text-[13px] text-ink-3 mb-6 leading-relaxed">
        Tell other customers about your experience. Reviews are checked by our team before they go live.
      </p>

      {/* flex-1 here makes the form absorb any extra column height, so the
          Submit button below always lines up with the WhatsApp button in
          the column next to it, instead of floating partway up the card. */}
      <form onSubmit={handleSubmit} className="relative flex flex-col flex-1">
        <div className="flex flex-col gap-4 flex-1">
          {/* Honeypot — invisible to real visitors, catches simple bots. */}
          <div aria-hidden="true" className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none -z-10">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.company}
              onChange={(e) => setField('company', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={nameId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">
                Your Name <span className="text-amber">*</span>
              </label>
              <input
                id={nameId}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="eg: Aniket Singh"
                maxLength={30}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-ink bg-mist focus:outline-none focus:ring-2 focus:ring-amber/20 transition-shadow
                  ${errors.name ? 'border-red-400' : 'border-forest/15 focus:border-amber'}`}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1.5 font-medium">⚠️ {errors.name}</p>}
            </div>

            <div>
              <label htmlFor={cityId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">
                Your City <span className="text-amber">*</span>
              </label>
              <input
                id={cityId}
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="eg: Dehradun"
                maxLength={30}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-ink bg-mist focus:outline-none focus:ring-2 focus:ring-amber/20 transition-shadow
                  ${errors.city ? 'border-red-400' : 'border-forest/15 focus:border-amber'}`}
              />
              {errors.city && <p className="text-red-600 text-xs mt-1.5 font-medium">⚠️ {errors.city}</p>}
            </div>
          </div>

          <div>
            <label htmlFor={phoneId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">
              Phone Number <span className="text-amber">*</span>
            </label>
            <input
              id={phoneId}
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="eg: 9876543210"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-ink bg-mist focus:outline-none focus:ring-2 focus:ring-amber/20 transition-shadow
                ${errors.phone ? 'border-red-400' : 'border-forest/15 focus:border-amber'}`}
            />
            {errors.phone ? (
              <p className="text-red-600 text-xs mt-1.5 font-medium">⚠️ {errors.phone}</p>
            ) : (
              <p className="text-[11px] text-ink-3 mt-1.5">
                Never shown publicly — only used by our team to verify genuine reviews.
              </p>
            )}
          </div>

          <div role="group" aria-labelledby={ratingLabelId}>
            <p id={ratingLabelId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">Your Rating</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setField('rating', n)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  className="text-2xl leading-none transition-transform hover:scale-110"
                >
                  <span className={n <= form.rating ? 'text-amber' : 'text-forest/15'}>★</span>
                </button>
              ))}
              <span className="text-xs text-ink-3 ml-2">{form.rating} / 5</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={textId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest">
                Your Review <span className="text-amber">*</span>
              </label>
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  form.text.length >= 150 ? 'text-red-600' : form.text.length >= 130 ? 'text-amber' : 'text-ink-3'
                }`}
              >
                {form.text.length} / 150
              </span>
            </div>
            <textarea
              id={textId}
              rows={4}
              value={form.text}
              onChange={(e) => setField('text', e.target.value)}
              placeholder="What did you like? How was the quality, taste, or delivery?"
              maxLength={150}
              className={`w-full flex-1 px-4 py-2.5 rounded-xl border text-sm text-ink bg-mist focus:outline-none focus:ring-2 focus:ring-amber/20 transition-shadow resize-none
                ${errors.text ? 'border-red-400' : 'border-forest/15 focus:border-amber'}`}
            />
            {errors.text && <p className="text-red-600 text-xs mt-1.5 font-medium">⚠️ {errors.text}</p>}
          </div>
        </div>

        {submitError && (
          <p className="text-red-600 text-xs font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
            ⚠️ {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 py-3.5 rounded-full text-sm font-bold text-white bg-amber hover:bg-amber-lt transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
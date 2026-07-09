// Contact page — shows contact details, lets visitors leave a review, and
// embeds a Google Map. All of the contact content (address, phone, email,
// delivery note, WhatsApp number/message and the map) is editable from the
// admin panel's "Contact Page" tab — see ContactContext for where it's
// fetched from. Reviews submitted here go to the admin panel's Reviews
// tab as "pending" until approved — see ReviewSubmitForm.

import WhatsAppIcon from '../components/WhatsAppIcon'
import ReviewSubmitForm from '../components/ReviewSubmitForm'
import { Skeleton, ContactDetailSkeleton } from '../components/Skeleton'
import { useContactInfo } from '../context/ContactContext'

export default function Contact() {
  const { contact, loading } = useContactInfo();

  const WA = `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.whatsappMessage)}`;

  const DETAILS = [
    { icon: '📍', label: 'Address', content: contact.address },
    { icon: '✉️', label: 'Email', content: contact.email },
    { icon: '📱', label: 'Phone', content: contact.phone },
    { icon: '🕐', label: 'Timing', content: contact.hours },
    { icon: '🚚', label: 'Delivery', content: contact.delivery },
  ];

  return (
    <div className="min-h-screen bg-mist">

      {/* ── Banner ───────────────────────────────────── */}
      <div className="bg-forest py-20 px-4 text-center relative overflow-hidden">
        <svg viewBox="0 0 900 160" preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-[0.055] pointer-events-none" aria-hidden>
          <path d="M0,160 L0,90 L110,40 L250,80 L430,15 L600,60 L760,22 L900,55 L900,160Z" fill="white"/>
        </svg>
        <div className="relative z-10">
          <div className="eyebrow justify-center text-amber mb-3 before:bg-amber/40 after:bg-amber/40">
            Find Us
          </div>
          <h1 className="font-serif text-white text-[clamp(2rem,4vw,3rem)] mb-3">
            Contact & Location
          </h1>
          <p className="text-white/60 text-sm max-w-sm mx-auto">
            Reach us on WhatsApp for the fastest response, or visit us near Haldwani.
          </p>
        </div>
      </div>

      {/* ── Contact details + Leave a Review ────────────── */}
      <section className="wrap py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Contact details */}
          <div className="h-full flex flex-col justify-between">
            <div>
              <h2 className="font-serif text-heading text-2xl mb-8">Get in Touch</h2>
              <div className="flex flex-col gap-4">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <ContactDetailSkeleton key={i} />)
                  : DETAILS.map(({ icon, label, content }) => (
                      <div key={label}
                        className="flex gap-4 bg-surface rounded-xl2 p-5 border border-edge/8
                          hover:border-edge/20 hover:shadow-sm transition-all duration-200">
                        <div className="w-10 h-10 rounded-xl bg-amber/10 border border-amber/20
                          flex items-center justify-center text-xl shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold text-amber uppercase tracking-widest mb-1">
                            {label}
                          </p>
                          <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">
                            {content}
                          </p>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* WA button — pinned to the bottom so it lines up with the
                bottom of the review form column, whatever height that is */}
            {loading ? (
              <div className="skeleton rounded-full h-[50px] w-full mt-6" />
            ) : (
              <a href={WA} target="_blank" rel="noopener noreferrer"
                 className="mt-6 flex items-center justify-center gap-2 bg-wa hover:bg-wa-dk
                 text-white font-bold text-sm py-3.5 rounded-full transition-all duration-200
                 hover:shadow-lg hover:shadow-green-400/30 hover:-translate-y-0.5">
                <WhatsAppIcon size={16} /> Ask on WhatsApp
              </a>
            )}
          </div>

          {/* Leave a Review */}
          <div className="h-full flex flex-col">
            <h2 className="font-serif text-heading text-2xl mb-8">Leave a Review</h2>
            <div className="flex-1">
              <ReviewSubmitForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Map — full width, below ─────────────────────── */}
      <section className="wrap pb-16">
        <div className="text-center mb-6">
          <h2 className="font-serif text-heading text-2xl">Find Us on the Map</h2>
        </div>
        <div className="rounded-xl2 overflow-hidden border border-edge/10 shadow-sm h-[255px] sm:h-[315px]">
          {loading ? (
            <Skeleton className="w-full h-full rounded-none" />
          ) : (
            <iframe
              src={contact.mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="HimShakti Location — Haldwani, Uttarakhand"
            />
          )}
        </div>
        <p className="text-xs text-ink-3 text-center mt-3">
          📍 HimShakti Foods · Near Haldwani, Uttarakhand
        </p>
      </section>
    </div>
  )
}
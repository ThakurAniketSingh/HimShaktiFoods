// HowToOrder page — explains the 4-step WhatsApp ordering process.

import WhatsAppIcon from '../components/WhatsAppIcon'
import { useContactInfo } from '../context/ContactContext'

const STEPS = [
  { n:'01', icon:'🛒', title:'Browse & Pick',   body:'Explore our catalog and select the products you want.' },
  { n:'02', icon:<WhatsAppIcon size={20} />, title:'Tap WhatsApp',    body:'Hit "Order on WhatsApp" — a pre-filled message opens instantly.' },
  { n:'03', icon:'✅', title:'Confirm & Pay',   body:'Our team confirms and shares payment details within a few hours.' },
  { n:'04', icon:'📦', title:'Receive Fresh',   body:'Packed fresh and dispatched within 48 hours of order confirmation.' },
]

export default function HowToOrder() {
  const { contact } = useContactInfo();
  // WA is pre-built so it's instantly available when the user taps a button
  // elsewhere on the page that links here, or if a CTA button is added later.
  const WA = `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent('Namaste HimShakti! I want to place an order.')}`;
  return (
    <div className="min-h-screen bg-mist">

      {/* ── Banner ───────────────────────────────────── */}
      <div className="bg-forest py-20 px-4 text-center relative overflow-hidden">
        <svg viewBox="0 0 900 160" preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-[0.055] pointer-events-none" aria-hidden>
          <path d="M0,160 L0,90 L140,30 L300,80 L460,10 L620,60 L780,15 L900,50 L900,160Z" fill="white"/>
        </svg>
        <div className="relative z-10">
          <div className="eyebrow justify-center text-amber mb-3 before:bg-amber/40 after:bg-amber/40">
            How to Order
          </div>
          <h1 className="font-serif text-white text-[clamp(2rem,4vw,3rem)] mb-3">
            WhatsApp Ordering in 4 Steps
          </h1>
          <p className="text-white/60 text-sm max-w-sm mx-auto">
            No app, no login, no checkout — just tap, chat, and receive fresh at your door.
          </p>
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────── */}
      <section className="wrap py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative bg-white rounded-xl2 p-6 border border-forest/10
              hover:shadow-md hover:border-forest/25 transition-all duration-200">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-[52px] left-[calc(100%)] w-6
                  h-px bg-forest/15 z-10" />
              )}
              <div className="w-12 h-12 rounded-xl bg-amber/10 border border-amber/20
                flex items-center justify-center text-2xl mb-4">
                {s.icon}
              </div>
              <p className="text-[10px] font-bold text-amber/70 uppercase tracking-widest mb-2">{s.n}</p>
              <h3 className="font-serif text-forest text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-ink-3 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
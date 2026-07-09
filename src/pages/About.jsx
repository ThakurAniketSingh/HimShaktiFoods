// About page — brand story, values cards, stats strip, and CTA.

import { Link } from 'react-router-dom'

const VALUES = [
  { icon:'🌱', label:'100% Natural'      },
  { icon:'🏔️', label:'Since 2009'         },
  { icon:'📦', label:'Pan India Delivery' },
  { icon:'🫶', label:'No Middlemen'       },
]

const CARDS = [
  { icon:'🌄', title:'Rooted in Kumaon',
    body:`HimShakti was born in the foothills of Haldwani, Nainital. For over 15 years, we have
     worked directly with Pahadi farming families to bring you authentic mountain produce —
     from finger millet to wild honey.` },
  { icon:'🤝', title:'Fair Trade, Always',
    body:`We pay our farmers fair prices immediately — no haggling, no delays. This ensures
     sustainable livelihoods and preserves traditional farming methods that are centuries old.` },
  { icon:'🔬', title:'No Preservatives, No Shortcuts',
    body:`Every product is processed in small batches at our Haldwani unit. We use natural
     preservation techniques like sun-drying, cold-pressing, and fermentation.
     Absolutely no synthetic chemicals.` },
]

const MtnWatermark = () => (
  <svg viewBox="0 0 900 180" preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 w-full h-full opacity-[0.055] pointer-events-none" aria-hidden>
    <path d="M0,180 L0,100 L130,40 L270,90 L420,10 L580,70 L730,18 L880,65 L900,50 L900,180Z" fill="white"/>
  </svg>
)

export default function About() {
  return (
    <div className="min-h-screen bg-mist">

      {/* ── Hero banner ─────────────────────────────── */}
      <div className="bg-forest relative overflow-hidden py-24 px-4 text-center">
        <MtnWatermark />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="eyebrow justify-center text-amber mb-3 before:bg-amber/40 after:bg-amber/40">
            About HimShakti
          </div>
          <h1 className="font-serif text-white text-[clamp(2rem,4vw,3rem)] leading-snug mb-4">
            Bringing the Himalayas<br/>to Your Plate
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            15+ years of connecting mountain farmers with urban families — honestly, directly, freshly.
          </p>
        </div>
      </div>

      {/* ── Story ────────────────────────────────────── */}
      <section className="wrap py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* Quote panel */}
          <div className="bg-forest rounded-xl2 p-8 sm:p-10 relative overflow-hidden">
            <MtnWatermark />
            <div className="relative z-10">
              <div className="glass rounded-xl px-3.5 py-1.5 text-[10.5px] font-bold
                text-white/70 uppercase tracking-wider w-fit mb-6">
                📍 Haldwani · <em>Est. 2009</em>
              </div>
              <blockquote className="font-serif text-white text-xl leading-snug italic mb-6">
                "We started with a simple belief — that the purest, most nourishing foods come
                straight from nature. Our mission is to connect the farmers of Uttarakhand with
                families across India, without any middlemen or preservatives."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="h-px bg-amber/40 w-8" />
                <span className="text-sm text-white/60">HimShakti Founders</span>
              </div>
            </div>
          </div>

          {/* Value cards */}
          <div className="flex flex-col gap-4">
            {CARDS.map(c => (
              <div key={c.title}
                className="bg-surface rounded-xl2 p-5 flex gap-4 border border-edge/8
                  hover:shadow-md hover:border-edge/20 transition-all duration-200">
                <span className="text-3xl shrink-0">{c.icon}</span>
                <div>
                  <p className="font-serif text-heading text-[1.05rem] mb-1.5">{c.title}</p>
                  <p className="text-sm text-ink-3 leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────── */}
      <section className="bg-earth border-y border-edge/10 py-12">
        <div className="wrap">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-7">
            {VALUES.map(v => (
              <div key={v.label} className="flex flex-col items-center text-center gap-2">
                <span className="text-3xl">{v.icon}</span>
                <span className="text-sm font-semibold text-ink-2">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <div className="py-16 text-center bg-mist">
        <Link to="/products"
          className="inline-flex items-center gap-2 bg-forest hover:bg-grove dark:bg-sage dark:hover:bg-sage/80 text-white
          font-bold px-8 py-4 rounded-full transition-all duration-200
          hover:-translate-y-0.5 hover:shadow-xl hover:shadow-forest/20 text-sm">
          Explore Our Products →
        </Link>
      </div>
    </div>
  )
}
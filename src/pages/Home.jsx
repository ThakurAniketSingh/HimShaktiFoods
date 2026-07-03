// Home page — the landing page shown at /.
// Contains: hero, stats strip, origin story, featured products, testimonials.

import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTestimonials } from "../context/TestimonialsContext";
import { useProducts } from "../context/ProductsContext";
import { useContactInfo } from "../context/ContactContext";
import { shuffleArray } from "../utils/shuffleArray";
import { ProductCardSkeleton, TestiCardSkeleton } from "../components/Skeleton";
import ProductCard from "../components/ProductCard";
import WhatsAppIcon from "../components/WhatsAppIcon";

// Picks a random set of APPROVED reviews, but only re-shuffles when the
// actual set of approved review ids changes — not every time `testimonials`
// gets a new array reference (e.g. a duplicate fetch). Without this, two
// back-to-back fetches that return the same data would still visibly
// reshuffle the cards a second time right after the first one appears.
function useStableRandomReviews(testimonials, count) {
  const approved = useMemo(() => testimonials.filter((t) => t.status === 'approved'), [testimonials]);
  const idsKey = useMemo(() => approved.map((t) => t.id).sort((a, b) => a - b).join(','), [approved]);
  const ref = useRef({ key: null, picks: [] });
  if (ref.current.key !== idsKey) {
    ref.current = { key: idsKey, picks: shuffleArray(approved).slice(0, count) };
  }
  return ref.current.picks;
}

/* ── simple responsive hook ─────────────────────────────────────── */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/* ── Floating WhatsApp CTA ───────────────────────────────────────── */
function FloatingWA({ href }) {
  const [show, setShow] = useState(false);
  const heroRef = useRef(null);
  useEffect(() => {
    heroRef.current = document.getElementById("hero");
    if (!heroRef.current) {
      setShow(true);
      return;
    }
    const obs = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), {
      rootMargin: "0px",
    });
    obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  // Don't render at all while contact data is still loading (href=null).
  // The button appears only after the user scrolls past the hero, which
  // takes longer than the API round-trip, so in practice it's always ready.
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Order on WhatsApp"
      className={`fixed bottom-5 right-4 z-50 flex items-center gap-2 bg-wa hover:bg-wa-dk
        text-white font-bold text-sm px-5 py-3 rounded-full shadow-xl shadow-green-500/30
        transition-all duration-300
        ${show ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}`}
    >
      <WhatsAppIcon size={17} />
      Order Now
    </a>
  );
}

/* ── Mountain watermark SVG ─────────────────────────────────────── */
const MtnWatermark = () => (
  <svg
    viewBox="0 0 900 220"
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 w-full h-full opacity-[0.055] pointer-events-none"
    aria-hidden
  >
    <path
      d="M0,220 L0,140 L100,60 L200,110 L330,20 L460,90 L590,10 L720,75 L850,35 L900,60 L900,220Z"
      fill="white"
    />
    <path
      d="M0,220 L0,175 L150,125 L300,160 L480,100 L660,148 L840,110 L900,130 L900,220Z"
      fill="white"
    />
  </svg>
);

/* ── Category item (permanent glowing aura, no box) ────────────── */
function CategoryItem({ emoji, label, to, posClass, animClass }) {
  return (
    <Link
      to={to}
      className={`absolute z-20 flex flex-col items-center gap-1 cursor-pointer
        ${posClass} ${animClass} transition-transform duration-300 hover:scale-110`}
    >
      <span className="relative text-3xl drop-shadow-md">
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-10 h-10 rounded-full bg-white/20 blur-md animate-pulse" />
        </span>
        {emoji}
      </span>
      <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
        {label}
      </span>
    </Link>
  );
}

/* ── Stat bubble ────────────────────────────────────────────────── */
function NumBubble({ value, label }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="font-serif text-3xl sm:text-4xl text-forest">
        {value}
      </span>
      <span className="text-xs font-semibold text-ink-3 mt-1 tracking-wide">
        {label}
      </span>
    </div>
  );
}

/* ── Story value card ───────────────────────────────────────────── */
function StoryCard({ icon, title, body }) {
  return (
    <div
      className="bg-white rounded-xl2 p-5 flex gap-4 border border-forest/8
      hover:shadow-md transition-shadow duration-200 hover:border-forest/20"
    >
      <span className="text-3xl shrink-0">{icon}</span>
      <div>
        <p className="font-serif text-forest text-[1.05rem] mb-1.5">{title}</p>
        <p className="text-sm text-ink-3 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

/* ── Testimonial card ───────────────────────────────────────────── */
function TestiCard({ t }) {
  const rating = Number(t.rating) || 0;
  return (
    <div
      className="bg-white rounded-xl2 p-6 flex flex-col border border-forest/8
      hover:shadow-md transition-shadow duration-200 hover:border-forest/20"
    >
      <div className="text-4xl font-serif text-forest/10 leading-none mb-1 select-none">
        "
      </div>
      <div className="text-amber text-base mb-3">
        {"★".repeat(rating)}
        {"☆".repeat(Math.max(0, 5 - rating))}
      </div>
      <p className="text-sm text-ink-2 leading-relaxed flex-1 italic">
        {t.text}
      </p>
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-forest/6">
        <div className="w-9 h-9 rounded-full bg-earth flex items-center justify-center text-lg shrink-0">
          {t.avatar}
        </div>
        <div className="leading-none">
          <p className="text-[13px] font-bold text-forest">{t.name}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">{t.location}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Home Page ───────────────────────────────────────────────────── */
export default function Home() {
  const { products, loading: productsLoading } = useProducts();
  const { testimonials, loading: reviewsLoading } = useTestimonials();
  const { contact, loading: contactLoading } = useContactInfo();
  const WA = contactLoading
    ? null
    : `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent('Namaste HimShakti!')}`;
  const [featured, setFeatured] = useState([]);
  const randomReviews = useStableRandomReviews(testimonials, 4);
  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    const FEATURED_COUNT = 4;
    // Newest first — a higher `id` means it was added more recently
    // (ids increment with every new product; editing an existing product
    // never changes its id). Sorting here — not just when topping up
    // with non-sale products below — makes sure the latest sale items
    // always lead the section, whether there are 1, 4, or 40 of them.
    const onSale = products.filter((p) => p.onSale).sort((a, b) => b.id - a.id);

    if (onSale.length >= FEATURED_COUNT) {
      // Plenty on sale — show the 4 most recently added sale products.
      setFeatured(onSale.slice(0, FEATURED_COUNT));
    } else {
      // Show every on-sale product (newest first), then top up the
      // remaining slots with the most recently added non-sale products,
      // so the section always has a full set of cards.
      const saleIds = new Set(onSale.map((p) => p.id));
      const remainingSlots = FEATURED_COUNT - onSale.length;
      const latestOthers = [...products]
        .filter((p) => !saleIds.has(p.id))
        .sort((a, b) => b.id - a.id)
        .slice(0, remainingSlots);
      setFeatured([...onSale, ...latestOthers]);
    }
  }, [products]);

  const CATEGORY_ITEMS = [
    {
      emoji: "🍟",
      label: "Snacks",
      to: "/products?category=snacks",
      pos: "top-[2%]  left-1/2 -translate-x-1/2",
      anim: "animate-float",
    },
    {
      emoji: "🧃",
      label: "Juices",
      to: "/products?category=juices",
      pos: "top-[22%] right-[0%]",
      anim: "animate-float-1",
    },
    {
      emoji: "🫙",
      label: "Pickles",
      to: "/products?category=pickles",
      pos: "top-[70%] right-[0%]",
      anim: "animate-float-2",
    },
    {
      emoji: "🍫",
      label: "Sweets",
      to: "/products?category=sweets",
      pos: "top-[70%] left-[0%]",
      anim: "animate-float-3",
    },
    {
      emoji: "💪",
      label: "Superfoods",
      to: "/products?category=superfoods",
      pos: "top-[22%] left-[0%]",
      anim: "animate-float",
    },
    {
      emoji: "📦",
      label: "All Products",
      to: "/products",
      pos: "top-[92%] left-1/3 -translate-y-1/2",
      anim: "animate-float",
    },
  ];

  return (
    <>
      {/* ── HERO ─────────────────────────────────────── */}
      <section
        id="hero"
        className="relative bg-forest overflow-hidden min-h-[88vh] flex items-center"
      >
        <MtnWatermark />
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="w-[480px] h-[480px] rounded-full opacity-[0.07]"
            style={{
              background:
                "radial-gradient(circle, #f5c842 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="wrap relative z-10 pt-10 pb-16 md:py-20 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* 1️⃣ Text block */}
            <div className="order-1 md:order-1 md:col-start-1 md:row-start-1">
              {/* Badge – hidden on mobile */}
              {!isMobile && (
                <div
                  className="animate-fade-up inline-flex items-center gap-2 glass rounded-full
                  px-4 py-1.5 w-fit mb-6"
                >
                  <span className="text-sm">🌿</span>
                  <span className="text-[11px] font-bold text-white/80 tracking-widest uppercase">
                    From Haldwani, Uttarakhand
                  </span>
                </div>
              )}

              <h1
                className="animate-fade-up-d1 font-serif text-[2.7rem] sm:text-[3.4rem] lg:text-[3.9rem]
                text-white leading-[1.05] mb-5"
              >
                Pure <em className="text-gold not-italic">Himalayan</em>
                <br />
                Goodness,
                <br />
                At Your Door.
              </h1>

              <p className="animate-fade-up-d2 text-white/60 text-sm font-semibold uppercase tracking-widest mb-3">
                No preservatives · No middlemen
              </p>

              <p className="animate-fade-up-d2 text-white/65 text-base leading-relaxed max-w-md">
                {isMobile
                  ? "Authentic mountain foods — millets, pickles, juices & more. Direct from our Haldwani unit."
                  : "HimShakti brings authentic mountain foods — millets, pickles, juices and more — made by Pahadi farming families using centuries-old recipes. Direct from our unit near Haldwani."}
              </p>
            </div>

            {/* 2️⃣ Orb block */}
            <div className="order-2 md:order-2 md:col-start-2 md:row-start-1 flex items-center justify-center relative mt-0 md:mt-0">
              <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] pointer-events-auto">
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-[20px] rounded-full border border-white/8" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    className="w-[110px] h-[110px] sm:w-[140px] sm:h-[140px] rounded-full bg-gradient-to-br
                    from-amber/30 to-forest border border-amber/25 flex flex-col
                    items-center justify-center gap-2 shadow-xl"
                  >
                    <span className="font-serif text-gold/80 text-[0.9rem] sm:text-[1.3rem] leading-none">
                      HimShakti
                    </span>
                  </div>
                </div>
                {CATEGORY_ITEMS.map((item) => (
                  <CategoryItem
                    key={item.label}
                    emoji={item.emoji}
                    label={item.label}
                    to={item.to}
                    posClass={item.pos}
                    animClass={item.anim}
                  />
                ))}
              </div>
            </div>

            {/* 3️⃣ Buttons block – centered on mobile, left-aligned on desktop */}
            <div className="order-3 md:order-3 md:col-start-1 md:row-start-2 flex flex-wrap gap-3 justify-center md:justify-start animate-fade-up-d3 mt-14 md:mt-0">
              <Link
                to="/products"
                className="bg-amber hover:bg-amber-lt text-white font-bold px-7 md:px-[calc(1.75rem*1.1)] py-3.5
                rounded-full transition-all duration-200 hover:-translate-y-0.5
                hover:shadow-xl hover:shadow-amber/30 text-sm"
              >
                🛒 Explore Products
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="w-full h-[50px] fill-mist"
          >
            <path d="M0,80 C240,20 480,80 720,40 C960,0 1200,60 1440,30 L1440,80Z" />
          </svg>
        </div>
      </section>

      {/* ── NUMBERS STRIP ────────────────────────────── */}
      <section className="bg-mist border-b border-forest/8 py-10">
        <div className="wrap">
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8
            divide-x-0 sm:divide-x divide-forest/10"
          >
            <NumBubble value="100%" label="Natural" />
            <NumBubble value="Zero" label="Preservatives" />
            <NumBubble value="6+" label="Categories" />
            <NumBubble value="15+" label="Years Legacy" />
          </div>
        </div>
      </section>

      {/* ── STORY ────────────────────────────────────── */}
      <section className="bg-mist py-20">
        <div className="wrap">
          <div className="text-center mb-14">
            <div className="eyebrow justify-center mb-3">Our Story</div>
            <h2 className="font-serif text-[clamp(1.9rem,3.5vw,2.7rem)] text-forest max-w-[500px] mx-auto leading-snug">
              From Mountain Villages
              <br />
              to Your Table
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="relative bg-forest rounded-xl2 p-8 sm:p-10 overflow-hidden">
              <MtnWatermark />
              <div className="relative z-10">
                <div className="w-8 h-8 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center mb-6">
                  <span className="text-amber text-lg font-serif leading-none">
                    "
                  </span>
                </div>
                <div className="glass rounded-xl px-3.5 py-1.5 text-[10.5px] font-bold text-white/70 uppercase tracking-wider w-fit mb-5">
                  📍 Haldwani · <em>Est. 2009</em>
                </div>
                <blockquote className="font-serif text-white text-xl sm:text-2xl leading-snug mb-6 italic">
                  "We set out to bring the most nourishing foods of the
                  Himalayas directly to families across India — with nothing
                  added, and nothing taken away."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-px bg-amber/40 w-8" />
                  <span className="text-sm text-white/60 font-medium">
                    HimShakti Founders
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <StoryCard
                icon="🌾"
                title="Straight from Pahadi Farmers"
                body="We source finger millets, amaranth, wild fruits and herbs directly from farming families in the Kumaon hills — no middlemen, no delays."
              />
              <StoryCard
                icon="🫙"
                title="Small Batch, Always Fresh"
                body="Every product is processed in small batches at our Haldwani unit and dispatched within 48 hours of your order."
              />
              <StoryCard
                icon="🤝"
                title="Fair Trade, Always"
                body="We pay our farmers fair prices immediately — no haggling, no delays. Ensuring sustainable livelihoods and preserving centuries-old methods."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────── */}
      {(productsLoading || featured.length > 0) && (
        <section className="bg-earth py-20">
          <div className="wrap">
            <div className="text-center mb-12">
              <div className="eyebrow justify-center mb-3">Featured Products</div>
              <h2 className="font-serif text-[clamp(1.9rem,3.5vw,2.7rem)] text-forest mb-3">
                Taste the Himalayas
              </h2>
              <p className="text-ink-3 text-sm max-w-sm mx-auto">
                Tap any card for details. Order straight from WhatsApp — no
                checkout, no login.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {productsLoading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <div className="text-center">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-forest hover:bg-grove text-white
                font-bold px-8 py-4 rounded-full transition-all duration-200
                hover:-translate-y-0.5 hover:shadow-xl hover:shadow-forest/20 text-sm"
              >
                View All Products →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      {(reviewsLoading || randomReviews.length > 0) && (
        <section className="bg-mist py-20">
          <div className="wrap">
            <div className="text-center mb-12">
              <div className="eyebrow justify-center mb-3">What People Say</div>
              <h2 className="font-serif text-[clamp(1.9rem,3.5vw,2.7rem)] text-forest">
                Customers Love HimShakti
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {reviewsLoading
                ? Array.from({ length: 4 }).map((_, i) => <TestiCardSkeleton key={i} />)
                : randomReviews.map((t) => <TestiCard key={t.id} t={t} />)}
            </div>
          </div>
        </section>
      )}

      <FloatingWA href={WA} />
    </>
  );
}
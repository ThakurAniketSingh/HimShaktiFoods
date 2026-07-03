// ProductCard — displays one product in a card grid.
// Clicking the card (or pressing Enter/Space) opens a detail modal.
// The WhatsApp button on the card itself opens a pre-filled chat directly.

import { useState, useCallback, useEffect, useRef } from 'react';
import WhatsAppIcon from './WhatsAppIcon';
import { useContactInfo } from '../context/ContactContext';

// Fallback image shown if the product image fails to load.
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1ebe0'/%3E%3Cg fill='%23c9bea8'%3E%3Ccircle cx='150' cy='82' r='22'/%3E%3Cpath d='M90 150 L130 105 L160 135 L190 100 L230 150 Z'/%3E%3C/g%3E%3Ctext x='150' y='178' font-family='sans-serif' font-size='13' fill='%23907e6a' text-anchor='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E";

// Builds a WhatsApp deep-link with the product name and price pre-filled.
const buildWaUrl = (product, whatsappNumber) => {
  const msg =
    `Namaste HimShakti! 🙏\nI'd like to order:\n\n*${product.name}* — ₹${product.price}\nQty: 1\n\nPlease share payment & delivery details.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ product, onClose }) {
  const { contact, loading } = useContactInfo();
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
        bg-forest/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKey}
        className="relative bg-white rounded-xl2 max-w-[680px] w-full max-h-[90vh]
          overflow-y-auto shadow-2xl animate-modal-in outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-earth
            hover:bg-forest/10 flex items-center justify-center text-ink-3
            hover:text-forest transition-colors text-lg leading-none">
          ✕
        </button>

        <div className="flex items-center justify-center h-44 sm:h-52 rounded-t-xl2 overflow-hidden"
          style={{ background: product.bg }}>
          <img
            src={product.image}
            alt={product.name}
            decoding="async"
            className="max-w-full max-h-full object-contain p-4"
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
          />
        </div>

        <div className="p-5 sm:p-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {product.onSale && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider
                  px-2.5 py-0.5 rounded-full mb-2 bg-forest text-gold">
                  🔥 Sale
                </span>
              )}
              <h2 className="font-serif text-2xl text-forest leading-snug">{product.name}</h2>
              <p className="text-xs text-amber font-bold uppercase tracking-widest mt-1">{product.category}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-serif text-3xl text-forest">₹{product.price}</p>
              <p className="text-xs text-ink-3 mt-0.5">{product.weight}</p>
            </div>
          </div>

          <p className="text-sm text-ink-2 leading-relaxed">
            {product.fullDescription || product.description}
          </p>

          {product.ingredients?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-2.5">
                Ingredients
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.ingredients.map((ing) => (
                  <span key={ing}
                    className="text-[12px] bg-earth text-ink-2 px-2.5 py-1 rounded-full border border-forest/8">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-ink-2">
            {product.shelfLife && (
              <span className="flex items-center gap-1.5 bg-earth px-3 py-1.5 rounded-full">
                ⏳ Shelf life: <strong>{product.shelfLife}</strong>
              </span>
            )}
            {product.weight && (
              <span className="flex items-center gap-1.5 bg-earth px-3 py-1.5 rounded-full">
                ⚖️ {product.weight}
              </span>
            )}
          </div>

          {/* Modal WA button — skeleton on first-ever load */}
          {loading ? (
            <div className="skeleton rounded-[12px] h-[52px] w-full" />
          ) : (
            <a href={buildWaUrl(product, contact.whatsappNumber)}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-wa hover:bg-wa-dk
                text-white font-bold text-sm py-3.5 rounded-[12px] transition-all duration-200
                hover:shadow-lg hover:shadow-green-300/40 hover:-translate-y-0.5">
              <WhatsAppIcon size={18} />
              Order {product.name} on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export default function ProductCard({ product }) {
  const { contact, loading } = useContactInfo();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <article
        className="group flex flex-col bg-white rounded-xl2 overflow-hidden border border-forest/8
          shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-forest/20
          transition-all duration-300 ease-out cursor-pointer"
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${product.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowModal(true); }}
      >
        <div className="relative flex items-center justify-center h-[168px] overflow-hidden"
          style={{ background: product.bg }}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="max-w-full max-h-full object-contain p-4
              group-hover:scale-110 transition-transform duration-300"
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
          />

          {product.onSale && (
            <span className="absolute top-3 left-3 text-[10px] font-bold uppercase
              tracking-wider px-2.5 py-[3px] rounded-full
              bg-forest text-gold">
              🔥 Sale
            </span>
          )}

          <div className="absolute inset-0 bg-forest/60 opacity-0 group-hover:opacity-100
            transition-opacity duration-200 flex items-center justify-center
            text-white text-sm font-semibold gap-2">
            <span>🔍</span> View Details
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-2.5">
          <p className="text-[10.5px] font-bold text-amber uppercase tracking-widest">
            {product.category}
          </p>
          <h3 className="font-serif text-[1.1rem] text-forest leading-snug">
            {product.name}
          </h3>
          <p className="text-[13px] text-ink-3 leading-relaxed line-clamp-2 flex-1">
            {product.description}
          </p>

          <div className="flex items-center justify-between pt-2.5 border-t border-forest/6 mt-0.5">
            <span className="text-[11px] font-medium bg-earth text-ink-3 px-2.5 py-1 rounded-full">
              ⚖️ {product.weight}
            </span>
            <span className="font-serif text-xl text-forest">₹{product.price}</span>
          </div>

          {/* Card WA button — skeleton on first-ever load */}
          {loading ? (
            <div
              className="skeleton rounded-[10px] h-10 w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <a href={buildWaUrl(product, contact.whatsappNumber)}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Order ${product.name} on WhatsApp`}
              className="flex items-center justify-center gap-2 bg-wa hover:bg-wa-dk
                text-white font-bold text-[13px] py-2.5 rounded-[10px]
                transition-all duration-200 hover:-translate-y-0.5
                hover:shadow-md hover:shadow-green-300/40">
              <WhatsAppIcon size={15} />
              Order on WhatsApp
            </a>
          )}
        </div>
      </article>

      {showModal && <Modal product={product} onClose={() => setShowModal(false)} />}
    </>
  );
}

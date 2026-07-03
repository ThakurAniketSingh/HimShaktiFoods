// Footer — appears at the bottom of every page.
// Contains a WhatsApp CTA banner, 4-column info grid, and copyright strip.

import { Link } from 'react-router-dom';
import WhatsAppIcon from './WhatsAppIcon';
import { useContactInfo } from '../context/ContactContext';

const LINKS = [
  { to: '/',             label: 'Home'         },
  { to: '/products',     label: 'Products'     },
  { to: '/about',        label: 'About Us'     },
  { to: '/how-to-order', label: 'How to Order' },
  { to: '/contact',      label: 'Contact'      },
];

// Category links pass the filter via URL query param — matches Products.jsx logic
const CATEGORIES = [
  { label: 'Snacks',     key: 'snacks'     },
  { label: 'Juices',     key: 'juices'     },
  { label: 'Pickles',    key: 'pickles'    },
  { label: 'Sweets',     key: 'sweets'     },
  { label: 'Superfoods', key: 'superfoods' },
];

export default function Footer() {
  const { contact, loading } = useContactInfo();
  const telHref = `tel:${contact.phone.replace(/[^\d+]/g, '')}`;
  const mailHref = `mailto:${contact.email}`;
  const WA = `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent("Namaste HimShakti! I'd like to place an order.")}`;

  return (
    <footer className="bg-forest text-white/70">

      {/* Full-width WhatsApp CTA banner above the main grid */}
      <div className="bg-gradient-to-r from-grove to-sage px-6 py-10 text-center">
        <p className="font-serif text-white text-2xl sm:text-3xl mb-2">
          Ready to taste the Himalayas?
        </p>
        <p className="text-white/75 text-sm mb-6 max-w-sm mx-auto">
          No app, no login. Just message us — we handle the rest.
        </p>
        {/* FIX: added noreferrer alongside noopener for proper external link security */}
        {loading ? (
          <div className="animate-pulse bg-white/20 rounded-full h-14 w-72 mx-auto" />
        ) : (
          <a href={WA} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2.5 bg-wa hover:bg-wa-dk text-white
             font-bold px-8 py-4 rounded-full transition-all duration-200
             hover:shadow-xl hover:shadow-green-400/30 hover:-translate-y-0.5">
            <WhatsAppIcon size={20} />
            Start Your Order on WhatsApp
          </a>
        )}
      </div>

      {/* 4-column grid: brand info, quick links, categories, contact */}
      <div className="wrap py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 w-fit">
              <div className="w-9 h-9 rounded-xl bg-amber/90 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
                  <path d="M14 3L4 20h5v5h10v-5h5z" fill="white" fillOpacity=".95"/>
                  <path d="M18 11l-5 9h3v3h4v-3h3z" fill="white" fillOpacity=".35"/>
                </svg>
              </div>
              <div className="leading-none">
                <p className="font-serif text-white text-[1.1rem]">HimShakti</p>
                <p className="text-gold/60 text-[9px] font-medium tracking-[0.2em] uppercase mt-0.5">Foods</p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-white/55 max-w-xs">
              Authentic Himalayan millets, juices & pickles — from rural Uttarakhand
              directly to your door. No middlemen. No preservatives.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {['100% Natural', 'No Preservatives', 'Direct from Farmers'].map((b) => (
                <span key={b} className="text-[10px] font-semibold border border-white/14
                  text-white/55 px-2.5 py-1 rounded-full">{b}</span>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-gold mb-4">Quick Links</h4>
            <ul className="flex flex-col gap-2.5">
              {LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}
                    className="text-sm text-white/55 hover:text-white transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Product categories — link to /products?category=X */}
          <div>
            <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-gold mb-4">Categories</h4>
            <ul className="flex flex-col gap-2.5">
              {CATEGORIES.map(({ label, key }) => (
                <li key={key}>
                  <Link to={`/products?category=${key}`}
                    className="text-sm text-white/55 hover:text-white transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="text-[10.5px] font-bold uppercase tracking-widest text-gold mb-4">Contact</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/55">
              <li className="flex gap-3">
                <span className="text-base shrink-0">📍</span>
                <span className="whitespace-pre-line">{contact.address}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-base shrink-0">📱</span>
                <a href={telHref} className="hover:text-white transition-colors">
                  {contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <span className="text-base shrink-0">✉️</span>
                <a href={mailHref}
                  className="hover:text-white transition-colors break-all">
                  {contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <span className="text-base shrink-0">⏰</span>
                <span>{contact.hours}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="border-t border-white/8 px-4 py-5">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center
          justify-between gap-2 text-[11.5px] text-white/30">
          <p>© {new Date().getFullYear()} HimShakti Foods. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p>Made with ♥ in the Himalayas 🏔️</p>
            <Link to="/admin/login" className="hover:text-white/60 transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

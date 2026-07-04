// Products page — shows the full product catalog with category filter and pagination.
import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import ProductCard from '../components/ProductCard';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { shuffleArray } from '../utils/shuffleArray';
import { ProductCardSkeleton } from '../components/Skeleton';

const ITEMS_PER_PAGE = 6;

// Keeps a stable shuffle ORDER (a list of ids) for the "All Products" view so
// browsing doesn't reshuffle on every render — but always pulls the latest
// product data for those ids, so an admin edit shows up immediately even
// though the display order stays put.
function useStableShuffleOrder(products) {
  const idsKey = useMemo(
    () => products.map((p) => p.id).sort((a, b) => a - b).join(','),
    [products]
  );
  const ref = useRef({ key: null, order: [] });
  if (ref.current.key !== idsKey) {
    const order = shuffleArray(products.map((p) => p.id));
    ref.current = { key: idsKey, order };
  }
  return ref.current.order;
}

// Sort options shown inside the "Filter" pill's dropdown.
const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'newest', label: 'Newly Added' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export default function Products() {
  const { products, categories, loading, error } = useProducts();
  const CATS = useMemo(() => ['all', ...categories], [categories]);

  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get('category') || 'all';
  const [page, setPage] = useState(1);
  const isMobile = useMediaQuery('(max-width: 639px)');
  const MAX_VISIBLE = isMobile ? 4 : 8;
  const gridRef = useRef(null);
  const isInitialMount = useRef(true);

  // ── New filter controls: Sale (toggle), Category (dropdown), Filter/Sort (dropdown) ──
  const [saleOnly, setSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [openMenu, setOpenMenu] = useState(null); // 'category' | 'filter' | null
  const filterBarRef = useRef(null);

  // Close whichever dropdown is open when clicking anywhere outside the filter bar.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const shuffleOrder = useStableShuffleOrder(products);
  const shuffledAll = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return shuffleOrder.map((id) => byId.get(id)).filter(Boolean);
  }, [shuffleOrder, products]);

  const filtered = useMemo(() => {
    let list = currentFilter === 'all' ? shuffledAll : products.filter((p) => p.category === currentFilter);
    if (saleOnly) list = list.filter((p) => p.onSale);
    if (sortBy === 'newest') list = [...list].sort((a, b) => b.id - a.id);
    else if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [currentFilter, shuffledAll, products, saleOnly, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [currentFilter, saleOnly, sortBy]);

  // Scroll handling – no global interference ab
  useEffect(() => {
    if (isInitialMount.current) {
      if (currentFilter === 'all') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const timeout = setTimeout(() => {
        isInitialMount.current = false;
      }, 0);
      return () => clearTimeout(timeout);
    } else {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentFilter, page, saleOnly, sortBy]);

  const handleFilter = (cat) => {
    if (cat === 'all') setSearchParams({});
    else setSearchParams({ category: cat });
    setOpenMenu(null);
  };

  const scrollOffset = isMobile ? 250 : 210;

  const visiblePages = useMemo(() => {
    if (totalPages <= MAX_VISIBLE)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, page - Math.floor(MAX_VISIBLE / 2));
    let end = start + MAX_VISIBLE - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - MAX_VISIBLE + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, page, MAX_VISIBLE]);

  return (
    <section className="min-h-screen bg-mist">
      {/* Banner */}
      <div className="bg-forest py-16 px-4 text-center relative overflow-hidden">
        <svg viewBox="0 0 900 160" preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-[0.055] pointer-events-none" aria-hidden>
          <path d="M0,160 L0,90 L120,40 L260,80 L400,15 L550,65 L700,20 L850,60 L900,40 L900,160Z" fill="white"/>
        </svg>
        <div className="relative z-10">
          <div className="eyebrow justify-center text-amber mb-3 before:bg-amber/40 after:bg-amber/40">
            Our Products
          </div>
          <h1 className="font-serif text-white text-[clamp(2rem,4vw,3rem)] mb-3">Taste the Himalayas</h1>
          <p className="text-white/60 text-sm max-w-sm mx-auto">
            Click any product for full details. Order via WhatsApp — no login, no checkout.
          </p>
        </div>
      </div>

      <div className="wrap py-12">
        <div ref={filterBarRef} className="flex flex-wrap justify-center gap-2 mb-4" role="group" aria-label="Sale, category and sort filters">
          {/* 1. Sale pill — no dropdown, just toggles "show only on-sale products" */}
          <button
            onClick={() => { setSaleOnly((s) => !s); setOpenMenu(null); }}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 border
              ${saleOnly
                ? 'bg-forest text-white border-forest shadow-sm'
                : 'bg-white text-ink-2 border-forest/15 hover:border-forest/40 hover:text-forest'
              }`}
            aria-pressed={saleOnly}>
            🔥 Sale
          </button>

          {/* 2. Category pill — opens a dropdown with every category */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu((m) => (m === 'category' ? null : 'category'))}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold capitalize transition-all duration-200 border flex items-center gap-1.5
                ${currentFilter !== 'all'
                  ? 'bg-forest text-white border-forest shadow-sm'
                  : 'bg-white text-ink-2 border-forest/15 hover:border-forest/40 hover:text-forest'
                }`}
              aria-haspopup="listbox" aria-expanded={openMenu === 'category'}>
              Category{currentFilter !== 'all' ? `: ${currentFilter}` : ''}
              <span className="text-[10px]">▾</span>
            </button>
            {openMenu === 'category' && (
              <div role="listbox" className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl2 border border-forest/12 shadow-lg py-1.5 max-h-64 overflow-y-auto">
                {CATS.map((cat) => (
                  <button key={cat} role="option" aria-selected={currentFilter === cat} onClick={() => handleFilter(cat)}
                    className={`w-full text-left px-4 py-2 text-[13px] capitalize transition-colors
                      ${currentFilter === cat ? 'text-forest font-bold bg-earth' : 'text-ink-2 hover:bg-earth'}`}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Filter pill — opens a dropdown with sort options (newest, price low/high) */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu((m) => (m === 'filter' ? null : 'filter'))}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 border flex items-center gap-1.5
                ${sortBy !== 'default'
                  ? 'bg-forest text-white border-forest shadow-sm'
                  : 'bg-white text-ink-2 border-forest/15 hover:border-forest/40 hover:text-forest'
                }`}
              aria-haspopup="listbox" aria-expanded={openMenu === 'filter'}>
              Filter{sortBy !== 'default' ? `: ${SORT_OPTIONS.find((o) => o.value === sortBy)?.label}` : ''}
              <span className="text-[10px]">▾</span>
            </button>
            {openMenu === 'filter' && (
              <div role="listbox" className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl2 border border-forest/12 shadow-lg py-1.5 max-h-64 overflow-y-auto">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} role="option" aria-selected={sortBy === opt.value}
                    onClick={() => { setSortBy(opt.value); setOpenMenu(null); }}
                    className={`w-full text-left px-4 py-2 text-[13px] transition-colors
                      ${sortBy === opt.value ? 'text-forest font-bold bg-earth' : 'text-ink-2 hover:bg-earth'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-ink-3 mb-6">Page {page} of {totalPages || 1}</p>

        <div ref={gridRef} style={{ scrollMarginTop: `${scrollOffset}px` }}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : paginated.length > 0 ? (
            <>
              {error && (
                <p className="text-center text-xs text-amber bg-amber/10 rounded-lg py-2 px-3 mb-4">
                  ⚠️ Showing previously loaded products — couldn't refresh from the server ({error}).
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {paginated.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          ) : error ? (
            <div className="text-center py-20 text-sm">
              <p className="text-red-600 font-medium mb-1">⚠️ Couldn't load products</p>
              <p className="text-ink-3">{error}</p>
            </div>
          ) : (
            <div className="text-center py-20 text-ink-3 text-sm">No products found in this category.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 flex-nowrap" aria-label="Pagination">
            <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}
              className="w-9 h-9 rounded-full text-[15px] font-bold border border-forest/20 text-ink-2 hover:border-forest hover:text-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center" aria-label="Previous page">
              ‹
            </button>

            {visiblePages[0] > 1 && (
              <>
                <button onClick={() => setPage(1)} className="w-9 h-9 rounded-full text-[13px] font-bold border border-forest/20 text-ink-2 hover:border-forest hover:text-forest">1</button>
                {visiblePages[0] > 2 && <span className="text-ink-3 text-xs select-none px-0.5">…</span>}
              </>
            )}

            {visiblePages.map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-full text-[13px] font-bold transition-all duration-200 ${page === n ? 'bg-forest text-white shadow-sm' : 'border border-forest/20 text-ink-2 hover:border-forest hover:text-forest'}`}
                aria-current={page === n ? 'page' : undefined}>
                {n}
              </button>
            ))}

            {visiblePages[visiblePages.length - 1] < totalPages && (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="text-ink-3 text-xs select-none px-0.5">…</span>}
                <button onClick={() => setPage(totalPages)} className="w-9 h-9 rounded-full text-[13px] font-bold border border-forest/20 text-ink-2 hover:border-forest hover:text-forest">{totalPages}</button>
              </>
            )}

            <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}
              className="w-9 h-9 rounded-full text-[15px] font-bold border border-forest/20 text-ink-2 hover:border-forest hover:text-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center" aria-label="Next page">
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

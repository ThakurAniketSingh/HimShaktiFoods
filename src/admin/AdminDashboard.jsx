// AdminDashboard — the main product management screen. Same pattern as
// AdminReviews: 4 clickable cards up top act as filters/tabs for the list
// below, instead of being plain stats.
//
//   🛒 All Products      — every product, no filter
//   🔥 Products on Sale  — only products with the Sale toggle on
//   🗂️ Categories        — click to open a dropdown of every category;
//                          picking one filters the list to just that
//                          category (the card itself shows that
//                          category's name + count once picked)
//   💰 Average Price     — NOT clickable — just shows the number
//
// Add/edit/delete/import/clear-all all talk to the real backend (MongoDB
// Atlas via /api/*), so changes go live for every visitor immediately.
import { useState, useMemo, useRef, useEffect } from 'react';
import ProductFormModal from './ProductFormModal';
import ConfirmDialog from './ConfirmDialog';
import { useProducts } from '../context/ProductsContext';
import { useToast } from './ToastContext';
import { exportAsJSON, parseProductsJSON } from './productIO';
import { Skeleton, FilterCardSkeleton, ProductRowSkeleton } from '../components/Skeleton';

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'newest', label: 'Newly Added' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

const PAGE_SIZE = 8;

export default function AdminDashboard() {
  const { products, categories, loading, error, addProduct, updateProduct, deleteProduct, clearAllProducts, importProducts } =
    useProducts();
  const { notify } = useToast();

  // activeFilter is 'all' | 'sale' | <a specific category name>
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [openMenu, setOpenMenu] = useState(null); // 'categories' | 'filter' | null
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingProduct, setEditingProduct] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const fileInputRef = useRef(null);
  const filterAreaRef = useRef(null); // wraps cards + toolbar for outside-click

  // Close whichever dropdown (Categories card / Filter pill) is open when
  // clicking anywhere outside the cards-and-toolbar area.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (filterAreaRef.current && !filterAreaRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // If the active filter is a category that disappears (e.g. its last
  // product was deleted), fall back to "All" instead of silently
  // showing nothing.
  useEffect(() => {
    if (activeFilter !== 'all' && activeFilter !== 'sale' && !categories.includes(activeFilter)) {
      setActiveFilter('all');
    }
  }, [categories, activeFilter]);

  const isCategoryActive = activeFilter !== 'all' && activeFilter !== 'sale';

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchesFilter =
        activeFilter === 'all' ? true : activeFilter === 'sale' ? p.onSale : p.category === activeFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
    if (sortBy === 'newest') list = [...list].sort((a, b) => b.id - a.id);
    else if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, search, activeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const stats = useMemo(() => {
    const prices = products.map((p) => Number(p.price) || 0);
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const onSaleCount = products.filter((p) => p.onSale).length;
    const categoryCount = isCategoryActive ? products.filter((p) => p.category === activeFilter).length : categories.length;
    return { total: products.length, onSaleCount, avg, categoryCount };
  }, [products, categories, isCategoryActive, activeFilter]);

  const CARDS = [
    { key: 'all', label: 'All Products', icon: '🛒', count: stats.total },
    { key: 'sale', label: 'Products on Sale', icon: '🔥', count: stats.onSaleCount },
  ];

  const openAdd = () => {
    setFormMode('add');
    setEditingProduct(null);
    setFormOpen(true);
  };
  const openEdit = (p) => {
    setFormMode('edit');
    setEditingProduct(p);
    setFormOpen(true);
  };

  const handleSave = async (data) => {
    if (busy) return;
    setBusy(true);
    try {
      if (formMode === 'edit' && editingProduct) {
        await updateProduct(editingProduct.id, data);
        notify(`"${data.name}" updated.`);
      } else {
        await addProduct(data);
        notify(`"${data.name}" added to the catalog.`);
      }
      setFormOpen(false);
    } catch (err) {
      notify(err.message || 'Could not save that product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      await deleteProduct(deleteTarget.id);
      notify(`"${deleteTarget.name}" removed.`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      notify(err.message || 'Could not delete that product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAllConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearAllProducts();
      setSearch('');
      setActiveFilter('all');
      setSortBy('default');
      setPage(1);
      notify('All products deleted. Catalog is now empty.', 'info');
    } catch (err) {
      notify(err.message || 'Could not clear the catalog.', 'error');
    } finally {
      setBusy(false);
      setResetConfirmOpen(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseProductsJSON(text);
      await importProducts(parsed);
      notify(`Imported ${parsed.length} product${parsed.length === 1 ? '' : 's'}.`);
    } catch (err) {
      notify(err.message || 'Could not read that file.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const activeCardLabel = isCategoryActive
    ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)
    : CARDS.find((c) => c.key === activeFilter)?.label ?? 'All Products';
  const activeCardIcon = isCategoryActive ? '🗂️' : CARDS.find((c) => c.key === activeFilter)?.icon ?? '🛒';

  return (
    <>
      <div className="wrap py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
          <div>
            <div className="eyebrow mb-2">Admin Panel</div>
            <h1 className="font-serif text-forest text-[1.8rem] sm:text-[2.1rem]">Manage Products</h1>
            <p className="text-ink-3 text-sm mt-1">
              Tap a card below to see All Products, Products on Sale, or a specific Category.
            </p>
          </div>
          <button
            onClick={openAdd}
            disabled={busy}
            className="flex items-center gap-2 bg-amber hover:bg-amber-lt text-white font-bold px-6 py-3 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            ➕ Add Product
          </button>
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

        {loading && (
          <div aria-hidden="true">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <FilterCardSkeleton key={i} />
              ))}
            </div>
            <Skeleton className="h-[42px] w-full rounded-full mb-5" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <ProductRowSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <>
            <div ref={filterAreaRef}>
              {/* ── Clickable filter cards ──────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {CARDS.map((card) => {
                  const isActive = activeFilter === card.key;
                  return (
                    <button
                      key={card.key}
                      onClick={() => {
                        setActiveFilter(card.key);
                        setOpenMenu(null);
                        setPage(1);
                      }}
                      aria-pressed={isActive}
                      className={`relative text-left rounded-xl2 p-4 sm:p-5 border-2 transition-all duration-200
                        ${isActive
                          ? 'bg-forest border-forest shadow-md'
                          : 'bg-white border-forest/8 hover:border-forest/25 hover:-translate-y-0.5 hover:shadow-sm'
                        }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2.5
                          ${isActive ? 'bg-white/15' : 'bg-amber/10 text-amber'}`}
                      >
                        {card.icon}
                      </div>
                      <p className={`font-serif text-2xl sm:text-3xl ${isActive ? 'text-white' : 'text-forest'}`}>{card.count}</p>
                      <p className={`text-[11px] font-semibold mt-1 tracking-wide uppercase ${isActive ? 'text-white/80' : 'text-ink-3'}`}>
                        {card.label}
                      </p>
                    </button>
                  );
                })}

                {/* Categories — clicking opens a dropdown instead of directly filtering */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu((m) => (m === 'categories' ? null : 'categories'))}
                    aria-pressed={isCategoryActive}
                    aria-haspopup="listbox"
                    aria-expanded={openMenu === 'categories'}
                    className={`relative w-full text-left rounded-xl2 p-4 sm:p-5 border-2 transition-all duration-200
                      ${isCategoryActive
                        ? 'bg-forest border-forest shadow-md'
                        : 'bg-white border-forest/8 hover:border-forest/25 hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2.5
                        ${isCategoryActive ? 'bg-white/15' : 'bg-amber/10 text-amber'}`}
                    >
                      🗂️
                    </div>
                    <p className={`font-serif text-2xl sm:text-3xl ${isCategoryActive ? 'text-white' : 'text-forest'}`}>
                      {stats.categoryCount}
                    </p>
                    <p className={`text-[11px] font-semibold mt-1 tracking-wide uppercase flex items-center gap-1
                      ${isCategoryActive ? 'text-white/80' : 'text-ink-3'}`}
                    >
                      {isCategoryActive ? activeFilter : 'Categories'}
                      <span className="text-[9px]">▾</span>
                    </p>
                  </button>
                  {openMenu === 'categories' && (
                    <div role="listbox" className="absolute z-20 top-full left-0 mt-2 w-52 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl2 border border-forest/12 shadow-lg py-1.5 max-h-64 overflow-y-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          role="option"
                          aria-selected={activeFilter === cat}
                          onClick={() => {
                            setActiveFilter(cat);
                            setOpenMenu(null);
                            setPage(1);
                          }}
                          className={`w-full text-left px-4 py-2 text-[13px] capitalize transition-colors
                            ${activeFilter === cat ? 'text-forest font-bold bg-earth' : 'text-ink-2 hover:bg-earth'}`}
                        >
                          {cat} ({products.filter((p) => p.category === cat).length})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Average Price — display only, not clickable */}
                <div className="text-left rounded-xl2 p-4 sm:p-5 border-2 border-forest/8 bg-white cursor-default">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2.5 bg-amber/10 text-amber">
                    💰
                  </div>
                  <p className="font-serif text-2xl sm:text-3xl text-forest">₹{stats.avg}</p>
                  <p className="text-[11px] font-semibold mt-1 tracking-wide uppercase text-ink-3">Average Price</p>
                </div>
              </div>

              {/* Toolbar — Search, Filter (sort), then Export/Import/Clear All */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 text-sm">🔍</span>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search products by name or category…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full border border-forest/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber/20 focus:border-amber transition-shadow"
                  />
                </div>

                {/* Filter pill — sort options */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu((m) => (m === 'filter' ? null : 'filter'))}
                    className={`px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 border flex items-center gap-1.5
                      ${sortBy !== 'default'
                        ? 'bg-forest text-white border-forest shadow-sm'
                        : 'bg-white text-ink-2 border-forest/15 hover:border-forest/40 hover:text-forest'
                      }`}
                    aria-haspopup="listbox" aria-expanded={openMenu === 'filter'}
                  >
                    Filter{sortBy !== 'default' ? `: ${SORT_OPTIONS.find((o) => o.value === sortBy)?.label}` : ''}
                    <span className="text-[10px]">▾</span>
                  </button>
                  {openMenu === 'filter' && (
                    <div role="listbox" className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl2 border border-forest/12 shadow-lg py-1.5 max-h-64 overflow-y-auto">
                      {SORT_OPTIONS.map((opt) => (
                        <button key={opt.value} role="option" aria-selected={sortBy === opt.value}
                          onClick={() => { setSortBy(opt.value); setOpenMenu(null); setPage(1); }}
                          className={`w-full text-left px-4 py-2 text-[13px] transition-colors
                            ${sortBy === opt.value ? 'text-forest font-bold bg-earth' : 'text-ink-2 hover:bg-earth'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportAsJSON(filtered)}
                    className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-white text-ink-2 border border-forest/15 hover:border-forest/40 hover:text-forest transition-all"
                  >
                    📤 Export (JSON)
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-white text-ink-2 border border-forest/15 hover:border-forest/40 hover:text-forest transition-all"
                  >
                    📥 Import
                  </button>
                  <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                  <button
                    onClick={() => setResetConfirmOpen(true)}
                    className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-white text-ink-2 border border-forest/15 hover:border-red-300 hover:text-red-600 transition-all"
                  >
                    🗑️ Clear All
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[12px] text-ink-3 mb-3 font-semibold uppercase tracking-wide">
              Showing: {activeCardIcon} {activeCardLabel} ({filtered.length})
            </p>

            {/* Product list */}
            {paginated.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl2 border border-forest/8">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-forest font-serif text-lg mb-1">No products found</p>
                <p className="text-ink-3 text-sm">Try a different search term, or pick another card above.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-7">
                {paginated.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 bg-white rounded-xl2 border border-forest/8 hover:border-forest/20 hover:shadow-sm transition-all duration-200 p-3 sm:p-3.5 flex-wrap sm:flex-nowrap"
                  >
                    <div
                      className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: p.bg }}
                    >
                      <img
                        src={p.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="max-w-full max-h-full object-contain p-1.5"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-[140px]">
                      <p className="font-serif text-forest text-[15px] leading-snug truncate">{p.name}</p>
                      <p className="text-[11px] text-amber font-bold uppercase tracking-wider mt-0.5">{p.category}</p>
                    </div>

                    {p.onSale && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 bg-forest text-gold">
                        🔥 Sale
                      </span>
                    )}

                    <span className="text-[12px] text-ink-3 bg-earth px-2.5 py-1 rounded-full shrink-0">{p.weight}</span>

                    <span className="font-serif text-forest text-base w-20 text-right shrink-0">₹{p.price}</span>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <button
                        onClick={() => openEdit(p)}
                        disabled={busy}
                        aria-label={`Edit ${p.name}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-earth hover:text-forest transition-colors text-base disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        disabled={busy}
                        aria-label={`Delete ${p.name}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-red-50 hover:text-red-600 transition-colors text-base disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mb-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="w-9 h-9 rounded-full text-[15px] font-bold border border-forest/20 text-ink-2 hover:border-forest hover:text-forest disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <span className="text-xs text-ink-3 px-3">
                  Page {pageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="w-9 h-9 rounded-full text-[15px] font-bold border border-forest/20 text-ink-2 hover:border-forest hover:text-forest disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ProductFormModal
        open={formOpen}
        mode={formMode}
        initial={editingProduct}
        categories={categories}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this product?"
        message={`"${deleteTarget?.name}" will be removed from the catalog. This can't be undone unless you re-add it.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Delete every product?"
        message="This permanently deletes ALL products from the database — the catalog will be completely empty. It will NOT bring back the original sample products. Use the Import button afterwards to upload your own product list from a JSON file."
        confirmLabel="Clear All"
        tone="danger"
        onConfirm={handleClearAllConfirm}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </>
  );
}

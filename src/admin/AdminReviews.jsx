// AdminReviews — manage the customer reviews shown in the Home page's
// "What People Say" section, AND moderate reviews visitors submit from
// the public Contact page.
//
// The 4 cards at the top are clickable filters/tabs, not just stats:
//   📋 All Reviews     — pending + active (everything except rejected)
//   🕓 Pending Reviews — visitor-submitted, awaiting your decision.
//                        Gets a small red dot whenever one is waiting.
//   ✅ Active Reviews  — approved, currently live on the Home page
//   ❌ Rejected        — turned down. Kept (not deleted) so you can
//                        review or restore them if needed.
// Whichever card is selected controls which reviews the list below shows.
import { useState, useMemo, useRef, useEffect } from 'react';
import ReviewFormModal from './ReviewFormModal';
import ConfirmDialog from './ConfirmDialog';
import { Skeleton, FilterCardSkeleton, ReviewRowSkeleton } from '../components/Skeleton';
import { useTestimonials } from '../context/TestimonialsContext';
import { useToast } from './ToastContext';
import { exportTestimonialsAsJSON, parseTestimonialsJSON } from './productIO';

const PAGE_SIZE = 8;

// Sort options for the "Filter" pill's dropdown — same design as the
// Products admin page, just with Rating instead of Price.
const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'newest', label: 'Newly Added' },
  { value: 'rating-asc', label: 'Rating: Low to High' },
  { value: 'rating-desc', label: 'Rating: High to Low' },
];

const THEME = {
  ink: { activeBg: 'bg-forest dark:bg-sage border-edge', iconBg: 'bg-ink-2/10 text-ink-2' },
  amber: { activeBg: 'bg-forest dark:bg-sage border-edge', iconBg: 'bg-amber/10 text-amber' },
  forest: { activeBg: 'bg-forest dark:bg-sage border-edge', iconBg: 'bg-heading/10 text-heading' },
  red: { activeBg: 'bg-forest dark:bg-sage border-edge', iconBg: 'bg-red-50 text-red-500 dark:bg-red-500/20 dark:text-red-400' },
};

function StarRow({ rating }) {
  return (
    <span className="text-amber text-xs">
      {'★'.repeat(rating)}
      {'☆'.repeat(Math.max(0, 5 - rating))}
    </span>
  );
}

export default function AdminReviews() {
  const {
    testimonials,
    loading,
    error,
    addTestimonial,
    updateTestimonial,
    deleteTestimonial,
    clearAllTestimonials,
    importTestimonials,
  } = useTestimonials();
  const { notify } = useToast();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'rejected'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [openMenu, setOpenMenu] = useState(null); // 'filter' | null
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const filterBarRef = useRef(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingReview, setEditingReview] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Close the Filter dropdown when clicking anywhere outside it.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const counts = useMemo(() => {
    let pending = 0, active = 0, rejected = 0;
    for (const t of testimonials) {
      if (t.status === 'pending') pending++;
      else if (t.status === 'rejected') rejected++;
      else active++; // 'approved', or legacy rows with no status set
    }
    return { all: testimonials.length, pending, active, rejected };
  }, [testimonials]);

  const FILTER_CARDS = [
    { key: 'all', label: 'All Reviews', icon: '📋', count: counts.all, theme: 'ink' },
    { key: 'active', label: 'Active Reviews', icon: '✅', count: counts.active, theme: 'forest' },
    { key: 'pending', label: 'Pending Reviews', icon: '🕓', count: counts.pending, theme: 'amber', dot: counts.pending > 0 },
    { key: 'rejected', label: 'Rejected Reviews', icon: '❌', count: counts.rejected, theme: 'red' },
  ];

  const statusFiltered = useMemo(() => {
    switch (activeFilter) {
      case 'pending':
        return testimonials.filter((t) => t.status === 'pending');
      case 'active':
        return testimonials.filter((t) => t.status !== 'pending' && t.status !== 'rejected');
      case 'rejected':
        return testimonials.filter((t) => t.status === 'rejected');
      default:
        // 'all': Randomize by default so it's a mix of all reviews
        return [...testimonials].sort(() => Math.random() - 0.5);
    }
  }, [testimonials, activeFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = statusFiltered.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q)
    );
    if (sortBy === 'newest') list = [...list].sort((a, b) => b.id - a.id);
    else if (sortBy === 'rating-asc') list = [...list].sort((a, b) => a.rating - b.rating);
    else if (sortBy === 'rating-desc') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [statusFiltered, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const openAdd = () => {
    setFormMode('add');
    setEditingReview(null);
    setFormOpen(true);
  };
  const openEdit = (t) => {
    setFormMode('edit');
    setEditingReview(t);
    setFormOpen(true);
  };

  const handleSave = async (data) => {
    if (busy) return;
    setBusy(true);
    try {
      if (formMode === 'edit' && editingReview) {
        await updateTestimonial(editingReview.id, data);
        notify(`${data.name}'s review updated.`);
      } else {
        await addTestimonial(data);
        notify(`${data.name}'s review added.`);
      }
      setFormOpen(false);
    } catch (err) {
      notify(err.message || 'Could not save that review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (t) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateTestimonial(t.id, { status: 'approved' });
      notify(`${t.name}'s review approved — it's now live on the Home page.`);
    } catch (err) {
      notify(err.message || 'Could not approve that review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (t) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateTestimonial(t.id, { status: 'pending' });
      notify(`${t.name}'s review restored to Pending.`);
    } catch (err) {
      notify(err.message || 'Could not restore that review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget || busy) return;
    setBusy(true);
    try {
      await updateTestimonial(rejectTarget.id, { status: 'rejected' });
      notify(`${rejectTarget.name}'s review rejected.`, 'info');
      setRejectTarget(null);
    } catch (err) {
      notify(err.message || 'Could not reject that review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      await deleteTestimonial(deleteTarget.id);
      notify(`${deleteTarget.name}'s review permanently deleted.`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      notify(err.message || 'Could not delete that review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAllConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearAllTestimonials();
      setSearch('');
      setPage(1);
      notify('All reviews deleted. Reviews list is now empty.', 'info');
    } catch (err) {
      notify(err.message || 'Could not clear reviews.', 'error');
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
      const parsed = parseTestimonialsJSON(text);
      await importTestimonials(parsed);
      notify(`Imported ${parsed.length} review${parsed.length === 1 ? '' : 's'}.`);
    } catch (err) {
      notify(err.message || 'Could not read that file.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const activeCard = FILTER_CARDS.find((c) => c.key === activeFilter);

  return (
    <>
      <div className="wrap py-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
          <div>
            <div className="eyebrow mb-2">Admin Panel</div>
            <h1 className="font-serif text-heading text-[1.8rem] sm:text-[2.1rem]">Manage Reviews</h1>
            <p className="text-ink-3 text-sm mt-1">
              Tap a card below to see Pending, Active, or Rejected reviews. Approved reviews show up in "What People
              Say" on the Home page.
            </p>
          </div>
          <button
            onClick={openAdd}
            disabled={busy}
            className="flex items-center gap-2 bg-amber hover:bg-amber-lt text-white font-bold px-6 py-3 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            ➕ Add Review
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
                <ReviewRowSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Clickable filter cards ──────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {FILTER_CARDS.map((card) => {
                const isActive = activeFilter === card.key;
                const theme = THEME[card.theme];
                return (
                  <button
                    key={card.key}
                    onClick={() => {
                      setActiveFilter(card.key);
                      setPage(1);
                    }}
                    aria-pressed={isActive}
                    className={`relative text-left rounded-xl2 p-4 sm:p-5 border-2 transition-all duration-200
                      ${isActive
                        ? `${theme.activeBg} shadow-md`
                        : 'bg-surface border-edge/8 hover:border-edge/25 hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                  >
                    {card.dot && (
                      <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                    )}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2.5
                        ${isActive ? 'bg-white/15' : theme.iconBg}`}
                    >
                      {card.icon}
                    </div>
                    <p className={`font-serif text-2xl sm:text-3xl ${isActive ? 'text-white' : 'text-heading'}`}>{card.count}</p>
                    <p className={`text-[11px] font-semibold mt-1 tracking-wide uppercase ${isActive ? 'text-white/80' : 'text-ink-3'}`}>
                      {card.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Toolbar — Search, Filter (sort), then Export/Import/Clear All */}
            <div ref={filterBarRef} className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 text-sm">🔍</span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reviews by name, location or text…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-edge/15 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-amber/20 focus:border-amber transition-shadow"
                />
              </div>

              {/* Filter pill — same design as the Products admin page */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenu((m) => (m === 'filter' ? null : 'filter'))}
                  className={`px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 border flex items-center gap-1.5
                    ${sortBy !== 'default'
                      ? 'bg-forest dark:bg-sage text-white border-edge shadow-sm'
                      : 'bg-surface text-ink-2 border-edge/15 hover:border-edge/40 hover:text-heading'
                    }`}
                  aria-haspopup="listbox" aria-expanded={openMenu === 'filter'}
                >
                  Filter{sortBy !== 'default' ? `: ${SORT_OPTIONS.find((o) => o.value === sortBy)?.label}` : ''}
                  <span className="text-[10px]">▾</span>
                </button>
                {openMenu === 'filter' && (
                  <div role="listbox" className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-surface rounded-xl2 border border-edge/12 shadow-lg py-1.5 max-h-64 overflow-y-auto">
                    {SORT_OPTIONS.map((opt) => (
                      <button key={opt.value} role="option" aria-selected={sortBy === opt.value}
                        onClick={() => { setSortBy(opt.value); setOpenMenu(null); setPage(1); }}
                        className={`w-full text-left px-4 py-2 text-[13px] transition-colors
                          ${sortBy === opt.value ? 'text-heading font-bold bg-earth' : 'text-ink-2 hover:bg-earth'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportTestimonialsAsJSON(filtered)}
                  className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-surface text-ink-2 border border-edge/15 hover:border-edge/40 hover:text-heading transition-all"
                >
                  📤 Export (JSON)
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-surface text-ink-2 border border-edge/15 hover:border-edge/40 hover:text-heading transition-all"
                >
                  📥 Import
                </button>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-surface text-ink-2 border border-edge/15 hover:border-red-300 hover:text-red-600 transition-all"
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>

            <p className="text-[12px] text-ink-3 mb-3 font-semibold uppercase tracking-wide">
              Showing: {activeCard?.icon} {activeCard?.label} ({filtered.length})
            </p>

            {/* Review list */}
            {paginated.length === 0 ? (
              <div className="text-center py-20 bg-surface rounded-xl2 border border-edge/8">
                <p className="text-3xl mb-3">{activeFilter === 'pending' ? '🕓' : activeFilter === 'rejected' ? '❌' : '⭐'}</p>
                <p className="text-heading font-serif text-lg mb-1">
                  {activeFilter === 'pending' ? 'No pending reviews' : activeFilter === 'rejected' ? 'No rejected reviews' : 'No reviews yet'}
                </p>
                <p className="text-ink-3 text-sm">
                  {activeFilter === 'pending' ? "You're all caught up." : 'Add your first customer review, or try a different search.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-7">
                {paginated.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-start gap-4 rounded-xl2 border p-3.5 sm:p-4 flex-wrap sm:flex-nowrap transition-all duration-200
                      ${t.status === 'pending'
                        ? 'bg-amber/5 border-amber/30'
                        : t.status === 'rejected'
                          ? 'bg-red-50/60 border-red-200'
                          : 'bg-surface border-edge/8 hover:border-edge/20 hover:shadow-sm'
                      }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-earth flex items-center justify-center text-xl shrink-0">
                      {t.avatar}
                    </div>

                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-serif text-heading text-[15px] leading-snug">{t.name}</p>
                        <StarRow rating={t.rating} />
                        {t.status === 'pending' && (
                          <span className="text-[10px] font-bold uppercase text-amber bg-amber/10 px-2 py-0.5 rounded-full">Pending</span>
                        )}
                        {t.status === 'rejected' && (
                          <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400 px-2 py-0.5 rounded-full">Rejected</span>
                        )}
                        {t.status !== 'pending' && t.status !== 'rejected' && (
                          <span className="text-[10px] font-bold uppercase text-green-700 bg-green-100 dark:bg-green-500/20 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-3 mt-0.5">{t.location}</p>
                      {t.phone && (
                        <p className="text-[11px] text-heading font-semibold mt-1">📞 {t.phone}</p>
                      )}
                      <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">{t.text}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {t.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(t)}
                            disabled={busy}
                            className="px-3.5 py-2 rounded-lg bg-forest text-white text-xs font-bold hover:bg-grove dark:bg-sage dark:hover:bg-sage/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(t)}
                            disabled={busy}
                            className="px-3.5 py-2 rounded-lg bg-surface border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {t.status === 'rejected' && (
                        <>
                          <button
                            onClick={() => handleRestore(t)}
                            disabled={busy}
                            className="px-3.5 py-2 rounded-lg bg-surface border border-edge/20 text-heading text-xs font-bold hover:bg-earth transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ↩️ Restore
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            disabled={busy}
                            aria-label={`Permanently delete ${t.name}'s review`}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-red-50 hover:text-red-600 transition-colors text-base disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {t.status !== 'pending' && t.status !== 'rejected' && (
                        <>
                          <button
                            onClick={() => openEdit(t)}
                            disabled={busy}
                            aria-label={`Edit ${t.name}'s review`}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-earth hover:text-heading transition-colors text-base disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            disabled={busy}
                            aria-label={`Delete ${t.name}'s review`}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-red-50 hover:text-red-600 transition-colors text-base disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            🗑️
                          </button>
                        </>
                      )}
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
                  className="w-9 h-9 rounded-full text-[15px] font-bold border border-edge/20 text-ink-2 hover:border-edge hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <span className="text-xs text-ink-3 px-3">
                  Page {pageSafe} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="w-9 h-9 rounded-full text-[15px] font-bold border border-edge/20 text-ink-2 hover:border-edge hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ReviewFormModal
        open={formOpen}
        mode={formMode}
        initial={editingReview}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
        isBusy={busy}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Permanently delete this review?"
        message={`${deleteTarget?.name}'s review will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this review?"
        message={`${rejectTarget?.name}'s review will be moved to Rejected and will never appear on the site. You can restore it later from the Rejected tab if needed.`}
        confirmLabel="Reject"
        tone="danger"
        onConfirm={confirmReject}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Delete every review?"
        message="This permanently deletes ALL reviews from the database — pending, active and rejected. It will NOT bring back the original sample reviews. Use the Import button afterwards to upload your own reviews from a JSON file."
        confirmLabel="Clear All"
        tone="danger"
        onConfirm={handleClearAllConfirm}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </>
  );
}

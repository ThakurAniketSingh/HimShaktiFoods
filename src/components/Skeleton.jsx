// Skeleton — shimmering placeholders shown while real data is still being
// fetched from the API, so a slow connection sees a sense of structure
// (card outlines, text lines) instead of a blank page or a spinner.
// Each composite skeleton below mirrors the real component's layout
// closely, so there's no "jump" in size once the real content arrives.

// Base shimmer block. Always pass an explicit rounded-* class — this
// component intentionally has no default rounding, since Tailwind utility
// classes with equal specificity can conflict unpredictably otherwise.
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* Matches ProductCard's layout: image block, category/name/description
   lines, a weight-chip + price row, then a button-shaped block. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-xl2 overflow-hidden border border-forest/8">
      <Skeleton className="h-[168px] w-full rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-2.5 w-20 rounded" />
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-5/6 rounded" />
        <div className="flex items-center justify-between pt-2.5 mt-0.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded" />
        </div>
        <Skeleton className="h-9 w-full rounded-[10px] mt-1" />
      </div>
    </div>
  );
}

/* Matches TestiCard's layout: a few text lines, then an avatar + name row. */
export function TestiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl2 p-6 flex flex-col border border-forest/8">
      <Skeleton className="h-4 w-24 rounded mb-3" />
      <Skeleton className="h-3.5 w-full rounded mb-2" />
      <Skeleton className="h-3.5 w-5/6 rounded mb-2" />
      <Skeleton className="h-3.5 w-4/6 rounded mb-5" />
      <div className="flex items-center gap-3 pt-4 border-t border-forest/6">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-2.5 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

/* Matches an admin product-list row: thumbnail, name/category, chips,
   price, and the edit/delete button pair. */
export function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white rounded-xl2 border border-forest/8 p-3 sm:p-3.5">
      <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
      <div className="flex-1 min-w-[140px] flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-1/3 rounded" />
        <Skeleton className="h-2.5 w-1/5 rounded" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full shrink-0 hidden sm:block" />
      <Skeleton className="h-5 w-12 rounded shrink-0" />
      <div className="flex gap-1.5 shrink-0">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
    </div>
  );
}

/* Matches an admin review-list row: avatar, name/location/text lines, and
   the action-button pair. */
export function ReviewRowSkeleton() {
  return (
    <div className="flex items-start gap-4 bg-white rounded-xl2 border border-forest/8 p-3.5 sm:p-4">
      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 min-w-[180px] flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-1/4 rounded" />
        <Skeleton className="h-2.5 w-1/5 rounded" />
        <Skeleton className="h-3 w-full rounded mt-1" />
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
    </div>
  );
}

/* Matches the admin "clickable filter card" shape (Products/Reviews tabs):
   icon badge, a big number, and a label line. */
export function FilterCardSkeleton() {
  return (
    <div className="rounded-xl2 p-4 sm:p-5 border-2 border-forest/8 bg-white">
      <Skeleton className="w-9 h-9 rounded-lg mb-2.5" />
      <Skeleton className="h-7 w-10 rounded mb-2" />
      <Skeleton className="h-2.5 w-20 rounded" />
    </div>
  );
}

/* Matches one labelled form field: a small label line + an input-shaped
   block. Used for the admin Contact Page form while it loads. */
export function FormFieldSkeleton({ tall = false }) {
  return (
    <div>
      <Skeleton className="h-2.5 w-24 rounded mb-2" />
      <Skeleton className={`w-full rounded-xl ${tall ? 'h-16' : 'h-10'}`} />
    </div>
  );
}

/* Matches one contact-detail card (icon + label + a line of text). */
export function ContactDetailSkeleton() {
  return (
    <div className="flex gap-4 bg-white rounded-xl2 p-5 border border-forest/8">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <Skeleton className="h-2.5 w-20 rounded" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
      </div>
    </div>
  );
}

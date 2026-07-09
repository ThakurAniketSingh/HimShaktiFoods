// ProductFormModal — the Add/Edit form for a single product. Every field
// here maps to something shown on the storefront (see the right-hand "Live
// Preview", which renders the actual <ProductCard/> component so what you
// see here is exactly what shoppers will see).
import { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import ProductCard from '../components/ProductCard';

const CATEGORY_DEFAULTS = ['snacks', 'juices', 'pickles', 'sweets', 'superfoods'];

const GRADIENT_PRESETS = [
  ['#F5E6D3', '#E8D5B7'],
  ['#EAF0CE', '#D5E0A6'],
  ['#FDE4C3', '#F5D0A1'],
  ['#E1F0E1', '#C4E3C4'],
  ['#FCE1E1', '#F5C4C4'],
  ['#EBF3DF', '#D5E8BF'],
  ['#F3E1E8', '#E3C4D3'],
  ['#FFF3CC', '#FFE399'],
  ['#E4F0D0', '#CDE0AA'],
  ['#DCE6DF', '#BCCFC0'],
];

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  fullDescription: '',
  ingredients: [],
  weight: '',
  price: '',
  onSale: false,
  outOfStock: false,
  shelfLife: '',
  image: '',
  bg: `linear-gradient(145deg, ${GRADIENT_PRESETS[0][0]}, ${GRADIENT_PRESETS[0][1]})`,
};

function gradientToColors(bg) {
  const match = /linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/.exec(bg || '');
  if (!match) return ['#F5E6D3', '#E8D5B7'];
  return [match[1].trim(), match[2].trim()];
}

function inputClass(error) {
  return `w-full px-4 py-2.5 rounded-xl border text-sm text-ink bg-mist
    focus:outline-none focus:ring-2 focus:ring-amber/20 transition-shadow
    ${error ? 'border-red-400' : 'border-edge/15 focus:border-amber'}`;
}

function Field({ label, hint, error, required, children }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-amber">*</span>}
      </p>
      {children}
      {hint && !error && <p className="text-[11px] text-ink-3 mt-1.5">{hint}</p>}
      {error && <p className="text-red-600 text-xs mt-1.5 font-medium">⚠️ {error}</p>}
    </div>
  );
}

function IngredientInput({ value, onChange }) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-edge/15 bg-mist focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20 transition-shadow">
      {value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[12px] bg-earth text-ink-2 px-2.5 py-1 rounded-full border border-edge/8"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
            className="text-ink-3 hover:text-red-600 transition-colors leading-none"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={value.length ? '' : 'Type ingredient, press Enter…'}
        className="flex-1 min-w-[120px] bg-transparent text-sm py-1 px-1 focus:outline-none"
      />
    </div>
  );
}

export default function ProductFormModal({ open, mode, initial, categories, onSave, onClose, isBusy }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [categoryChoice, setCategoryChoice] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [imageTab, setImageTab] = useState('url');
  const [uploadWarning, setUploadWarning] = useState('');
  const [imageCompressing, setImageCompressing] = useState(false);
  const containerRef = useRef(null);

  const allCategories = useMemo(() => {
    const set = new Set([...CATEGORY_DEFAULTS, ...(categories || [])]);
    return Array.from(set).sort();
  }, [categories]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name ?? '',
        category: initial.category ?? '',
        description: initial.description ?? '',
        fullDescription: initial.fullDescription ?? '',
        ingredients: initial.ingredients ?? [],
        weight: initial.weight ?? '',
        price: initial.price ?? '',
        onSale: initial.onSale ?? false,
        outOfStock: initial.outOfStock ?? false,
        shelfLife: initial.shelfLife ?? '',
        image: initial.image ?? '',
        bg: initial.bg ?? EMPTY_FORM.bg,
      });
      setCategoryChoice(initial.category ?? '');
    } else {
      setForm(EMPTY_FORM);
      setCategoryChoice('');
    }
    setCustomCategory('');
    setErrors({});
    setUploadWarning('');
    setImageTab('url');
    setImageCompressing(false);
    containerRef.current?.focus();
  }, [open, initial]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleCategorySelect = (e) => {
    const v = e.target.value;
    setCategoryChoice(v);
    setField('category', v === '__new__' ? '' : v);
  };

  // Uploaded photos are resized + re-encoded to a small WebP BEFORE being
  // stored as a data: URI. Product photos never display larger than a
  // few hundred px anywhere on this site (card / modal), so downscaling
  // to at most 900px wide (still crisp on retina screens) and compressing
  // to ~80% WebP quality typically shrinks a multi-MB phone photo down to
  // roughly 30–80 KB. This matters because the image is stored directly
  // inside the product's own database record — an uncompressed upload
  // would make every visitor's /api/products response (and therefore
  // every page load, everywhere the catalog is shown) that much bigger.
  const compressImageFile = (file, { maxWidth = 900, quality = 0.8 } = {}) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('Could not process that image.')); return; }
              const out = new FileReader();
              out.onload = () => resolve({ dataUrl: out.result, size: blob.size });
              out.onerror = () => reject(new Error('Could not process that image.'));
              out.readAsDataURL(blob);
            },
            'image/webp',
            quality
          );
        };
        img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.readAsDataURL(file);
    });

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadWarning('');
    setImageCompressing(true);
    try {
      const { dataUrl, size } = await compressImageFile(file);
      setField('image', dataUrl);
      // After compression this is rare, but an unusually tall/detailed
      // photo can still land a bit large — worth flagging.
      setUploadWarning(
        size > 200 * 1024
          ? `Compressed to ${(size / 1024).toFixed(0)} KB — still a bit large. A simpler photo will load faster for shoppers.`
          : ''
      );
    } catch (err) {
      setUploadWarning(err.message || 'Could not process that image — try a different file.');
    } finally {
      setImageCompressing(false);
    }
  };

  const validate = () => {
    const next = {};
    const finalCategory = categoryChoice === '__new__' ? customCategory.trim() : form.category;
    if (!form.name.trim()) next.name = 'Product name is required.';
    if (!finalCategory) next.category = 'Pick or add a category.';
    if (!form.description.trim()) next.description = 'Add a short description for the product card.';
    if (!form.weight.trim()) next.weight = 'Add a weight or volume, e.g. 200g.';
    if (form.price === '' || Number(form.price) <= 0) next.price = 'Enter a price greater than 0.';
    setErrors(next);
    return { valid: Object.keys(next).length === 0, finalCategory };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { valid, finalCategory } = validate();
    if (!valid) return;
    onSave({
      ...form,
      category: finalCategory.toLowerCase(),
      price: Number(form.price),
      onSale: Boolean(form.onSale),
      outOfStock: Boolean(form.outOfStock),
      image: form.image.trim() || '/images/products.webp',
    });
  };

  const [gA, gB] = gradientToColors(form.bg);

  const previewProduct = {
    id: initial?.id ?? -1,
    name: form.name || 'Product Name',
    category: (categoryChoice === '__new__' ? customCategory : form.category) || 'category',
    description: form.description || 'A short, tasty description shows here.',
    fullDescription: form.fullDescription,
    ingredients: form.ingredients,
    weight: form.weight || '—',
    price: form.price || 0,
    onSale: form.onSale,
    outOfStock: form.outOfStock,
    shelfLife: form.shelfLife,
    image: form.image || '/images/products.webp',
    bg: form.bg,
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Edit product' : 'Add product'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-forest/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-surface rounded-xl2 w-full max-w-[980px] max-h-[92vh] overflow-y-auto shadow-2xl animate-modal-in outline-none"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-earth hover:bg-heading/10 flex items-center justify-center text-ink-3 hover:text-heading transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <div className="p-5 sm:p-8">
          <div className="eyebrow mb-2">{mode === 'edit' ? 'Edit Product' : 'New Product'}</div>
          <h2 className="font-serif text-heading text-2xl mb-6">
            {mode === 'edit' ? `Edit "${initial?.name}"` : 'Add a new product'}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
            {/* ── Form ─────────────────────────────── */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Product Name" error={errors.name} required>
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Kumaoni Millet Crunch"
                    className={inputClass(errors.name)}
                  />
                </Field>

                <Field label="Category" error={errors.category} required>
                  <select value={categoryChoice} onChange={handleCategorySelect} className={inputClass(errors.category)}>
                    <option value="" disabled>
                      Select category…
                    </option>
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                    <option value="__new__">+ Add new category…</option>
                  </select>
                  {categoryChoice === '__new__' && (
                    <input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="New category name"
                      className={`${inputClass(errors.category)} mt-2`}
                    />
                  )}
                </Field>
              </div>

              <Field label="Short Description" hint="Shown on the product card (1 line)" error={errors.description} required>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="One short, appetising line about this product."
                  className={inputClass(errors.description)}
                />
              </Field>

              <Field label="Full Description" hint="Shown in the detail popup. Leave blank to reuse the short description.">
                <textarea
                  rows={3}
                  value={form.fullDescription}
                  onChange={(e) => setField('fullDescription', e.target.value)}
                  placeholder="A richer description for the product detail view."
                  className={inputClass()}
                />
              </Field>

              <Field label="Ingredients" hint="Press Enter or comma after each one">
                <IngredientInput value={form.ingredients} onChange={(v) => setField('ingredients', v)} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Weight / Volume" error={errors.weight} required>
                  <input
                    value={form.weight}
                    onChange={(e) => setField('weight', e.target.value)}
                    placeholder="200g / 500ml"
                    className={inputClass(errors.weight)}
                  />
                </Field>
                <Field label="Price (₹)" error={errors.price} required>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="180"
                    className={inputClass(errors.price)}
                  />
                </Field>
                <Field label="Shelf Life">
                  <input
                    value={form.shelfLife}
                    onChange={(e) => setField('shelfLife', e.target.value)}
                    placeholder="6 months"
                    className={inputClass()}
                  />
                </Field>
              </div>

              <Field label="Sale / Offer" hint="Turn on to show a 'Sale' badge on this product and include it in the storefront's Sale filter.">
                <button
                  type="button"
                  onClick={() => setField('onSale', !form.onSale)}
                  aria-pressed={form.onSale}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all
                    ${form.onSale
                      ? 'bg-heading/10 border-edge text-heading'
                      : 'bg-mist border-edge/15 text-ink-2 hover:border-edge/30'
                    }`}
                >
                  <span
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.onSale ? 'bg-heading' : 'bg-heading/20'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface shadow transition-transform ${form.onSale ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </span>
                  {form.onSale ? '🔥 On Sale — "Sale" badge will show' : 'Not on sale'}
                </button>
              </Field>

              <Field label="Out of Stock" hint="Turn on to mark this product as out of stock. It will still be visible but won't allow ordering.">
                <button
                  type="button"
                  onClick={() => setField('outOfStock', !form.outOfStock)}
                  aria-pressed={form.outOfStock}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all
                    ${form.outOfStock
                      ? 'bg-red-500/10 border-edge text-red-600 dark:text-red-400'
                      : 'bg-mist border-edge/15 text-ink-2 hover:border-edge/30'
                    }`}
                >
                  <span
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.outOfStock ? 'bg-red-500' : 'bg-heading/20'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface shadow transition-transform ${form.outOfStock ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </span>
                  {form.outOfStock ? '🚫 Out of Stock — Cannot be ordered' : 'In stock - Visible'}
                </button>
              </Field>

              <Field label="Product Image">
                <div className="flex gap-2 mb-2.5">
                  {['url', 'upload'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setImageTab(tab)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all
                        ${imageTab === tab ? 'bg-forest dark:bg-sage text-white border-edge' : 'bg-surface text-ink-2 border-edge/15 hover:border-edge/40'}`}
                    >
                      {tab === 'url' ? 'Image URL' : 'Upload File'}
                    </button>
                  ))}
                </div>
                {imageTab === 'url' ? (
                  <>
                    <input
                      value={form.image.startsWith('data:') ? '' : form.image}
                      onChange={(e) => setField('image', e.target.value)}
                      placeholder="/images/products.webp or https://…"
                      className={inputClass()}
                    />
                    {form.image.startsWith('data:') && (
                      <p className="text-sage text-xs mt-2">✓ Using an uploaded image. Type a URL above to replace it.</p>
                    )}
                  </>
                ) : (
                  <div>
                    <input type="file" accept="image/*" onChange={handleImageFile} disabled={imageCompressing} className="text-sm" />
                    {imageCompressing && <p className="text-ink-3 text-xs mt-2">⏳ Optimizing image…</p>}
                    {!imageCompressing && form.image.startsWith('data:') && (
                      <p className="text-sage text-xs mt-2">✓ Image uploaded &amp; optimized.</p>
                    )}
                    {uploadWarning && <p className="text-amber text-xs mt-2">⚠️ {uploadWarning}</p>}
                  </div>
                )}
                <p className="text-[11px] text-ink-3 mt-2">Leave blank to use the default HimShakti packet image.</p>
              </Field>

              <Field label="Card Background">
                <div className="flex flex-wrap gap-2 mb-3">
                  {GRADIENT_PRESETS.map(([a, b], i) => {
                    const value = `linear-gradient(145deg, ${a}, ${b})`;
                    const active = form.bg === value;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setField('bg', value)}
                        aria-label={`Gradient preset ${i + 1}`}
                        style={{ background: value }}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${active ? 'border-edge scale-110' : 'border-white shadow-sm hover:scale-105'}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-3">
                  <span>Custom:</span>
                  <input
                    type="color"
                    value={gA}
                    onChange={(e) => setField('bg', `linear-gradient(145deg, ${e.target.value}, ${gB})`)}
                    className="w-9 h-8 rounded cursor-pointer border border-edge/15"
                  />
                  <input
                    type="color"
                    value={gB}
                    onChange={(e) => setField('bg', `linear-gradient(145deg, ${gA}, ${e.target.value})`)}
                    className="w-9 h-8 rounded cursor-pointer border border-edge/15"
                  />
                </div>
              </Field>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface pb-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
                  className="flex-1 py-3 rounded-full text-sm font-semibold border border-edge/15 text-ink-2 hover:border-edge/40 hover:text-heading transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={imageCompressing || isBusy}
                  className="flex-1 py-3 rounded-full text-sm font-bold text-white bg-amber hover:bg-amber-lt transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {isBusy ? '⏳ Saving…' : imageCompressing ? 'Optimizing image…' : mode === 'edit' ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>

            {/* ── Live preview (real ProductCard, click disabled) ──── */}
            <div className="lg:sticky lg:top-0 self-start">
              <p className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">Live Preview</p>
              <div
                className="max-w-[300px] mx-auto lg:mx-0"
                onClickCapture={(e) => e.stopPropagation()}
                onKeyDownCapture={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
                }}
              >
                <ProductCard product={previewProduct} />
              </div>
              <p className="text-[11px] text-ink-3 mt-3 leading-relaxed">
                This is exactly how the card will look on the Products page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// productIO — export the live catalog as a backup file, and validate a
// JSON file before importing it. Now that the catalog lives in MongoDB,
// these exports are just a safety net (a snapshot you can keep, or use to
// restore from if something goes wrong) — they are no longer the way
// changes get published, since every add/edit/delete already writes
// straight to the database.

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportAsJSON(products) {
  download('himshakti-products.json', JSON.stringify(products, null, 2), 'application/json');
}

const VALID_BADGE_CLASSES = ['bg-g', 'bg-a', 'bg-s'];
const DEFAULT_GRADIENT = 'linear-gradient(145deg, #F5E6D3, #E8D5B7)';

function normalizeImportedProduct(p, index) {
  if (!p || typeof p !== 'object') throw new Error(`Item ${index + 1} isn't a valid product object.`);
  if (!p.name || !String(p.name).trim()) throw new Error(`Item ${index + 1} is missing a "name".`);
  if (!p.category || !String(p.category).trim()) throw new Error(`Item ${index + 1} is missing a "category".`);

  return {
    name: String(p.name).trim(),
    category: String(p.category).trim().toLowerCase(),
    description: p.description ? String(p.description) : '',
    fullDescription: p.fullDescription ? String(p.fullDescription) : '',
    ingredients: Array.isArray(p.ingredients) ? p.ingredients.map(String) : [],
    weight: p.weight ? String(p.weight) : '',
    price: Number(p.price) || 0,
    onSale: Boolean(p.onSale),
    shelfLife: p.shelfLife ? String(p.shelfLife) : '',
    image: p.image ? String(p.image) : '/images/products.webp',
    badge: p.badge ? String(p.badge) : '',
    badgeClass: VALID_BADGE_CLASSES.includes(p.badgeClass) ? p.badgeClass : 'bg-g',
    bg: p.bg ? String(p.bg) : DEFAULT_GRADIENT,
  };
}

// Parses & validates an uploaded JSON file's text content into a clean list
// of product objects (without ids — the caller assigns those, since import
// can either replace the whole catalog or merge into the existing one).
export function parseProductsJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file isn\u2019t valid JSON.');
  }
  if (!Array.isArray(data)) throw new Error('Expected a JSON array of products.');
  if (data.length === 0) throw new Error('That file doesn\u2019t contain any products.');
  return data.map((p, i) => normalizeImportedProduct(p, i));
}

/* ── Reviews (testimonials) — same idea, simpler shape ───────────── */

export function exportTestimonialsAsJSON(testimonialsList) {
  download('himshakti-reviews.json', JSON.stringify(testimonialsList, null, 2), 'application/json');
}

function normalizeImportedTestimonial(t, index) {
  if (!t || typeof t !== 'object') throw new Error(`Item ${index + 1} isn't a valid review object.`);
  if (!t.name || !String(t.name).trim()) throw new Error(`Item ${index + 1} is missing a "name".`);
  if (!t.text || !String(t.text).trim()) throw new Error(`Item ${index + 1} is missing review "text".`);

  const rating = Number(t.rating);

  return {
    name: String(t.name).trim(),
    location: t.location ? String(t.location) : '',
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : 5,
    text: String(t.text).trim(),
    avatar: t.avatar ? String(t.avatar) : '👤',
    phone: t.phone ? String(t.phone) : '',
  };
}

// Parses & validates an uploaded JSON file's text content into a clean list
// of review objects (without ids — import always appends on top of
// whatever reviews already exist).
export function parseTestimonialsJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file isn\u2019t valid JSON.');
  }
  if (!Array.isArray(data)) throw new Error('Expected a JSON array of reviews.');
  if (data.length === 0) throw new Error('That file doesn\u2019t contain any reviews.');
  return data.map((t, i) => normalizeImportedTestimonial(t, i));
}

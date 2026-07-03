// lib/Product.js — the MongoDB "shape" of a product, using Mongoose.
//
// This mirrors exactly the fields the storefront already uses (the same
// ones that used to live as a plain array in src/data.js). The `id` field
// is OUR OWN simple numeric id (1, 2, 3, ...) — kept separate from
// MongoDB's own internal `_id` — so the rest of the React app (which
// already expects product.id everywhere) doesn't need to change at all.

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    fullDescription: { type: String, default: '' },
    ingredients: { type: [String], default: [] },
    weight: { type: String, default: '' },
    price: { type: Number, required: true },
    onSale: { type: Boolean, default: false },
    shelfLife: { type: String, default: '' },
    image: { type: String, default: '/images/products.webp' },
    badge: { type: String, default: '' },
    badgeClass: { type: String, default: 'bg-g' },
    bg: { type: String, default: 'linear-gradient(145deg, #F5E6D3, #E8D5B7)' },
  },
  { timestamps: true }
);

// `mongoose.models.Product ||` avoids a "Cannot overwrite model" crash when
// a warm serverless container re-runs this file on a later request.
export default mongoose.models.Product || mongoose.model('Product', productSchema);

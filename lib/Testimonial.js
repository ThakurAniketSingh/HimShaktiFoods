// lib/Testimonial.js — the MongoDB "shape" of a customer review, using
// Mongoose. Mirrors the fields the storefront's testimonial cards already
// use (the same ones that used to live as a plain array in src/data.js).
// The `id` field is OUR OWN simple numeric id (1, 2, 3, ...) — kept
// separate from MongoDB's own internal `_id` — same pattern as Product.
//
// `status` is how moderation works: reviews the admin panel creates (or
// imports, or resets) default straight to 'approved'. Reviews a visitor
// submits from the public Contact page come in as 'pending' instead, and
// only show on the Home page once an admin approves them. Rejecting a
// pending review sets it to 'rejected' rather than deleting it, so there's
// a record of it (and an admin can restore it by mistake-undo).
//
// `phone` and `ip` are NOT general-purpose display fields:
//  - `phone` is collected so an admin can call/verify a reviewer is a real
//    customer before approving. It's only ever sent to an authenticated
//    admin request — see lib/toClientReview.js — never to the public site.
//  - `ip` is purely for spam rate-limiting (how many reviews this address
//    submitted recently) and is never returned to anyone, admin included.

import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String, default: '' },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    text: { type: String, required: true },
    avatar: { type: String, default: '👤' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    phone: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

// `mongoose.models.Testimonial ||` avoids a "Cannot overwrite model" crash
// when a warm serverless container re-runs this file on a later request.
export default mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);

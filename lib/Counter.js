// lib/Counter.js — generates the next numeric `id` for Products and
// Testimonials WITHOUT a race condition.
//
// THE OLD BUG: every place that needed a new id did roughly
//   const last = await Model.findOne().sort({ id: -1 });
//   const nextId = last ? last.id + 1 : 1;
// This reads the current max id, then writes a new document with
// max+1 — but those are two separate steps. If two requests run at
// nearly the same instant (e.g. two admins importing products at once,
// or two visitors submitting reviews within the same millisecond), both
// can read the same "current max" before either has written anything,
// and both then try to insert the same id. Since `id` has a unique
// index, the second insert fails outright with a duplicate-key error —
// a real request gets rejected for no reason the person could guess.
//
// THE FIX: keep a single small "counters" document per model name, and
// use MongoDB's findOneAndUpdate with $inc to read-and-increment in one
// atomic database operation. MongoDB guarantees only one request can
// "win" that increment at a time, so two simultaneous callers are always
// handed two different numbers — never the same one.

import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "Product", "Testimonial"
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: false }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Returns the next id for the given counter name, atomically. Safe to
// call concurrently from many requests at once.
export async function getNextId(counterName) {
  const doc = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return doc.value;
}

export async function getNextIds(counterName, count) {
  if (count <= 0) return [];
  const doc = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { value: count } },
    { new: true, upsert: true }
  );
  const endId = doc.value;
  const startId = endId - count + 1;
  const ids = [];
  for (let i = startId; i <= endId; i++) {
    ids.push(i);
  }
  return ids;
}

export default Counter;

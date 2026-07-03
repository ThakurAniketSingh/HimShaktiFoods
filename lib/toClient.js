// lib/toClient.js — strips MongoDB's internal bookkeeping fields
// (_id, __v, createdAt, updatedAt) before a product is sent to the
// frontend, so the API response is just the clean shape the React app
// already expects (id, name, category, ...).

export function toClient(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, createdAt, updatedAt, ...rest } = obj;
  return rest;
}

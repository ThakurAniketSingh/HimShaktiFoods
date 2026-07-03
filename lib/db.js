// lib/db.js — connects to MongoDB Atlas and *caches* the connection.
//
// Why caching matters: every API call (e.g. GET /api/products) runs as its
// own short-lived serverless function. If we called mongoose.connect() at
// the top of every function, busy traffic could open hundreds of
// connections to Atlas at once and hit the connection limit. Stashing the
// connection (and the in-progress connection promise) on Node's `global`
// object means a "warm" function container reuses the same connection
// instead of opening a new one every time.

import dns from 'dns';
import mongoose from 'mongoose';

// Some ISPs / home routers don't correctly resolve the special DNS "SRV"
// records that mongodb+srv:// connection strings rely on, which shows up
// as `querySrv ECONNREFUSED ...` even though the connection string itself
// is correct. Pointing Node's resolver at Google's public DNS sidesteps
// that, regardless of whatever DNS server the local network hands out.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global._himshaktiMongoose;
if (!cached) {
  cached = global._himshaktiMongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is not set. Add it in your Vercel project settings (or a local .env file).'
    );
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false,
      })
      .catch((err) => {
        // Don't cache a failed attempt — otherwise every request on this
        // warm container would keep re-throwing the same old error forever,
        // even after a temporary network issue clears up.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

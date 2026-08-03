# HimShakti Foods Website 🏔️

A React + Tailwind CSS storefront for HimShakti Food Processing Unit, backed
by MongoDB Atlas and deployed on Vercel. Customers browse and order via
WhatsApp (no checkout, no login), and can ask a scoped AI chat assistant
questions about the shop. A password-protected admin panel manages
products, customer reviews, and the Contact page — all changes save straight
to the database and go live immediately.

**✨ New Features in this Version:**
- **Full Dark Mode Support:** The entire UI (including the Admin Panel) seamlessly adapts to system dark mode preferences using Tailwind CSS.
- **Smart AI Chatbot (`api/chat.js`):** Upgraded with Fast-Path intent interception (bypassing AI for common queries to save costs), Fuzzy string matching for typo tolerance, and Hinglish language support.
- **Enhanced Security:** The Admin login is now protected by a strict rate-limiter stored in MongoDB (blocks brute-force attempts), and by a signed, short-lived (12-hour) session cookie instead of resending the raw password on every request — see `lib/session.js`.

## Tech Stack
- **Frontend:** React 18 + React Router 6 + Tailwind CSS 3 (Vite)
- **Backend:** Vercel Serverless Functions (`/api`) + Mongoose. Each REST
  route (products, testimonials, contact, admin) lives in its own file
  under `/api`, following Vercel's standard one-file-per-route convention
  (e.g. `api/products/index.js`, `api/products/[id].js`).
  **⚠️ Function count:** this adds up to exactly **12** serverless
  functions — the maximum allowed on Vercel's free Hobby plan. Adding
  even one more `/api/*.js` file will fail to deploy on Hobby ("No more
  than 12 Serverless Functions can be added to a Deployment"). If you
  need to add a new route, either upgrade to a Pro plan, or consolidate
  routes into fewer files (group related handlers behind a single file
  and branch on `req.method`/`req.query`, or use a `[[...path]].js`
  catch-all router — ask if you'd like that version instead).
- **Database:** MongoDB Atlas
- **AI:** Groq API (the chat assistant, `api/chat.js`)

---

## ⚡ Quick Start (local)

```bash
npm install
cp .env.example .env        # Fill in MONGODB_URI and ADMIN_PASSWORD
npm install -g vercel       # One-time global install
vercel dev                  # → http://localhost:3000
```

> **Important:** Use `vercel dev`, NOT `npm run dev` / `vite`.
> Plain Vite only serves the React frontend — the `/api` serverless functions
> (products, reviews, contact, admin login) don't run without `vercel dev`.

```bash
npm run build      # Production build → dist/
npm run preview    # Preview that production build locally
```

---

## 🔐 Environment Variables

Set these in `.env` locally, and in your Vercel project under
**Settings → Environment Variables** before deploying:

| Variable            | What it's for                                                |
|---------------------|---------------------------------------------------------------|
| `MONGODB_URI`       | Your MongoDB Atlas connection string                          |
| `ADMIN_PASSWORD`    | The password to log into `/admin/login`                       |
| `GROQ_API_KEY`      | Powers the AI chat assistant. Optional — without it, the site works fine, the chat button just shows a "not configured yet" message. Get a free key at [console.groq.com](https://console.groq.com). |

---

## 🚀 Deploying to Vercel

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Import it in [vercel.com/new](https://vercel.com/new).
3. Add `MONGODB_URI`, `ADMIN_PASSWORD`, and (optionally) `GROQ_API_KEY` under **Settings → Environment Variables**.
4. **Before going live, update these placeholders in 2 files:**
   - `index.html` — replace `https://yourdomain.com` with your real Vercel URL
     in the `og:url`, `og:image`, and `twitter:image` meta tags
   - `public/sitemap.xml` — replace `https://yourdomain.com` with your real URL
   - `public/robots.txt` — update the `Sitemap:` line with your real URL
5. Vercel picks up `vercel.json` automatically — no extra CLI flags needed.

---

## 🗺️ Public Pages

| Route           | Page                                                              |
|-----------------|-------------------------------------------------------------------|
| `/`             | Home — hero, stats, origin story, featured products, reviews      |
| `/products`     | Full catalog — category/sale filter, sort, search                 |
| `/about`        | Brand story                                                       |
| `/how-to-order` | 4-step WhatsApp ordering guide                                    |
| `/contact`      | Contact details, map, and "Leave a Review" form                   |

## 🔧 Admin Panel (`/admin/login`)

Log in with `ADMIN_PASSWORD` to manage:
- **Products** (`/admin`) — add/edit/delete, mark items "On Sale", bulk
  JSON import/export, clear the whole catalog.
- **Reviews** (`/admin/reviews`) — moderate visitor-submitted reviews
  (Pending → Approve / Reject), or add/edit reviews directly.
  Only **approved** reviews show on the Home page.
- **Contact Page** (`/admin/contact`) — edit address, phone, timing,
  email, delivery note, WhatsApp number/message, and the Google Maps embed.

> **Deleting data is permanent.** Use each section's Export (JSON) button
> to back up, and Import to restore.

---

## 📞 WhatsApp Number

Every WhatsApp button on the site (Navbar, Footer, Home, product cards,
How to Order, Contact page) pulls the number from **Admin → Contact Page →
WhatsApp Number**. Change it once there and it updates everywhere
immediately — no code edits required.

---

## 🤖 AI Chat Assistant

A floating chat button (bottom-right, every public page — never on
`/admin/*`) lets visitors ask questions and get answers about HimShakti
Foods specifically: products, prices, ordering, delivery, and contact
details. It's powered by Groq (`api/chat.js`, currently the
`openai/gpt-oss-20b` model), using your product catalog and contact info
as its only source of truth.

**Advanced Features:**
- **Fast-Path Intent Interception:** Common queries (Contact details, Menu, Greetings) are handled instantly via RegEx matching without calling the Groq API, saving costs and speeding up responses.
- **Fuzzy String Matching:** The assistant can detect typos (e.g. "nibu achar" instead of "Lemon Pickle") and intelligently suggest the right product using Levenshtein distance.
- **Hinglish Support:** Automatically detects conversational Hinglish and Hindi.
- **Auto-Retry:** Automatically handles 429 rate limit errors from Groq by waiting and retrying in the background.

- **Setup:** add a `GROQ_API_KEY` environment variable.
- **Cost/Rate-Limits:** The backend intelligently rates limit IPs. If a user exceeds the limit, a friendly fallback message is shown instead of crashing.
- **Freshness:** product/contact edits reach the assistant within 30 seconds (`CACHE_TTL` in `api/chat.js`).

## Deployment

- **Live App:** https://himshakti.vercel.app
- **Frontend + Backend:** Both hosted together on Vercel — the frontend 
  is a Vite/React SPA, and the backend is a set of Vercel Serverless 
  Functions under /api (no separate Render deployment needed).
- **Database:** MongoDB Atlas (cloud-hosted)

### Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Vercel Serverless Functions (Node.js)
- Database: MongoDB Atlas + Mongoose
- AI: Groq API (openai/gpt-oss-20b)

### Known Limitations on Free Tier
- MongoDB Atlas M0 (free tier) has a 512MB storage cap and shared CPU — 
  fine for this project's scale, but not for high traffic.
- Vercel Serverless Functions have a cold-start delay (~1-2 seconds) 
  after periods of inactivity, since each function spins up fresh.
- Groq's free tier has a rate limit on API calls, which the app handles 
  gracefully with retries and fallback replies.

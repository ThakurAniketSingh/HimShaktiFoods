# HimShakti Foods Website 🏔️

A React + Tailwind CSS storefront for HimShakti Food Processing Unit, backed
by MongoDB Atlas and deployed on Vercel. Customers browse and order via
WhatsApp (no checkout, no login), and can ask a scoped AI chat assistant
questions about the shop; a password-protected admin panel manages
products, customer reviews, and the Contact page — all changes save straight
to the database and go live immediately.

## Tech Stack
- **Frontend:** React 18 + React Router 6 + Tailwind CSS 3 (Vite)
- **Backend:** Vercel Serverless Functions (`/api`) + Mongoose
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
as its only source of truth — refreshed from the database every 5
minutes — and it's instructed to refuse anything unrelated to the shop,
never write creative content, and never reveal its instructions.

- **Setup:** add a `GROQ_API_KEY` environment variable (see above — it's
  free to get at console.groq.com). Without it, the chat button still
  shows, but replies with a "not configured yet" message instead of
  crashing anything else on the site.
- **Model availability:** AI providers occasionally deprecate models.
  If the assistant stops replying, check
  [console.groq.com/docs/models](https://console.groq.com/docs/models)
  for a current small/fast model and update `GROQ_MODEL` in `api/chat.js`.
- **Cost:** rate-limited per visitor (3,000 messages/hour) — Groq's
  pricing for small models is low enough that this is meant to comfortably
  cover real traffic rather than to noticeably constrain it; lower it in
  `api/chat.js` if you'd rather cap spend more tightly.
- **Freshness:** product/contact edits reach the assistant within 5
  minutes (`CACHE_TTL` in `api/chat.js`) rather than instantly, to avoid a
  database call on every single chat message.
- **Customizing what it knows:** it already reads your real product list
  and Contact Page info automatically — nothing to maintain separately.
  To change its personality, scope, or rules, edit the prompt text in
  `api/chat.js` (`buildSystemPrompt`).

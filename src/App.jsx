// App — root component. Sets up global providers, the Router, and routes
// for both the public site (with Navbar/Footer) and the admin panel.

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ProductsProvider } from './context/ProductsContext'
import { TestimonialsProvider } from './context/TestimonialsContext'
import { ContactProvider } from './context/ContactContext'
import { ToastProvider } from './admin/ToastContext'
import ProtectedRoute from './admin/ProtectedRoute'
import AdminLayout from './admin/AdminLayout'
import ScrollToTop from './components/ScrollToTop';
import Navbar     from './components/Navbar'
import Footer     from './components/Footer'
import Home       from './pages/Home'
import Products   from './pages/Products'
import About      from './pages/About'
import HowToOrder from './pages/HowToOrder'
import Contact    from './pages/Contact'
import NotFound   from './pages/NotFound'
import { Skeleton, FilterCardSkeleton, ProductRowSkeleton, ReviewRowSkeleton, FormFieldSkeleton } from './components/Skeleton'

// Admin pages are lazy-loaded: regular visitors (the vast majority of
// traffic) never download this code at all — it's only fetched the moment
// someone actually navigates to /admin/*. AdminLayout itself stays a
// normal (non-lazy) import — it's tiny, and keeping it eager means the
// header + tab bar render instantly, with only the page CONTENT below it
// showing a skeleton while that page's own chunk downloads.
const AdminLogin     = lazy(() => import('./admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const AdminReviews   = lazy(() => import('./admin/AdminReviews'))
const AdminContact   = lazy(() => import('./admin/AdminContact'))

// Page-specific header config for each admin route.
const ADMIN_PAGE_HEADERS = {
  '/admin': {
    title: 'Manage Products',
    desc: 'Tap a card below to see All Products, Products on Sale, or a specific Category.',
    btnLabel: '+ Add Product',
  },
  '/admin/reviews': {
    title: 'Manage Reviews',
    desc: 'Tap a card below to see Pending, Active, or Rejected reviews. Approved reviews show up in "What People Say" on the Home page.',
    btnLabel: '+ Add Review',
  },
  '/admin/contact': {
    title: 'Manage Contact Page',
    desc: null, // desc uses JSX (<strong>), rendered inline below
    btnLabel: null,
  },
};

// Shown inside the (already-visible) AdminLayout while an admin page's own
// chunk is still downloading. Reads the current path so it can show the
// correct page title + description instantly — exactly as the real page
// will look — then shows skeletons only for the data-driven section below.
function AdminContentSkeleton() {
  const { pathname } = useLocation();
  const page = ADMIN_PAGE_HEADERS[pathname] ?? ADMIN_PAGE_HEADERS['/admin'];
  const isContact = pathname === '/admin/contact';
  const isReviews = pathname === '/admin/reviews';

  return (
    <div className="wrap py-8 sm:py-10">
      {/* ── Header — always instant, never a skeleton ───────────── */}
      <div className={`flex flex-wrap items-start justify-between gap-4 mb-7 ${isContact ? '' : ''}`}>
        <div>
          <div className="eyebrow mb-2">Admin Panel</div>
          <h1 className="font-serif text-forest text-[1.8rem] sm:text-[2.1rem]">{page.title}</h1>
          {isContact ? (
            <p className="text-ink-3 text-sm mt-1">
              Everything here shows up on the public <strong>Contact &amp; Location</strong> page immediately after saving.
            </p>
          ) : (
            <p className="text-ink-3 text-sm mt-1">{page.desc}</p>
          )}
        </div>
        {page.btnLabel && (
          <button
            disabled
            className="flex items-center gap-2 bg-amber text-white font-bold px-6 py-3 rounded-full text-sm shrink-0 opacity-80 cursor-not-allowed"
          >
            {page.btnLabel}
          </button>
        )}
      </div>

      {/* ── Below-header: skeleton while data / chunk loads ─────── */}
      <div aria-hidden="true">
        {isContact ? (
          // Contact page: two-column form layout skeleton
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
            <div className="flex flex-col gap-5">
              <FormFieldSkeleton tall />
              <FormFieldSkeleton />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </div>
              <FormFieldSkeleton tall />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </div>
              <FormFieldSkeleton tall />
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <FormFieldSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          // Products & Reviews: filter cards + search bar + row list
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <FilterCardSkeleton key={i} />
              ))}
            </div>
            <Skeleton className="h-[42px] w-full rounded-full mb-5" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 5 }).map((_, i) =>
                isReviews ? <ReviewRowSkeleton key={i} /> : <ProductRowSkeleton key={i} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Shown for the login page's own chunk load — mirrors its centered card.
function AdminLoginSkeleton() {
  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4" aria-hidden="true">
      <div className="w-full max-w-sm bg-white rounded-xl2 border border-forest/8 p-7">
        <Skeleton className="w-12 h-12 rounded-xl mb-4" />
        <Skeleton className="h-5 w-2/3 rounded mb-2" />
        <Skeleton className="h-3 w-4/5 rounded mb-6" />
        <Skeleton className="h-3 w-20 rounded mb-2" />
        <Skeleton className="h-11 w-full rounded-xl mb-5" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

// Wraps every public-facing page with the storefront's Navbar + Footer.
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-mist font-sans">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// Wraps a lazy-loaded admin page with the (eager, instant) AdminLayout
// chrome and a matching skeleton for the moment its own chunk is loading.
function AdminPage({ children }) {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <Suspense fallback={<AdminContentSkeleton />}>{children}</Suspense>
      </AdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ProductsProvider>
      <TestimonialsProvider>
        <ContactProvider>
          <ToastProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Analytics />
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/"             element={<Home />}       />
                  <Route path="/products"     element={<Products />}   />
                  <Route path="/about"        element={<About />}      />
                  <Route path="/how-to-order" element={<HowToOrder />} />
                  <Route path="/contact"      element={<Contact />}    />
                  <Route path="*"             element={<NotFound />}   />
                </Route>

                <Route path="/admin/login" element={
                  <Suspense fallback={<AdminLoginSkeleton />}>
                    <AdminLogin />
                  </Suspense>
                } />
                <Route path="/admin" element={
                  <AdminPage><AdminDashboard /></AdminPage>
                } />
                <Route path="/admin/reviews" element={
                  <AdminPage><AdminReviews /></AdminPage>
                } />
                <Route path="/admin/contact" element={
                  <AdminPage><AdminContact /></AdminPage>
                } />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ContactProvider>
      </TestimonialsProvider>
    </ProductsProvider>
  )
}

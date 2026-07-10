// ProtectedRoute — guards admin pages, bouncing signed-out (or
// session-expired) visitors to login.
//
// Two checks happen here:
//   1. Instant, local check (isAuthenticated()) — just a "was I logged
//      in on this device before?" flag, so we don't flash the dashboard
//      before we've heard back from the server.
//   2. Real check (api.checkSession()) — asks the server whether the
//      httpOnly session cookie is still valid *right now*. Sessions
//      last 12 hours (see lib/session.js), and unlike the local flag,
//      only the server can know for sure whether that time has passed.
//      If it says no, we clear the local flag and bounce to /admin/login
//      immediately — so opening /admin after the session has expired
//      lands on the login screen right away, rather than only failing
//      the next time an action is attempted.
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, clearLoggedInFlag } from './adminAuth';
import { api } from './apiClient';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const locallyLoggedIn = isAuthenticated();

  // null = "haven't heard back from the server yet"
  const [serverSaysValid, setServerSaysValid] = useState(null);

  useEffect(() => {
    if (!locallyLoggedIn) return; // nothing to verify — already bouncing below
    let cancelled = false;

    api
      .checkSession()
      .then((data) => {
        if (cancelled) return;
        if (!data?.valid) clearLoggedInFlag();
        setServerSaysValid(Boolean(data?.valid));
      })
      .catch(() => {
        // Network hiccup — don't punish the admin for a flaky connection;
        // let them keep using the locally-cached "logged in" state, and
        // any actual write action will still be independently checked
        // server-side regardless.
        if (!cancelled) setServerSaysValid(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locallyLoggedIn]);

  if (!locallyLoggedIn) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // Waiting to hear back from the server — render nothing rather than
  // the dashboard, so a genuinely expired session never flashes on screen.
  if (serverSaysValid === null) return null;

  if (!serverSaysValid) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}

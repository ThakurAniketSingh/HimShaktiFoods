// ErrorBoundary — catches any unhandled React render errors below it in
// the tree and shows a friendly fallback instead of a white blank screen.
//
// React error boundaries must be class components (there is no functional-
// component equivalent yet). Only one needs to exist — drop it around
// the root <App /> in main.jsx — and it will catch crashes anywhere in
// the whole component tree.
//
// In production you'd also want to report `error` to a monitoring service
// (Sentry, BugSnag, etc.). For now it just logs to the console and shows
// a styled UI.

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' }
  }

  componentDidCatch(error, info) {
    // In a real deployment, forward `error` + `info` to your monitoring
    // service here (e.g. Sentry.captureException(error, { extra: info })).
    console.error('[ErrorBoundary] Uncaught render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            background: '#f9f8f5',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '420px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿</div>
            <h1
              style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                color: '#0b2909',
                fontSize: '1.6rem',
                marginBottom: '0.75rem',
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: '#907e6a', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#0b2909',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                padding: '0.75rem 2rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

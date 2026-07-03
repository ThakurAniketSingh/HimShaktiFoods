import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Target modern browsers — keeps the bundle smaller (no polyfill bloat).
    target: 'es2018',

    // Inline assets under 4 KB directly into the HTML/CSS so we avoid
    // tiny extra round-trips for small icons / data URIs.
    assetsInlineLimit: 4096,

    // Strip source maps from the production build — they expose your source
    // code and add tens of KB to the output for no visitor benefit.
    sourcemap: false,

    rollupOptions: {
      output: {
        // Split vendor code into separate cacheable chunks — react/
        // react-dom rarely change between deploys, so the browser can
        // keep serving them from cache even after a product-catalog
        // update touches routing code.
        //
        // Using a FUNCTION here (not the `{ name: [...] }` shorthand) is
        // deliberate: react-router-dom pulls in its own sub-dependencies
        // (react-router, @remix-run/router) that the shorthand form
        // doesn't know to list, and Rollup's heuristic for where those
        // implicitly-shared modules land can vary between builds — in
        // practice this occasionally collapsed EVERYTHING into one
        // ~165 KB "vendor-router" chunk and left "vendor-react" nearly
        // empty, silently defeating the whole point of the split.
        // Matching on each module's actual node_modules folder name is
        // deterministic and doesn't depend on Rollup's chunk-graph
        // guesswork.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react-router-dom|react-router|@remix-run)[\\/]/.test(id)) {
            return 'vendor-router';
          }
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
        },
        // Fingerprinted file names so CDN/browser caches are busted
        // automatically on every new deploy, but still serve from cache
        // between deploys when files haven't changed.
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})

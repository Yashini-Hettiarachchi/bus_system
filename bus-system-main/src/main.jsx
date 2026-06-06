// BusSync – React entry point.
// Bootstraps the app: cleans legacy service-worker state, registers the current
// service worker, then mounts the React component tree.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Global CSS reset and typography tokens
import App from './App.jsx' // Root component that contains the entire UI

// Removes outdated service worker registrations and cache buckets left behind
// by previous app versions. Prevents stale offline content from being served
// to passengers after a deployment.
async function clearLegacyOfflineState() {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister all currently-registered SWs for this origin
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    } catch {
      // Ignore and continue booting app.
    }
  }

  if ('caches' in window) {
    try {
      // Remove any Cache Storage buckets created by the old "bus-sync-*" strategy
      const cacheKeys = await caches.keys()
      const legacyKeys = cacheKeys.filter((key) => key.startsWith('bus-sync-'))
      await Promise.all(legacyKeys.map((key) => caches.delete(key)))
    } catch {
      // Ignore cache cleanup failures.
    }
  }
}

// Only attempt SW registration in browsers that support it
if ('serviceWorker' in navigator) {
  // Wait for the page "load" event so the SW registration does not compete
  // with initial page resources and slow down first paint.
  window.addEventListener('load', async () => {
    await clearLegacyOfflineState() // Remove stale SWs before registering the new one

    try {
      // Register (or update) sw.js. The ?v=3 bust ensures browsers re-fetch
      // the SW script even if it's cached. updateViaCache:'none' prevents the
      // browser's HTTP cache from serving an old copy of sw.js.
      await navigator.serviceWorker.register('/sw.js?v=3', { updateViaCache: 'none' })
    } catch {
      // Ignore registration failures and keep app usable.
    }
  })
}

// Mount the React component tree into the <div id="root"> placeholder in index.html.
// StrictMode renders components twice in development to surface side-effect bugs.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

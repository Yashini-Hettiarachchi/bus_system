// Service Worker for BusSync PWA.
// This SW is intentionally minimal — it does not cache any assets.
// Its sole job is to keep the PWA installable on mobile devices.

// "install" fires when a new SW version is detected by the browser.
// skipWaiting() activates the new SW immediately instead of waiting
// for all old tabs to be closed first.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// "activate" fires after the SW takes over.
// clients.claim() makes the new SW take control of every open page
// immediately, so passengers see the latest app version without a refresh.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

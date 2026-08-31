self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Bonoa deliberately keeps authenticated and business data network-first.
// The service worker exists to provide a proper installable PWA lifecycle
// without caching private wallet responses on shared devices.

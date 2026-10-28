/**
 * Forces the browser to check for service worker updates,
 * delete stale Workbox caches, and reload the application.
 */
export async function forcePWACacheUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update();
      }
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch (err) {
    console.error('Error clearing PWA cache:', err);
  } finally {
    window.location.reload();
  }
}

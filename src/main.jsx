import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Automatically check and activate PWA service worker updates immediately
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Periodically check for new SW updates (every 60s)
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

      // Check for updates when user returns to / refocuses tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  }
});

// Auto-reload when new service worker takes control so users never stay on stale caches
let isRefreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!isRefreshing) {
    isRefreshing = true;
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


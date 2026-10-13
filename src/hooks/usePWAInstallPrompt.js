import { useState, useEffect } from 'react';

export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // Check if already in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // On iOS, if not in standalone mode, mark as installable via Safari share sheet
    if (isIosDevice) {
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser's default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (isIOS) {
      alert("To install JMT Fee LMS on your iPhone / iPad:\n\n1. Tap the Share button (square with arrow pointing up) at the bottom of Safari.\n2. Scroll down and tap 'Add to Home Screen' (+ icon).\n3. Tap 'Add' in the top right.\n\nThe app icon will appear on your home screen!");
      return true;
    }

    if (!deferredPrompt) {
      // Fallback instructions if prompt is unavailable
      alert("To install this app on your device:\n\nIn Chrome or Edge, click the 'Install' icon in the address bar (or Menu ⋮ -> 'Install app' / 'Add to Home screen').");
      return false;
    }

    // Show native prompt
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }

    return false;
  };

  return { isInstallable, isInstalled, installApp, isIOS };
}

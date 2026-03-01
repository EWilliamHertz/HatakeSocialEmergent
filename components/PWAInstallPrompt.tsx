'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share2, Plus } from 'lucide-react';
import Image from 'next/image';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default true = no flash on load

  useEffect(() => {
    // Already installed? Don't show anything.
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);
    if (isAppStandalone) return;

    // Check if dismissed recently (reset after 7 days so returning users see it again)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed-at');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Dismissed within last 7 days — respect the choice
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) ||
      // iPad in desktop mode (iPadOS 13+) — navigator.platform check
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Delay so it doesn't appear while the page is still loading
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chrome — capture the native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.removeItem('pwa-prompt-dismissed-at');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed-at', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[100] md:bottom-6 md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow">
              <Image
                src="/icons/icon-192x192.png"
                alt="Hatake"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                Install Hatake
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Add to home screen for the best experience
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iOS instructions */}
        {isIOS ? (
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Install in 2 steps:
            </p>
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Tap the <Share2 className="w-3.5 h-3.5 inline mb-0.5" /> <b>Share</b> button in Safari</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Tap <Plus className="w-3.5 h-3.5 inline mb-0.5" /> <b>Add to Home Screen</b></span>
            </div>
          </div>
        ) : (
          /* Android / Chrome — native install button */
          <button
            onClick={handleInstall}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Add to Home Screen
          </button>
        )}
      </div>
    </div>
  );
}

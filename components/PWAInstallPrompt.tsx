'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import Image from 'next/image';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    // Check if the app is already installed/running in standalone mode
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isAppStandalone);

    if (isAppStandalone) return;

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) return;

    // Detect iOS devices (iOS doesn't support the automatic install prompt, requires manual action)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Delay showing the manual iOS prompt so it doesn't jump scare them immediately
      setTimeout(() => setShowPrompt(true), 3000);
    }

    // Capture the Android/Chrome install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent default mini-infobar
      setDeferredPrompt(e); // Save it for our custom button
      setShowPrompt(true); // Show our custom banner
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    // We can only use the prompt once
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that they dismissed it so we don't annoy them
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
               <Image src="/icons/icon-192x192.png" alt="Hatake" width={32} height={32} className="rounded-lg" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Install Hatake App</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add to home screen for a faster experience.</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS && !deferredPrompt ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex flex-col gap-2">
              <span className="flex items-center gap-2">
                1. Tap the <Share className="w-4 h-4 inline" /> Share button below.
              </span>
              <span>
                2. Scroll down and tap <b>Add to Home Screen</b>.
              </span>
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install to Home Screen
          </button>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari specific property
      Boolean(window.navigator.standalone);

    if (isStandalone) {
      return; // Already installed, don't show banner
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isAppleDevice) {
      setIsIOS(true);
      setIsInstallable(true);
    }

    // Listen for Chrome/Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('To install this app on your iPhone: tap the Share button at the bottom of Safari and select "Add to Home Screen".');
    }
  };

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900 text-white rounded-xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-fadeIn">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white leading-tight">Install RepairTrack App</p>
          <p className="text-[11px] text-slate-400 truncate">
            {isIOS ? 'Add to Home Screen for quick mobile access' : 'Download and run like an actual mobile app'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="https://github.com/enterpriseaarna6-eng/mobile-repair-tracker/releases/download/v1.0.4/app-debug.apk"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          title="Download standalone Android APK"
        >
          <Download className="w-3.5 h-3.5" />
          <span>APK</span>
        </a>

        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          {isIOS ? <Share className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
          <span>Install</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-md"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


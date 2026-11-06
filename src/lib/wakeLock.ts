/**
 * Universal Screen Wake Lock Engine
 * Keeps the device screen awake during critical operations:
 * - Report exports and file downloads
 * - Photo compression, cloud uploads, and batch submissions
 * 
 * Works across:
 * 1. Standard W3C Screen Wake Lock API (Chrome Android, Edge, Safari iOS 16.4+)
 * 2. Native Android Bridge in Capacitor APK (window.AndroidApp.setKeepScreenOn)
 * 3. Visibility change auto-reacquisition
 */

let wakeLockSentinel: any = null;
let activeLocksCount = 0;

export async function requestScreenWakeLock(tag = 'operation'): Promise<boolean> {
  activeLocksCount++;

  // 1. Native Android APK Bridge
  if (typeof window !== 'undefined' && (window as any).AndroidApp?.setKeepScreenOn) {
    try {
      (window as any).AndroidApp.setKeepScreenOn(true);
    } catch (e) {
      console.warn('Native Android setKeepScreenOn failed:', e);
    }
  }

  // 2. W3C Screen Wake Lock API
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
      return true;
    } catch (err) {
      console.warn(`[WakeLock] Could not acquire screen wake lock for "${tag}":`, err);
    }
  }

  return false;
}

export async function releaseScreenWakeLock(): Promise<void> {
  activeLocksCount = Math.max(0, activeLocksCount - 1);
  if (activeLocksCount > 0) {
    return; // Another operation still needs the screen kept awake
  }

  // 1. Release Native Android APK Bridge flag
  if (typeof window !== 'undefined' && (window as any).AndroidApp?.setKeepScreenOn) {
    try {
      (window as any).AndroidApp.setKeepScreenOn(false);
    } catch (e) {
      console.warn('Native Android setKeepScreenOn release failed:', e);
    }
  }

  // 2. Release W3C Screen Wake Lock
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      console.warn('[WakeLock] Error releasing screen wake lock:', err);
    } finally {
      wakeLockSentinel = null;
    }
  }
}

// Auto re-acquire wake lock if user switches away and returns while work is running
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (activeLocksCount > 0 && document.visibilityState === 'visible' && !wakeLockSentinel) {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // ignore
      }
    }
  });
}

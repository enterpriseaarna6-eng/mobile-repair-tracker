/**
 * Universal Report Download & Native Device Saver
 * 
 * Solves file downloading and sharing across all devices:
 * 1. Android APK (Capacitor WebView) -> Native Android Bridge & DownloadManager -> /sdcard/Download
 * 2. Chrome Mobile & Desktop -> Direct authenticated HTTPS stream & Blob
 * 3. iPhone / Safari -> Content-Disposition attachment & Web Share
 * 4. Screen Wake Lock -> Keeps device screen awake until processing & download finishes
 */

import { requestScreenWakeLock, releaseScreenWakeLock } from './wakeLock';

export interface DownloadOptions {
  type: 'pending' | 'completed';
  format: 'csv' | 'excel';
  startDate?: string;
  endDate?: string;
}

export interface DownloadResult {
  success: boolean;
  filename: string;
  directDownloadUrl: string;
  base64Data: string;
  mimeType: string;
  blob: Blob;
  blobUrl: string;
  csvText?: string;
  shared: boolean;
}

/**
 * Converts a Blob to a raw base64 string (without the data: prefix)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = (reader.result as string) || '';
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download report, acquire wake lock, fetch authenticated bytes, and trigger immediate save to device
 */
export async function downloadReport(options: DownloadOptions): Promise<DownloadResult> {
  const { type, format, startDate, endDate } = options;

  // 1. Keep screen awake while report is being generated and downloaded
  await requestScreenWakeLock('report_download');

  try {
    // 2. Fetch session token for secure direct HTTPS download link
    let authToken = '';
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.token) authToken = meData.token;
      }
    } catch {
      // ignore
    }

    // 3. Build authenticated direct HTTPS URL
    const params = new URLSearchParams();
    params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (authToken) params.append('token', authToken);
    params.append('t', Date.now().toString());

    const endpoint = format === 'csv' ? '/api/export/csv' : '/api/export/excel';
    const directDownloadUrl = `${endpoint}?${params.toString()}`;

    // 4. Fetch authenticated stream in memory
    const res = await fetch(directDownloadUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      let errMsg = `Server returned ${res.status}`;
      try {
        const errData = await res.json();
        if (errData?.error) errMsg = errData.error;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    // 5. Read Blob
    const blob = await res.blob();

    // 6. Extract or compute filename
    let filename = '';
    const disp = res.headers.get('content-disposition');
    if (disp && disp.includes('filename=')) {
      const match = disp.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    if (!filename) {
      const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      filename = `${type === 'pending' ? 'PENDING_TO_REPAIR' : 'COMPLETED_REPAIRS'}_${dateSuffix}.${ext}`;
    }

    const mimeType =
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // 7. Convert to Base64 for native Android APK Bridge
    const base64Data = await blobToBase64(blob);

    // Read CSV text for quick clipboard / preview if CSV
    let csvText: string | undefined = undefined;
    if (format === 'csv') {
      try {
        csvText = await blob.text();
      } catch {
        // ignore
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);

    const result: DownloadResult = {
      success: true,
      filename,
      directDownloadUrl,
      base64Data,
      mimeType,
      blob,
      blobUrl,
      csvText,
      shared: false,
    };

    // 8. Trigger immediate device save into Downloads directory!
    await executeDirectDownload(result);

    return result;
  } finally {
    // Release screen wake lock when done
    await releaseScreenWakeLock();
  }
}

/**
 * Execute Direct Download into the device's Downloads directory
 * Works across Native Android APK, Mobile Chrome, and Desktop
 */
export async function executeDirectDownload(result: DownloadResult): Promise<boolean> {
  await requestScreenWakeLock('save_to_downloads');

  try {
    const isAndroidApp =
      typeof window !== 'undefined' &&
      typeof (window as any).AndroidApp !== 'undefined';

    // Strategy A: Native Android Bridge (writes directly to /storage/emulated/0/Download/)
    if (isAndroidApp && (window as any).AndroidApp?.saveBase64ToDownloads) {
      try {
        (window as any).AndroidApp.saveBase64ToDownloads(
          result.base64Data,
          result.filename,
          result.mimeType
        );
        return true;
      } catch (err) {
        console.warn('Native Android saveBase64ToDownloads failed, trying fallback:', err);
      }
    }

    // Strategy B: Trigger direct authenticated HTTPS navigation
    // On Android WebView, DownloadListener catches this and enqueues in native DownloadManager!
    // On mobile/desktop browsers, triggers standard browser download!
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = result.directDownloadUrl;
      a.download = result.filename;
      a.target = '_self';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch {}
      }, 2000);
    } catch {
      // Strategy C: window.location.assign fallback
      try {
        window.location.assign(result.directDownloadUrl);
      } catch (e) {
        console.warn('Direct URL navigation failed:', e);
      }
    }

    // Strategy D: Blob anchor for standard desktop/modern browser fallback
    try {
      const blobAnchor = document.createElement('a');
      blobAnchor.style.display = 'none';
      blobAnchor.href = result.blobUrl;
      blobAnchor.download = result.filename;
      document.body.appendChild(blobAnchor);
      blobAnchor.click();
      setTimeout(() => {
        try {
          document.body.removeChild(blobAnchor);
        } catch {}
      }, 2000);
    } catch {
      // ignore
    }

    return true;
  } finally {
    await releaseScreenWakeLock();
  }
}

/**
 * Execute Native Share (WhatsApp, Drive, Files, Save to device)
 * Works across Android APK Native Bridge, Web Share Level 2 (files), and Web Share Level 1 (URL)
 */
export async function executeNativeShare(result: DownloadResult): Promise<boolean> {
  await requestScreenWakeLock('native_share');

  try {
    const isAndroidApp =
      typeof window !== 'undefined' &&
      typeof (window as any).AndroidApp !== 'undefined';

    // 1. Native Android APK Bridge: Send file via ACTION_SEND Intent Chooser
    if (isAndroidApp && (window as any).AndroidApp?.shareBase64File) {
      try {
        (window as any).AndroidApp.shareBase64File(
          result.base64Data,
          result.filename,
          result.mimeType
        );
        return true;
      } catch (err) {
        console.warn('Native Android shareBase64File failed:', err);
      }
    }

    const file = new File([result.blob], result.filename, { type: result.mimeType });

    // 2. Web Share Level 2: Sharing actual file (Chrome Android, Safari iOS)
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: result.filename,
          text: `RepairTrack Ops: ${result.filename}`,
        });
        return true;
      } catch (shareErr: unknown) {
        if (shareErr instanceof Error && shareErr.name === 'AbortError') {
          return true; // User intentionally dismissed share dialog
        }
        console.warn('Web Share files failed, falling back to URL share:', shareErr);
      }
    }

    // 3. Web Share Level 1: Share direct HTTPS download link to WhatsApp / contacts
    const fullDownloadUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${result.directDownloadUrl}`
        : result.directDownloadUrl;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: result.filename,
          text: `RepairTrack Report (${result.filename}):`,
          url: fullDownloadUrl,
        });
        // Also trigger direct download into Downloads
        await executeDirectDownload(result);
        return true;
      } catch (shareErr: unknown) {
        if (shareErr instanceof Error && shareErr.name === 'AbortError') {
          return true;
        }
        console.warn('Web Share URL failed:', shareErr);
      }
    }

    // 4. Fallback if sharing is unavailable: Direct Download to device
    await executeDirectDownload(result);
    return true;
  } finally {
    await releaseScreenWakeLock();
  }
}

/**
 * Universal Report Download Helper for Web & Mobile APK (Capacitor WebView)
 * 
 * Solves the classic Android WebView issue where `window.location.href` to a
 * binary/CSV endpoint fails silently.
 * 
 * Strategies:
 * 1. Fetch file bytes with auth session cookies directly into in-memory Blob.
 * 2. Mobile Web Share API (native Android share sheet: Save to Downloads, WhatsApp, Sheets, Files).
 * 3. Client-side Blob URL anchor download.
 * 4. Fallback in-app modal with Direct Download Link, Copy to Clipboard, and Table Preview.
 */

export interface DownloadOptions {
  type: 'pending' | 'completed';
  format: 'csv' | 'excel';
  startDate?: string;
  endDate?: string;
}

export interface DownloadResult {
  success: boolean;
  filename: string;
  blob: Blob;
  blobUrl: string;
  csvText?: string;
  shared: boolean;
}

export async function downloadReport(options: DownloadOptions): Promise<DownloadResult> {
  const { type, format, startDate, endDate } = options;

  const params = new URLSearchParams();
  params.append('type', type);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const endpoint = format === 'csv' ? '/api/export/csv' : '/api/export/excel';
  const url = `${endpoint}?${params.toString()}`;

  // 1. Fetch authenticated stream with cookies
  const res = await fetch(url, {
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

  // 2. Read Blob
  const blob = await res.blob();

  // 3. Extract or compute filename
  let filename = '';
  const disp = res.headers.get('content-disposition');
  if (disp && disp.includes('filename=')) {
    const match = disp.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  if (!filename) {
    const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    filename = `${type === 'pending' ? 'Pending_to_Repair' : 'Completed_Repairs'}_${dateSuffix}.${ext}`;
  }

  const mimeType =
    format === 'csv'
      ? 'text/csv;charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Read raw text if CSV for preview and clipboard
  let csvText: string | undefined = undefined;
  if (format === 'csv') {
    try {
      csvText = await blob.text();
    } catch {
      // ignore
    }
  }

  const file = new File([blob], filename, { type: mimeType });
  const blobUrl = window.URL.createObjectURL(blob);

  // 4. Try native Web Share API on mobile (Android / iOS)
  let shared = false;
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: `RepairTrack Ops: ${filename}`,
      });
      shared = true;
    } catch (shareErr: unknown) {
      if (shareErr instanceof Error && shareErr.name === 'AbortError') {
        // User closed share dialog, still successful
        return { success: true, filename, blob, blobUrl, csvText, shared: true };
      }
      console.warn('Native share failed, falling back to anchor download:', shareErr);
    }
  }

  // 5. Trigger standard anchor download
  try {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {
        // ignore
      }
    }, 1500);
  } catch (err) {
    console.warn('Anchor download click failed:', err);
  }

  return {
    success: true,
    filename,
    blob,
    blobUrl,
    csvText,
    shared,
  };
}


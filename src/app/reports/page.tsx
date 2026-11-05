'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle2,
  Table,
  Check,
  FileText,
  Info,
  Loader2,
  AlertCircle,
  Share2,
  Copy,
  ExternalLink,
  X,
  Eye,
} from 'lucide-react';
import { getKolkataDateString } from '@/lib/timezone';
import { downloadReport, DownloadResult } from '@/lib/downloadHelper';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'pending' | 'completed'>('pending');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Download states for mobile & app reliability
  const [downloading, setDownloading] = useState<'csv' | 'excel' | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // Fetch counts when filters or tab change
  const fetchCounts = async () => {
    setLoadingCount(true);
    try {
      const pParams = new URLSearchParams();
      if (startDate) pParams.append('pickup_date', startDate);
      const resP = await fetch(`/api/pending?${pParams.toString()}`);
      if (resP.ok) {
        const dataP = await resP.json();
        setPendingCount(dataP.totalCount);
      }

      const cParams = new URLSearchParams();
      if (startDate) cParams.append('completion_date', startDate);
      const resC = await fetch(`/api/completed?${cParams.toString()}`);
      if (resC.ok) {
        const dataC = await resC.json();
        setCompletedCount(dataC.totalCount);
      }
    } catch (err) {
      console.error('Failed to load report counts:', err);
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [startDate, endDate]);

  const handleApplyPreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    const today = getKolkataDateString();
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today);
    } else if (preset === 'month') {
      const d = new Date();
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(today);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Robust multi-strategy download for Android APK & Mobile Browsers
  const handleDownload = async (format: 'csv' | 'excel') => {
    setDownloading(format);
    setDownloadError(null);
    setCopied(false);

    try {
      const result = await downloadReport({
        type: reportType,
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setDownloadResult(result);
    } catch (err: unknown) {
      console.error('Report download failed:', err);
      const msg = err instanceof Error ? err.message : 'Download failed';
      setDownloadError(msg);
    } finally {
      setDownloading(null);
    }
  };

  // Copy CSV raw data to clipboard for easy sharing on WhatsApp/Sheets
  const handleCopyCsv = async () => {
    if (!downloadResult?.csvText) return;
    try {
      await navigator.clipboard.writeText(downloadResult.csvText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = downloadResult.csvText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Trigger native share sheet on mobile
  const handleShareFile = async () => {
    if (!downloadResult) return;
    try {
      const mimeType =
        downloadResult.filename.endsWith('.csv')
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const file = new File([downloadResult.blob], downloadResult.filename, { type: mimeType });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: downloadResult.filename,
          text: `RepairTrack ${downloadResult.filename}`,
        });
      } else {
        // Fallback: trigger download link
        const a = document.createElement('a');
        a.href = downloadResult.blobUrl;
        a.download = downloadResult.filename;
        a.click();
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Admin Data Exports & Audits</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reports & Downloads
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and export officially formatted Excel (.xlsx) and CSV spreadsheets. Date ranges can be customized freely.
          </p>
        </div>

        {/* Report Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Report A: Pending */}
          <button
            type="button"
            onClick={() => setReportType('pending')}
            className={`p-5 rounded-xl border text-left transition-all ${
              reportType === 'pending'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Report A</span>
              </span>
              {reportType === 'pending' && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900">Pending to Repair</h2>
            <p className="text-xs text-slate-500 mt-1">
              Filter by <span className="font-semibold text-slate-700">Original Pickup Date</span>. Contains all phones currently awaiting technician repair.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Matching Records:</span>
              <span className="font-mono font-bold text-amber-700 text-sm">
                {loadingCount ? '...' : pendingCount ?? '-'}
              </span>
            </div>
          </button>

          {/* Report B: Completed */}
          <button
            type="button"
            onClick={() => setReportType('completed')}
            className={`p-5 rounded-xl border text-left transition-all ${
              reportType === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Report B</span>
              </span>
              {reportType === 'completed' && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900">Completed Repairs</h2>
            <p className="text-xs text-slate-500 mt-1">
              Filter by <span className="font-semibold text-slate-700">Actual Completion Date</span>. Contains all repaired and handed-back devices.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Matching Records:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {loadingCount ? '...' : completedCount ?? '-'}
              </span>
            </div>
          </button>
        </div>

        {/* Date Range Filtering Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span>
                Filter by{' '}
                {reportType === 'pending' ? 'Pickup Date Range' : 'Completion Date Range'}
              </span>
            </h2>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Range</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-400">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('today')}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('7days')}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('month')}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
            >
              All Time (No Filter)
            </button>
          </div>
        </div>

        {/* Error Banner if download fails */}
        {downloadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={() => setDownloadError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Download Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Excel Export Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mb-3">
                <Table className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Download Formatted Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Full enterprise formatting: vertically merged date cells for the same date group, vertically merged batch image cells, and solid dividing black borders.
              </p>
            </div>

            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => handleDownload('excel')}
              className="mt-5 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {downloading === 'excel' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Excel (.xlsx)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Download Excel ({reportType === 'pending' ? 'Pending' : 'Completed'})
                  </span>
                </>
              )}
            </button>
          </div>

          {/* CSV Export Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Download Standard CSV (.csv)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Standard RFC 4180 format with individual rows for each phone, direct image URLs, and UTF-8 encoding. Ready for Google Sheets.
              </p>
            </div>

            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => handleDownload('csv')}
              className="mt-5 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {downloading === 'csv' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Generating CSV (.csv)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>
                    Download CSV ({reportType === 'pending' ? 'Pending' : 'Completed'})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Audit / Format Specifications notice */}
        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Excel Report Formatting Guarantees:
            </p>
            <ul className="list-disc list-inside text-slate-500 space-y-0.5 text-[11px]">
              <li>Date cells merged vertically across multiple phones belonging to the same date.</li>
              <li>Batch Image cells merged vertically across phones belonging to the same batch.</li>
              <li>Black borders separating different date groups.</li>
              <li>Direct accessible image URLs and embedded preview thumbnails.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Download Ready Modal (Ensures 100% Reliable Download on Mobile APK & Web) */}
      {downloadResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Report Ready!</span>
              </div>
              <button
                type="button"
                onClick={() => setDownloadResult(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-800 break-all font-mono">
                {downloadResult.filename}
              </p>
              <p className="text-[11px] text-slate-500">
                Size: {(downloadResult.blob.size / 1024).toFixed(1)} KB • Ready for download / sharing
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Button 1: Native Mobile Share / Save to Device */}
              <button
                type="button"
                onClick={handleShareFile}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share / Save to Device (WhatsApp / Downloads)</span>
              </button>

              {/* Button 2: Direct File Download Link */}
              <a
                href={downloadResult.blobUrl}
                download={downloadResult.filename}
                className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Direct Download File ({downloadResult.filename.endsWith('.csv') ? 'CSV' : 'Excel'})</span>
              </a>

              {/* Button 3: Copy CSV to Clipboard (if CSV) */}
              {downloadResult.csvText && (
                <button
                  type="button"
                  onClick={handleCopyCsv}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied CSV Data to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>Copy Raw CSV Text to Clipboard</span>
                    </>
                  )}
                </button>
              )}

              {/* Button 4: In-App Table Preview */}
              {downloadResult.csvText && (
                <button
                  type="button"
                  onClick={() => setShowCsvPreview(!showCsvPreview)}
                  className="w-full py-1.5 px-3 text-slate-500 hover:text-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showCsvPreview ? 'Hide CSV Preview' : 'Preview CSV Rows in App'}</span>
                </button>
              )}
            </div>

            {/* CSV Table Preview Container */}
            {showCsvPreview && downloadResult.csvText && (
              <div className="max-h-48 overflow-auto border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono text-[10px] text-slate-700 whitespace-pre">
                {downloadResult.csvText.split('\n').slice(0, 15).join('\n')}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDownloadResult(null)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}


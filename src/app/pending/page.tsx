'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RepairItem } from '@/lib/types';
import { formatKolkataDateOnly } from '@/lib/timezone';
import { ImageModal } from '@/components/ImageModal';
import { downloadReport, DownloadResult } from '@/lib/downloadHelper';
import {
  Clock,
  Search,
  Calendar,
  Filter,
  RotateCcw,
  Eye,
  Loader2,
  Smartphone,
  AlertCircle,
  Download,
  Share2,
  Copy,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export default function PendingPage() {
  const [items, setItems] = useState<RepairItem[]>([]);
  const [distinctDates, setDistinctDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);

  // Download states directly inside Pending Section
  const [downloading, setDownloading] = useState<'excel' | 'csv' | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDate) params.append('pickup_date', selectedDate);

      const res = await fetch(`/api/pending?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        if (data.distinctDates) {
          setDistinctDates(data.distinctDates);
        }
      }
    } catch (err) {
      console.error('Failed to fetch pending items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDate('');
  };

  // Direct download handler for Pending Section
  const handleDownload = async (format: 'excel' | 'csv') => {
    setDownloading(format);
    setDownloadError(null);
    setCopied(false);

    try {
      const result = await downloadReport({
        type: 'pending',
        format,
        startDate: selectedDate || undefined,
        endDate: selectedDate || undefined,
      });

      setDownloadResult(result);
    } catch (err: unknown) {
      console.error('Failed to download pending report:', err);
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyCsv = async () => {
    if (!downloadResult?.csvText) return;
    try {
      await navigator.clipboard.writeText(downloadResult.csvText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = downloadResult.csvText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareFile = async () => {
    if (!downloadResult) return;
    try {
      const mimeType = downloadResult.filename.endsWith('.csv')
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
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header with Direct CSV/Excel Download */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              <span>Awaiting Technician Repair</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pending to Repair
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Current inventory of phones handed over for repair but not yet completed.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shrink-0">
              {items.length} {items.length === 1 ? 'Unit Pending' : 'Units Pending'}
            </span>

            {/* Direct Excel Download with Merged Cells */}
            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => handleDownload('excel')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Download Formatted Excel with Merged Date & Image Cells"
            >
              {downloading === 'excel' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </>
              )}
            </button>

            {/* Direct CSV Download */}
            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => handleDownload('csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Download Standard CSV File"
            >
              {downloading === 'csv' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Download Error Banner */}
        {downloadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Model Name, Repair ID (e.g. REP-1001), or Fault..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="">All Pickup Dates</option>
                {distinctDates.map((date) => (
                  <option key={date} value={date}>
                    {formatKolkataDateOnly(date)}
                  </option>
                ))}
              </select>
            </div>

            {(search || selectedDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-7 h-7 text-amber-500 animate-spin mb-2" />
              <p className="text-xs">Loading pending repair items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Pending Phones Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {search || selectedDate
                  ? 'No pending repairs match your search or date filter. Try resetting filters.'
                  : 'All handed-over phones have been successfully repaired and returned!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Pickup Date</th>
                    <th className="py-3 px-4">Model Name</th>
                    <th className="py-3 px-4">Repair Reason / Fault</th>
                    <th className="py-3 px-4">Batch Image</th>
                    <th className="py-3 px-4">Repair Item ID</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      {/* Pickup Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatKolkataDateOnly(item.pickup_date)}</span>
                        </div>
                      </td>

                      {/* Model Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.model_name}
                      </td>

                      {/* Repair Reason */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-600">
                        {item.repair_reason}
                      </td>

                      {/* Batch Image */}
                      <td className="py-3.5 px-4">
                        {item.pickup_image_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModalImage({
                                url: item.pickup_image_url!,
                                title: `Batch Intake Photo (${item.pickup_batch_id})`,
                              })
                            }
                            className="flex items-center gap-2 group text-left"
                            title="Click to view batch photo"
                          >
                            <div className="w-10 h-10 rounded-md bg-slate-900 border border-slate-200 overflow-hidden relative shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.pickup_image_url}
                                alt="Batch"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                            <span className="text-[11px] text-amber-700 font-semibold group-hover:underline flex items-center gap-0.5">
                              <span>Batch Photo</span>
                              <Eye className="w-3 h-3" />
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No image</span>
                        )}
                      </td>

                      {/* Repair Item ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                          {item.id}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Pending</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {items.length} pending items</span>
            <span className="text-[11px] text-slate-400">Timezone: Asia/Kolkata</span>
          </div>
        </div>
      </div>

      {/* Download Result Modal (Reliable on Android APK & Mobile Browsers) */}
      {downloadResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>Pending Report Ready!</span>
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

            <div className="space-y-2">
              {/* Native Mobile Share / Save to Device */}
              <button
                type="button"
                onClick={handleShareFile}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share / Save to Device (WhatsApp / Downloads)</span>
              </button>

              {/* Direct File Download Link */}
              <a
                href={downloadResult.blobUrl}
                download={downloadResult.filename}
                className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Direct Download File</span>
              </a>

              {/* Copy CSV Text to Clipboard */}
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
            </div>

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

      {/* Image Zoom Modal */}
      {modalImage && (
        <ImageModal
          isOpen={true}
          imageUrl={modalImage.url}
          title={modalImage.title}
          onClose={() => setModalImage(null)}
        />
      )}
    </AppLayout>
  );
}

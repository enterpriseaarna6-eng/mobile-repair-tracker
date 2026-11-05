'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import {
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
  Eye,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { getKolkataDateString, formatKolkataDateOnly, getKolkataTimeString } from '@/lib/timezone';
import { ImageModal } from '@/components/ImageModal';

interface ReturnRow {
  rowId: string;
  model_name: string;
  pickup_date: string;
  repair_reason: string;
  itemId?: string;
  status: 'empty' | 'searching' | 'found' | 'not_found';
}

export default function ReturnPage() {
  const router = useRouter();
  const [today, setToday] = useState('2026-11-05');
  const [currentTime, setCurrentTime] = useState('12:00:00');

  // Mandatory return batch photo (1 photo for all returned phones)
  const [returnImageFile, setReturnImageFile] = useState<File | null>(null);
  const [returnImagePreview, setReturnImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Suggestions for quick typing without memorization
  const [suggestedModels, setSuggestedModels] = useState<string[]>([]);
  const [suggestedDates, setSuggestedDates] = useState<string[]>([]);

  // Dynamic rows of phones being returned (Zero ID hassle!)
  const [rows, setRows] = useState<ReturnRow[]>([
    {
      rowId: 'row-1',
      model_name: '',
      pickup_date: '',
      repair_reason: '',
      status: 'empty',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    batchId: string;
    completedCount: number;
    completedItems: { model_name: string; pickup_date: string; repair_reason: string }[];
  } | null>(null);

  const [modalImage, setModalImage] = useState<string | null>(null);

  // Initial load: Set today's date and pre-fetch pending model suggestions
  useEffect(() => {
    const curDate = getKolkataDateString();
    setToday(curDate);
    setCurrentTime(getKolkataTimeString());

    async function loadPendingSummary() {
      try {
        const res = await fetch('/api/search-pending');
        if (res.ok) {
          const data = await res.json();
          if (data.pendingModels) setSuggestedModels(data.pendingModels);
          if (data.pendingDates) setSuggestedDates(data.pendingDates);
        }
      } catch (err) {
        console.error('Failed to load pending summary:', err);
      }
    }
    loadPendingSummary();
  }, []);

  // Handle return image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image exceeds maximum 10MB file size limit.');
      return;
    }

    setReturnImageFile(file);
    setReturnImagePreview(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  // Add another phone row
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}`,
        model_name: '',
        pickup_date: '',
        repair_reason: '',
        status: 'empty',
      },
    ]);
  };

  // Remove phone row
  const removeRow = (rowId: string) => {
    if (rows.length <= 1) {
      setErrorMessage('At least one phone must be included in the return batch.');
      return;
    }
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  // Auto-fetch reason when Model Name or Calendar Date changes!
  const handleFieldChange = async (
    rowId: string,
    field: 'model_name' | 'pickup_date',
    value: string
  ) => {
    setErrorMessage(null);

    // Update row state immediately
    const updatedRows = rows.map((r) => {
      if (r.rowId === rowId) {
        return {
          ...r,
          [field]: value,
          // Reset reason if inputs change
          ...(field === 'model_name' && !value ? { repair_reason: '', status: 'empty' as const } : {}),
        };
      }
      return r;
    });
    setRows(updatedRows);

    const currentRow = updatedRows.find((r) => r.rowId === rowId);
    if (!currentRow) return;

    const currentModel = currentRow.model_name.trim();
    const currentDate = currentRow.pickup_date;

    // When BOTH Model Name and Calendar Date are provided, automatically fetch the reason!
    if (currentModel && currentDate) {
      // Mark as searching
      setRows((prev) =>
        prev.map((r) => (r.rowId === rowId ? { ...r, status: 'searching' as const } : r))
      );

      try {
        const params = new URLSearchParams({
          model_name: currentModel,
          pickup_date: currentDate,
        });

        const res = await fetch(`/api/search-pending?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const match = data.matches?.[0];

          if (match) {
            // MATCH FOUND: Auto-populate Reason and internal Item ID!
            setRows((prev) =>
              prev.map((r) =>
                r.rowId === rowId
                  ? {
                      ...r,
                      repair_reason: match.repair_reason,
                      itemId: match.id,
                      status: 'found' as const,
                    }
                  : r
              )
            );
          } else {
            // Not found for this combination
            setRows((prev) =>
              prev.map((r) =>
                r.rowId === rowId
                  ? {
                      ...r,
                      repair_reason: '',
                      itemId: undefined,
                      status: 'not_found' as const,
                    }
                  : r
              )
            );
          }
        }
      } catch (err) {
        console.error('Auto-lookup failed:', err);
      }
    } else if (currentModel && !currentDate) {
      // If user typed model, check if we can query pending dates for this model
      try {
        const res = await fetch(`/api/search-pending?model_name=${encodeURIComponent(currentModel)}`);
        if (res.ok) {
          const data = await res.json();
          // If there's only 1 pending date for this model, optionally auto-select or suggest!
          if (data.matches && data.matches.length === 1) {
            const single = data.matches[0];
            setRows((prev) =>
              prev.map((r) =>
                r.rowId === rowId && !r.pickup_date
                  ? {
                      ...r,
                      pickup_date: single.pickup_date,
                      repair_reason: single.repair_reason,
                      itemId: single.id,
                      status: 'found' as const,
                    }
                  : r
              )
            );
          }
        }
      } catch {
        // silent
      }
    }
  };

  // Submit Return Form
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!returnImageFile && !returnImagePreview) {
      setErrorMessage(
        'Mandatory: Please upload a single photo showing all returned phones together.'
      );
      return;
    }

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.model_name.trim()) {
        setErrorMessage(`Phone #${i + 1}: Please enter the Phone Model.`);
        return;
      }
      if (!r.pickup_date) {
        setErrorMessage(
          `Phone #${i + 1} (${r.model_name}): Please select the Original Pickup Date from the calendar.`
        );
        return;
      }
      if (!r.repair_reason.trim()) {
        setErrorMessage(
          `Phone #${i + 1} (${r.model_name}): No pending repair record found on ${formatKolkataDateOnly(
            r.pickup_date
          )}. Please check the model name and date.`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Upload Return Batch Image
      let uploadedImageUrl = returnImagePreview || '';
      if (returnImageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', returnImageFile);
        formData.append('prefix', 'return');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload return image');
        }
        uploadedImageUrl = uploadData.imageUrl;
        setUploadingImage(false);
      }

      // 2. Submit completion
      const payloadItems = rows.map((r) => ({
        model_name: r.model_name.trim(),
        pickup_date: r.pickup_date,
        item_id: r.itemId,
      }));

      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_image_url: uploadedImageUrl,
          items: payloadItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Return completion failed');
      }

      setSuccessData({
        batchId: data.batch.id,
        completedCount: data.completed_items.length,
        completedItems: rows.map((r) => ({
          model_name: r.model_name,
          pickup_date: r.pickup_date,
          repair_reason: r.repair_reason,
        })),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Return completion failed';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleResetForNext = () => {
    setSuccessData(null);
    setReturnImageFile(null);
    setReturnImagePreview(null);
    setRows([
      {
        rowId: `row-${Date.now()}`,
        model_name: '',
        pickup_date: '',
        repair_reason: '',
        status: 'empty',
      },
    ]);
    setErrorMessage(null);
  };

  return (
    <AppLayout allowedRoles={['technician']}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Datalist for Model Autocomplete (Zero ID hassle!) */}
        <datalist id="pending-models-list">
          {suggestedModels.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            <RotateCcw className="w-4 h-4" />
            <span>Technician Return Module</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Return & Repair Completion
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Phone Model aur Original Pickup Date select karte hi Reason apne aap auto-update ho jayega. Koi ID ka jhamela nahi hai.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <p className="font-semibold">Notice</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitReturn} className="space-y-6">
          {/* Card 1: Submission Date & Time (Auto-Recorded) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Return Submission Date & Time (Auto-Recorded)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Actual Completion Date (Asia/Kolkata)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-medium">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{formatKolkataDateOnly(today)}</span>
                  <span className="text-xs text-emerald-600 ml-auto font-sans font-semibold">Today</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Submission Time
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-medium">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>{currentTime} IST</span>
                  <span className="text-xs text-slate-500 ml-auto font-sans">Automatic</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Return Batch Image Upload */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Return Batch Image (Mandatory)</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                1 Single Photo of All Repaired Phones
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Ek photo upload karein jisme saare ready phones ek sath dikh rahe hon.
            </p>

            {returnImagePreview ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl">
                <div className="relative w-36 h-28 bg-slate-900 rounded-lg overflow-hidden border border-emerald-300 shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={returnImagePreview}
                    alt="Return preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setModalImage(returnImagePreview)}
                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    title="View preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-semibold text-slate-800">
                    {returnImageFile?.name || 'Selected return batch photo'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {returnImageFile
                      ? `${(returnImageFile.size / 1024).toFixed(1)} KB`
                      : 'Verified Return Image'}
                  </p>
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                    <label className="cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnImageFile(null);
                        setReturnImagePreview(null);
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Click to upload return batch image
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Shows all repaired phones together (PNG, JPG, WebP)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Card 3: Dynamic Phones List (Model Name + Calendar Date -> Reason Auto Update!) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Phones Being Returned ({rows.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Model Name likhein aur Pickup Date select karein — Reason bagal wale box me apne aap update ho jayega!
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Phone</span>
              </button>
            </div>

            {/* List of Dynamic Phone Rows */}
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.rowId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    row.status === 'found'
                      ? 'bg-emerald-50/30 border-emerald-300'
                      : row.status === 'not_found'
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                    {/* Index Badge */}
                    <div
                      className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        row.status === 'found'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Column 1: Model Name (with auto-suggest datalist) */}
                    <div className="flex-1 w-full lg:w-56">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        1. Phone Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="pending-models-list"
                        placeholder="e.g. iPhone 13 Pro"
                        value={row.model_name}
                        onChange={(e) =>
                          handleFieldChange(row.rowId, 'model_name', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    {/* Column 2: Calendar (Pickup Date picker) */}
                    <div className="w-full lg:w-48">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        2. Pickup Date (Calendar) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        max={today} // Strictly disables future dates
                        value={row.pickup_date}
                        onChange={(e) =>
                          handleFieldChange(row.rowId, 'pickup_date', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Column 3: Auto-Updated Reason Box */}
                    <div className="flex-[1.8] w-full">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                          <span>3. Repair Reason</span>
                          {row.status === 'found' && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Auto-Updated</span>
                            </span>
                          )}
                          {row.status === 'searching' && (
                            <span className="text-[10px] text-amber-700 font-bold inline-flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                              <span>Fetching...</span>
                            </span>
                          )}
                        </label>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={row.repair_reason}
                          placeholder={
                            row.status === 'searching'
                              ? 'Fetching original fault reason...'
                              : row.status === 'not_found'
                              ? 'No pending phone found for this model & date'
                              : 'Select Model & Date to auto-fill reason...'
                          }
                          className={`w-full px-3 py-2 text-sm rounded-lg border font-medium ${
                            row.status === 'found'
                              ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-semibold'
                              : row.status === 'not_found'
                              ? 'bg-amber-50 border-amber-300 text-amber-800 italic'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="lg:pt-5 w-full lg:w-auto flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeRow(row.rowId)}
                        disabled={rows.length <= 1}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                        title="Remove phone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Micro Helper Note */}
                  {row.status === 'found' && (
                    <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1.5 pl-10 font-medium">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>
                        Verified: Handed over on {formatKolkataDateOnly(row.pickup_date)}. Ready to complete and return today!
                      </span>
                    </div>
                  )}
                  {row.status === 'not_found' && (
                    <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1.5 pl-10">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>
                        Check spelling or select the exact pickup date when this {row.model_name || 'phone'} was handed over.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Add Phone Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total phones to complete: <strong className="text-slate-900">{rows.length}</strong>
              </span>
              <button
                type="button"
                onClick={addRow}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add One More Phone to this Return Batch</span>
              </button>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {uploadingImage
                      ? 'Uploading Return Image...'
                      : 'Marking as Completed...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Completed & Submit Return ({rows.length} Phones)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              Phones Successfully Returned!
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Batch <span className="font-mono font-bold text-slate-800">{successData.batchId}</span> registered. {successData.completedCount} phone(s) marked as Completed and moved to Completed Report.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              {successData.completedItems.map((it, idx) => (
                <div key={idx} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{it.model_name}</span>
                    <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-100 px-2 py-0.5 rounded">
                      Completed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Original Pickup: {formatKolkataDateOnly(it.pickup_date)} • Fault: {it.repair_reason}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleResetForNext}
                className="flex-1 py-2.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                + Return More Phones
              </button>
              <button
                onClick={() => router.push('/completed')}
                className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
              >
                View Completed List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {modalImage && (
        <ImageModal
          isOpen={true}
          imageUrl={modalImage}
          title="Return Batch Photo Preview"
          onClose={() => setModalImage(null)}
        />
      )}
    </AppLayout>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { getKolkataDateString, formatKolkataDateOnly, getKolkataTimeString } from '@/lib/timezone';
import { ImageModal } from '@/components/ImageModal';
import { RepairItem } from '@/lib/types';

interface ReturnRow {
  rowId: string;
  pickup_date: string; // Step 1: Pickup Date
  itemId: string;      // Step 2: Selected Repair Item ID
  model_name: string;  // Selected Model Name
  repair_reason: string; // Step 3: Auto-populated Reason
  status: 'empty' | 'date_selected' | 'found';
}

export default function ReturnPage() {
  const router = useRouter();
  const [today, setToday] = useState('2026-11-06');
  const [currentTime, setCurrentTime] = useState('12:00:00');

  // Mandatory return batch photo (1 photo for all returned phones)
  const [returnImageFile, setReturnImageFile] = useState<File | null>(null);
  const [returnImagePreview, setReturnImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // All currently pending phones in the system
  const [allPendingItems, setAllPendingItems] = useState<RepairItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Dynamic rows of phones being returned
  const [rows, setRows] = useState<ReturnRow[]>([
    {
      rowId: 'row-1',
      pickup_date: '',
      itemId: '',
      model_name: '',
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

  // Load all currently pending items and dates from server
  const loadPendingItems = async () => {
    setLoadingPending(true);
    try {
      const res = await fetch('/api/search-pending');
      if (res.ok) {
        const data = await res.json();
        setAllPendingItems(data.matches || []);
      }
    } catch (err) {
      console.error('Failed to load pending phones:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    const curDate = getKolkataDateString();
    setToday(curDate);
    setCurrentTime(getKolkataTimeString());
    loadPendingItems();
  }, []);

  // Compute distinct pickup dates that actually have pending phones
  const pendingDatesSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allPendingItems) {
      if (item.pickup_date) {
        map.set(item.pickup_date, (map.get(item.pickup_date) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({
        date,
        count,
        label: `${formatKolkataDateOnly(date)} (${count} phone${count > 1 ? 's' : ''} pending)`,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allPendingItems]);

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

  // Add another phone row (conveniently pre-populates previous row's date if set)
  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    const defaultDate = lastRow?.pickup_date || (pendingDatesSummary[0]?.date ?? '');

    setRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        pickup_date: defaultDate,
        itemId: '',
        model_name: '',
        repair_reason: '',
        status: defaultDate ? 'date_selected' : 'empty',
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

  // Step 1: Handle Pickup Date change (via dropdown or calendar)
  const handleDateChange = (rowId: string, newDate: string) => {
    setErrorMessage(null);
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId === rowId) {
          // If date changed, reset the selected item and reason to avoid stale mismatches
          const sameDate = r.pickup_date === newDate;
          return {
            ...r,
            pickup_date: newDate,
            itemId: sameDate ? r.itemId : '',
            model_name: sameDate ? r.model_name : '',
            repair_reason: sameDate ? r.repair_reason : '',
            status: newDate ? (sameDate && r.itemId ? 'found' : 'date_selected') : 'empty',
          };
        }
        return r;
      })
    );
  };

  // Step 2: Handle Phone Item selection (from date-filtered dropdown)
  const handleItemSelect = (rowId: string, selectedItemId: string) => {
    setErrorMessage(null);
    if (!selectedItemId) {
      setRows((prev) =>
        prev.map((r) =>
          r.rowId === rowId
            ? {
                ...r,
                itemId: '',
                model_name: '',
                repair_reason: '',
                status: r.pickup_date ? 'date_selected' : 'empty',
              }
            : r
        )
      );
      return;
    }

    const matchedItem = allPendingItems.find((it) => it.id === selectedItemId);
    if (!matchedItem) return;

    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              itemId: matchedItem.id,
              model_name: matchedItem.model_name,
              repair_reason: matchedItem.repair_reason,
              pickup_date: matchedItem.pickup_date,
              status: 'found',
            }
          : r
      )
    );
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
      if (!r.pickup_date) {
        setErrorMessage(
          `Phone #${i + 1}: Please select the Original Pickup Date from dropdown or calendar.`
        );
        return;
      }
      if (!r.itemId || !r.model_name) {
        setErrorMessage(
          `Phone #${i + 1}: Please select the Phone Model to return from the ${formatKolkataDateOnly(r.pickup_date)} dropdown.`
        );
        return;
      }
      if (!r.repair_reason.trim()) {
        setErrorMessage(
          `Phone #${i + 1} (${r.model_name}): No valid repair reason found. Please select a valid phone item.`
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

      // Reload fresh pending items
      loadPendingItems();
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
        pickup_date: pendingDatesSummary[0]?.date || '',
        itemId: '',
        model_name: '',
        repair_reason: '',
        status: pendingDatesSummary[0]?.date ? 'date_selected' : 'empty',
      },
    ]);
    setErrorMessage(null);
    loadPendingItems();
  };

  return (
    <AppLayout allowedRoles={['technician']}>
      <div className="max-w-4xl mx-auto space-y-6">
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
            Pehle <strong>Original Pickup Date</strong> chunein (Dropdown ya Calendar se), fir uss date ke pending phones dropdown se select karein. Reason apne aap fill ho jayega.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-fadeIn">
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
                  <p className="text-xs font-bold text-emerald-900">Return Proof Image Attached</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {returnImageFile?.name || 'Uploaded batch image'}
                  </p>
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => setModalImage(returnImagePreview)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      View Full Size
                    </button>
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

          {/* Card 3: Date-First Dynamic Phones List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Phones Being Returned ({rows.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  1. Pickup Date chunein $\to$ 2. Model Dropdown me ussi date ke pending phone aayenge $\to$ 3. Reason auto-fill hoga.
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
            <div className="space-y-4">
              {rows.map((row, index) => {
                // Find all item IDs already selected in other rows
                const otherSelectedIds = rows
                  .filter((r) => r.rowId !== row.rowId && r.itemId)
                  .map((r) => r.itemId);

                // Filter pending phones for this row's chosen pickup_date, excluding already chosen items
                const availablePhonesForDate = row.pickup_date
                  ? allPendingItems.filter(
                      (item) =>
                        item.pickup_date === row.pickup_date &&
                        (!otherSelectedIds.includes(item.id) || item.id === row.itemId)
                    )
                  : [];

                return (
                  <div
                    key={row.rowId}
                    className={`p-4 rounded-xl border transition-all ${
                      row.status === 'found'
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                        : row.status === 'date_selected'
                        ? 'bg-blue-50/20 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                            row.status === 'found'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Phone #{index + 1}
                        </span>
                        {row.status === 'found' && (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Ready to Return</span>
                          </span>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => removeRow(row.rowId)}
                        disabled={rows.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                        title="Remove phone from batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                      {/* STEP 1: Original Pickup Date (Dual Input: Dropdown + Calendar) */}
                      <div className="md:col-span-5 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700">
                          1. Original Pickup Date <span className="text-red-500">*</span>
                        </label>

                        {/* Quick Date Dropdown */}
                        <div className="relative">
                          <select
                            value={row.pickup_date}
                            onChange={(e) => handleDateChange(row.rowId, e.target.value)}
                            className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-medium text-slate-800 appearance-none cursor-pointer"
                          >
                            <option value="">-- Select from Pending Dates --</option>
                            {pendingDatesSummary.map((d) => (
                              <option key={d.date} value={d.date}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Calendar Picker Alternative */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-600 shrink-0">
                            Or Calendar:
                          </span>
                          <input
                            type="date"
                            max={today}
                            value={row.pickup_date}
                            onChange={(e) => handleDateChange(row.rowId, e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-emerald-500 font-mono text-slate-700 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* STEP 2: Phone Model Dropdown (Filtered Strictly by Step 1 Date) */}
                      <div className="md:col-span-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            2. Phone Model <span className="text-red-500">*</span>
                          </label>
                          {row.pickup_date && (
                            <span className="text-[10px] text-slate-700 font-semibold">
                              {availablePhonesForDate.length} available
                            </span>
                          )}
                        </div>

                        {!row.pickup_date ? (
                          <div className="px-3 py-2 text-xs text-slate-400 bg-slate-100 border border-dashed border-slate-300 rounded-lg italic">
                            👆 Pehle Pickup Date chunein
                          </div>
                        ) : availablePhonesForDate.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                            Is date ke saare phones chune ja chuke hain
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={row.itemId}
                              onChange={(e) => handleItemSelect(row.rowId, e.target.value)}
                              className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-emerald-400 rounded-lg focus:outline-none focus:border-emerald-600 font-semibold text-slate-900 appearance-none cursor-pointer shadow-xs"
                            >
                              <option value="">-- Choose Phone to Return --</option>
                              {availablePhonesForDate.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.model_name} — ({item.repair_reason})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                      </div>

                      {/* STEP 3: Repair Reason (Auto-Updated from Live Database) */}
                      <div className="md:col-span-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            3. Repair Reason
                          </label>
                          {row.status === 'found' && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                              ✓ Auto-Updated
                            </span>
                          )}
                        </div>

                        <input
                          type="text"
                          readOnly
                          value={row.repair_reason}
                          placeholder={
                            !row.pickup_date
                              ? 'Waiting for date...'
                              : !row.itemId
                              ? 'Choose model above...'
                              : 'Auto-updating...'
                          }
                          className={`w-full px-3 py-2 text-xs rounded-lg border font-medium ${
                            row.status === 'found'
                              ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 font-semibold'
                              : 'bg-slate-100 border-slate-200 text-slate-400 italic'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Verification Helper Bar */}
                    {row.status === 'found' && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Verified: Handed over on <strong>{formatKolkataDateOnly(row.pickup_date)}</strong>. Fault: <em>{row.repair_reason}</em>
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                          {row.itemId}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Phone Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total phones to complete in this batch: <strong className="text-slate-900">{rows.filter((r) => r.itemId).length} / {rows.length}</strong>
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
                  <span>Mark as Completed & Submit Return ({rows.filter((r) => r.itemId).length} Phones)</span>
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

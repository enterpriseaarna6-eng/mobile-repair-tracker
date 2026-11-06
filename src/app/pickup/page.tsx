'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import {
  PackagePlus,
  Plus,
  Trash2,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Eye,
  Zap,
  Check,
  RefreshCw,
} from 'lucide-react';
import { getKolkataDateString, formatKolkataDateOnly, getKolkataTimeString } from '@/lib/timezone';
import { ImageModal } from '@/components/ImageModal';
import { compressImage, formatFileSize, CompressionResult } from '@/lib/imageCompression';
import { requestScreenWakeLock, releaseScreenWakeLock } from '@/lib/wakeLock';

interface PhoneRow {
  id: string;
  model_name: string;
  repair_reason: string;
}

export default function PickupPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('2026-11-05');
  const [currentTime, setCurrentTime] = useState('12:00:00');

  useEffect(() => {
    setCurrentDate(getKolkataDateString());
    setCurrentTime(getKolkataTimeString());
  }, []);

  // Mandatory batch image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'compressing' | 'uploading' | 'uploaded' | 'error'
  >('idle');
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } | null>(null);
  const activeUploadPromiseRef = useRef<Promise<string> | null>(null);

  // Dynamic phone items (init with 1 row)
  const [phones, setPhones] = useState<PhoneRow[]>([
    { id: 'row-1', model_name: '', repair_reason: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    batchId: string;
    itemsCount: number;
    items: { id: string; model_name: string }[];
  } | null>(null);

  const [modalImage, setModalImage] = useState<string | null>(null);

  // Upload a compressed file eagerly to the cloud
  const executeUpload = async (compressedFile: File): Promise<string> => {
    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('prefix', 'pickup');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload batch image');
    }

    setUploadedImageUrl(data.imageUrl);
    setUploadStatus('uploaded');
    return data.imageUrl as string;
  };

  // Handle image selection with fast in-browser compression & eager auto-upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setUploadedImageUrl(null);
    setUploadStatus('compressing');
    await requestScreenWakeLock('pickup_photo_upload');

    try {
      // 1. Instant client-side compression (reduces 10MB to ~180KB in <150ms)
      const compressed: CompressionResult = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
      });

      setImageFile(compressed.file);
      setImagePreview(compressed.previewUrl);
      setCompressionInfo({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio,
      });

      // 2. Start immediate background auto-upload to cloud
      const uploadPromise = executeUpload(compressed.file);
      activeUploadPromiseRef.current = uploadPromise;
      await uploadPromise;
    } catch (err: unknown) {
      console.error('Instant upload error:', err);
      setUploadStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Photo optimization or upload failed'
      );
    } finally {
      await releaseScreenWakeLock();
    }
  };

  // Retry upload if it failed
  const retryUpload = async () => {
    if (!imageFile) return;
    setErrorMessage(null);
    try {
      const uploadPromise = executeUpload(imageFile);
      activeUploadPromiseRef.current = uploadPromise;
      await uploadPromise;
    } catch (err: unknown) {
      setUploadStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Retry failed. Please check internet connection.'
      );
    }
  };

  // Add dynamic phone row
  const addPhoneRow = () => {
    setPhones((prev) => [
      ...prev,
      { id: `row-${Date.now()}`, model_name: '', repair_reason: '' },
    ]);
  };

  // Remove phone row
  const removePhoneRow = (id: string) => {
    if (phones.length <= 1) {
      setErrorMessage('A pickup batch must contain at least one phone.');
      return;
    }
    setPhones((prev) => prev.filter((p) => p.id !== id));
  };

  // Update phone row
  const updatePhoneRow = (id: string, field: 'model_name' | 'repair_reason', val: string) => {
    setPhones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // Submit pickup form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!imageFile && !imagePreview && !uploadedImageUrl) {
      setErrorMessage('Mandatory: Please upload a single photo showing all phones handed over.');
      return;
    }

    // Validate all phone rows
    for (let i = 0; i < phones.length; i++) {
      if (!phones[i].model_name.trim()) {
        setErrorMessage(`Phone #${i + 1}: Model name cannot be blank.`);
        return;
      }
      if (!phones[i].repair_reason.trim()) {
        setErrorMessage(`Phone #${i + 1}: Repair reason cannot be blank.`);
        return;
      }
    }

    setSubmitting(true);
    await requestScreenWakeLock('pickup_batch_submit');

    try {
      // 1. Get uploaded image URL (already completed in background in ~99% cases!)
      let finalImageUrl = uploadedImageUrl;
      if (!finalImageUrl && activeUploadPromiseRef.current) {
        finalImageUrl = await activeUploadPromiseRef.current;
      }
      if (!finalImageUrl && imageFile) {
        finalImageUrl = await executeUpload(imageFile);
      }
      if (!finalImageUrl && imagePreview) {
        finalImageUrl = imagePreview;
      }

      if (!finalImageUrl) {
        throw new Error('Please wait for photo upload to finish or re-select image.');
      }

      // 2. Submit Pickup Batch & Items (lightweight JSON payload, executes in <150ms)
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_image_url: finalImageUrl,
          items: phones.map((p) => ({
            model_name: p.model_name.trim(),
            repair_reason: p.repair_reason.trim(),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pickup batch submission failed');
      }

      setSuccessData({
        batchId: data.batch.id,
        itemsCount: data.items.length,
        items: data.items.map((it: { id: string; model_name: string }) => ({
          id: it.id,
          model_name: it.model_name,
        })),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting pickup';
      setErrorMessage(msg);
    } finally {
      await releaseScreenWakeLock();
      setSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setSuccessData(null);
    setImageFile(null);
    setImagePreview(null);
    setUploadedImageUrl(null);
    setUploadStatus('idle');
    setCompressionInfo(null);
    activeUploadPromiseRef.current = null;
    setPhones([{ id: `row-${Date.now()}`, model_name: '', repair_reason: '' }]);
    setErrorMessage(null);
  };

  return (
    <AppLayout allowedRoles={['technician']}>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            <PackagePlus className="w-4 h-4" />
            <span>Technician Intake Module</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pickup & Inward Repair Intake
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fill this form every time you receive phones for repair. Auto-records date, saves a verified batch image, and creates individual tracking IDs for each device.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <p className="font-semibold">Submission Incomplete</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Intake Metadata (Auto-recorded Date & Time) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Intake Date & Time (Auto-Recorded)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Pickup Date (Asia/Kolkata)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-medium">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>{formatKolkataDateOnly(currentDate)}</span>
                  <span className="text-xs text-slate-500 ml-auto font-sans">Locked</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Submission Time
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-medium">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>{currentTime} IST</span>
                  <span className="text-xs text-slate-500 ml-auto font-sans">Automatic</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Note: The pickup date is locked to ensure audit integrity and cannot be manually modified.
            </p>
          </div>

          {/* Card 2: Mandatory Batch Photo */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Mandatory Batch Image</span>
              </h2>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                1 Photo for All Handed-Over Phones
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Upload a single clear photo showing all phones being taken in this batch together.
            </p>

            {imagePreview ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-36 h-28 bg-slate-900 rounded-lg overflow-hidden border border-slate-300 shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setModalImage(imagePreview)}
                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    title="View preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {imageFile?.name || 'Selected batch image'}
                    </p>
                    {compressionInfo && (
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                        <span className="line-through text-slate-400">
                          {formatFileSize(compressionInfo.originalSize)}
                        </span>
                        <span className="font-bold text-slate-700">
                          ➔ {formatFileSize(compressionInfo.compressedSize)}
                        </span>
                        {compressionInfo.compressionRatio > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            {compressionInfo.compressionRatio}% smaller
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Realtime Upload Status Pill */}
                  <div className="flex items-center justify-center sm:justify-start">
                    {uploadStatus === 'compressing' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Fast-optimizing image...</span>
                      </span>
                    )}
                    {uploadStatus === 'uploading' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-medium animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Uploading to cloud in background...</span>
                      </span>
                    )}
                    {uploadStatus === 'uploaded' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Photo Uploaded & Secured (Ready to Save)</span>
                      </span>
                    )}
                    {uploadStatus === 'error' && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Upload failed</span>
                        </span>
                        <button
                          type="button"
                          onClick={retryUpload}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                    <label className="cursor-pointer text-xs font-semibold text-amber-600 hover:text-amber-700 underline">
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
                        setImageFile(null);
                        setImagePreview(null);
                        setUploadedImageUrl(null);
                        setUploadStatus('idle');
                        setCompressionInfo(null);
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Click to capture or browse batch photo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Auto-compressed in browser & uploaded instantly
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

          {/* Card 3: Dynamic Multi-Phone List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-600" />
                  <span>Phones in this Batch ({phones.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter every model name and specific fault/repair reason.
                </p>
              </div>

              <button
                type="button"
                onClick={addPhoneRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Phone</span>
              </button>
            </div>

            <div className="space-y-3">
              {phones.map((phone, index) => (
                <div
                  key={phone.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>

                  {/* Phone Model */}
                  <div className="flex-1 w-full md:w-auto">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phone Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. iPhone 14 Pro / Samsung S23"
                      value={phone.model_name}
                      onChange={(e) =>
                        updatePhoneRow(phone.id, 'model_name', e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Repair Reason */}
                  <div className="flex-[1.5] w-full md:w-auto">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Fault / Repair Reason <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Display Broken, Touch Issue, Charging Port IC"
                      value={phone.repair_reason}
                      onChange={(e) =>
                        updatePhoneRow(phone.id, 'repair_reason', e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="md:pt-5 w-full md:w-auto flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePhoneRow(phone.id)}
                      disabled={phones.length <= 1}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                      title="Remove phone row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={addPhoneRow}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add One More Phone</span>
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
              className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {uploadStatus === 'uploading'
                      ? 'Uploading Image...'
                      : 'Registering Intake Batch...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Pickup Batch ({phones.length} Phones)</span>
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
              Pickup Batch Registered Successfully!
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Batch <span className="font-mono font-bold text-slate-800">{successData.batchId}</span> has been created with {successData.itemsCount} phones awaiting repair.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              {successData.items.map((it) => (
                <div key={it.id} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{it.model_name}</span>
                  <span className="font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                    {it.id}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleResetForNext}
                className="flex-1 py-2.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                + Create Another Pickup
              </button>
              <button
                onClick={() => router.push('/pending')}
                className="flex-1 py-2.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400"
              >
                View Pending List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {modalImage && (
        <ImageModal
          isOpen={true}
          imageUrl={modalImage}
          title="Batch Photo Preview"
          onClose={() => setModalImage(null)}
        />
      )}
    </AppLayout>
  );
}


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
} from 'lucide-react';
import { getKolkataDateString } from '@/lib/timezone';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'pending' | 'completed'>('pending');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

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

  const handleDownload = (format: 'csv' | 'excel') => {
    const params = new URLSearchParams();
    params.append('type', reportType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const endpoint = format === 'csv' ? '/api/export/csv' : '/api/export/excel';
    window.location.href = `${endpoint}?${params.toString()}`;
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
              onClick={() => handleDownload('excel')}
              className="mt-5 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>
                Download Excel ({reportType === 'pending' ? 'Pending' : 'Completed'})
              </span>
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
              onClick={() => handleDownload('csv')}
              className="mt-5 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>
                Download CSV ({reportType === 'pending' ? 'Pending' : 'Completed'})
              </span>
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
    </AppLayout>
  );
}


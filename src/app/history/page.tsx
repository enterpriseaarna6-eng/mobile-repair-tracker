'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RepairHistoryEntry } from '@/lib/types';
import { formatKolkataDateTime } from '@/lib/timezone';
import { History, ShieldCheck, Clock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<RepairHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <History className="w-4 h-4" />
            <span>Audit Trail & Activity Log</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Repair History & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable log of all intake submissions, state changes, and completion returns.
          </p>
        </div>

        {/* History Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-7 h-7 text-amber-500 animate-spin mb-2" />
              <p className="text-xs">Loading audit trail...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Event Date (IST)</th>
                    <th className="py-3 px-4">Repair Item ID</th>
                    <th className="py-3 px-4">Device Model</th>
                    <th className="py-3 px-4 text-center">Status Shift</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatKolkataDateTime(h.event_date)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {h.repair_item_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {h.model_name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded uppercase text-[10px] ${
                              h.previous_status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {h.previous_status}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span
                            className={`px-2 py-0.5 rounded uppercase text-[10px] ${
                              h.new_status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {h.new_status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {h.performed_by}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {h.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
            <span>Showing {history.length} audit entries</span>
            <span>All timestamps in Asia/Kolkata</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}


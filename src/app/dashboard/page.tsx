'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { DashboardStats, UserProfile } from '@/lib/types';
import { ImageModal } from '@/components/ImageModal';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PackagePlus,
  RotateCcw,
  FileSpreadsheet,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatKolkataDateOnly } from '@/lib/timezone';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AppLayout>
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold mb-2 uppercase tracking-wide border shadow-xs">
            {isAdmin ? (
              <span className="bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1.5 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Admin View ({user?.full_name || 'Admin'})
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-900 border-emerald-300 flex items-center gap-1.5 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Technician View ({user?.full_name || 'Rohan'})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? `Admin Command Center` : `Technician Repair Workbench`}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Real-time stock auditing, all-time figures, and downloadable Excel/CSV reporting.'
              : 'Record new pickup batches, search models to auto-fill return reasons, and manage pending stock.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Download Excel / CSV Reports</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/pickup"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm transition-colors"
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ Pickup Intake</span>
              </Link>
              <Link
                href="/return"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return / Complete</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3 Main Statistic KPI Cards (STOCK, COMPLETED, PENDING) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* STOCK CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Stock Handed Over
            </span>
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
              {loading ? '-' : stats?.stock ?? 0}
            </span>
            <span className="text-xs font-medium text-slate-500">All-Time Units</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Stock = Completed + Pending</span>
            </span>
            <span className="font-semibold text-slate-700">
              {stats ? `${stats.completed} + ${stats.pending}` : '-'}
            </span>
          </div>
        </div>

        {/* COMPLETED CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Completed Repairs
            </span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-emerald-700 tracking-tight font-mono">
              {loading ? '-' : stats?.completed ?? 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Successfully Repaired</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Repaired & Handed Back</span>
            <span className="font-semibold text-emerald-600">
              {stats && stats.stock > 0
                ? `${Math.round((stats.completed / stats.stock) * 100)}% Rate`
                : '0%'}
            </span>
          </div>
        </div>

        {/* PENDING CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pending Repairs
            </span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-amber-600 tracking-tight font-mono">
              {loading ? '-' : stats?.pending ?? 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Awaiting Service</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active Work on Bench</span>
            <Link
              href="/pending"
              className="font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
            >
              <span>View List</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Today's Daily Velocity Strip */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 mb-8 shadow-sm border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Today&apos;s Activity Overview</h3>
            <p className="text-xs text-slate-400">Recorded for current date in Asia/Kolkata timezone</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Today&apos;s Pickups:</span>
            <span className="font-bold text-amber-400 font-mono text-base bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
              {stats?.today_pickup_count ?? 0}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Today&apos;s Completed:</span>
            <span className="font-bold text-emerald-400 font-mono text-base bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
              {stats?.today_completed_count ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Batches Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pickup Batches */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-800">Recent Pickup Batches</h2>
            </div>
            <Link
              href="/pending"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>See All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {stats?.recent_pickup_batches && stats.recent_pickup_batches.length > 0 ? (
              stats.recent_pickup_batches.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setModalImage({
                          url: b.pickup_image_url,
                          title: `Pickup Batch: ${b.id}`,
                        })
                      }
                      className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative group shrink-0"
                      title="Click to view full batch photo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.pickup_image_url}
                        alt={b.id}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-900">{b.id}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatKolkataDateOnly(b.pickup_date)}</span>
                        {b.pickup_time && <span>• {b.pickup_time}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {b.item_count} {b.item_count === 1 ? 'Phone' : 'Phones'}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{b.technician_name}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No pickup batches recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Completed Batches */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">Recent Completed Batches</h2>
            </div>
            <Link
              href="/completed"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>See All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {stats?.recent_completed_batches && stats.recent_completed_batches.length > 0 ? (
              stats.recent_completed_batches.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setModalImage({
                          url: b.return_image_url,
                          title: `Return Batch: ${b.id}`,
                        })
                      }
                      className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative group shrink-0"
                      title="Click to view full batch return photo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.return_image_url}
                        alt={b.id}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-900">{b.id}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatKolkataDateOnly(b.return_date)}</span>
                        {b.return_time && <span>• {b.return_time}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.item_count} {b.item_count === 1 ? 'Phone' : 'Phones'}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{b.technician_name}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No completed batches recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
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


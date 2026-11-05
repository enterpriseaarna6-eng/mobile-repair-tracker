'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Lock, Mail, ShieldAlert, ArrowRight, Loader2, CheckCircle2, Download, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Card */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-4 shadow-lg shadow-amber-500/10">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">RepairTrack Ops</h1>
          <p className="text-sm text-slate-400 mt-1">Mobile Repair Tracking & Inventory Management</p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign In to Your Workspace</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized access only. Exactly 4 registered accounts provisioned.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email / Name / Mobile / User ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. sangeet, ayush, ankit, rohan or 9330929105"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Quick 1-Click Account Select
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('sangeet@repairtrack.com', 'Ank933967@')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors group"
              >
                <div className="flex items-center justify-between font-semibold text-amber-400">
                  <span>Admin 1</span>
                  <span className="text-[10px] text-slate-300 font-bold">SANGEET</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">sangeet@...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ayush@repairtrack.com', 'Ank933967@')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors group"
              >
                <div className="flex items-center justify-between font-semibold text-amber-400">
                  <span>Admin 2</span>
                  <span className="text-[10px] text-slate-300 font-bold">AYUSH</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">ayush@...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ankit@repairtrack.com', 'Ank933967@')}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors group"
              >
                <div className="flex items-center justify-between font-semibold text-amber-400">
                  <span>Admin 3</span>
                  <span className="text-[10px] text-slate-300 font-bold">ANKIT</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">ankit@...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rohan@repairtrack.com', '9330929105')}
                className="p-2 text-left bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-800/50 rounded-md transition-colors group"
              >
                <div className="flex items-center justify-between font-semibold text-emerald-400">
                  <span>Technician</span>
                  <span className="text-[10px] text-emerald-300 font-bold">ROHAN</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">rohan / 9330929105</div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile APK Download Banner */}
        <div className="mt-4 p-4 bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-600/40 rounded-xl flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">RepairTrack Android APK</p>
              <p className="text-[11px] text-emerald-300/80">Direct mobile installer (v1.0.4 • 3.8 MB)</p>
            </div>
          </div>
          <a
            href="https://github.com/enterpriseaarna6-eng/mobile-repair-tracker/releases/download/v1.0.4/app-debug.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download APK</span>
          </a>
        </div>

        {/* Security notice */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Asia/Kolkata IST Timezone • Encrypted HTTP-Only Sessions • Supabase RLS Guard
        </p>
      </div>
    </div>
  );
}


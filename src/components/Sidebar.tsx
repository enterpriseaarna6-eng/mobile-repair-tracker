'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PackagePlus,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  History,
  LogOut,
  Wrench,
  ShieldCheck,
  User,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface SidebarProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const isAdmin = user?.role === 'admin';

  const adminNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pending to Repair', href: '/pending', icon: Clock },
    { name: 'Completed Repairs', href: '/completed', icon: CheckCircle2 },
    { name: 'Repair Audit Log', href: '/history', icon: History },
  ];

  const techNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pickup Intake', href: '/pickup', icon: PackagePlus },
    { name: 'Pending Repairs', href: '/pending', icon: Clock },
    { name: 'Return / Completion', href: '/return', icon: CheckCircle2 },
    { name: 'Repair History', href: '/history', icon: History },
  ];

  const currentNav = isAdmin ? adminNav : techNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              RepairTrack <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">OPS</span>
            </h1>
            <p className="text-xs text-slate-400">Mobile Inventory Tracking</p>
          </div>
        </div>

        {/* User Role Indicator Card */}
        <div className="px-4 py-3 mx-4 mt-4 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 shrink-0 font-bold text-sm">
            {isAdmin ? <ShieldCheck className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Loading...'}</p>
            <span
              className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                isAdmin
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isAdmin ? 'Admin View' : 'Technician'}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAdmin ? 'ADMINISTRATION' : 'TECHNICIAN WORKFLOW'}
          </div>

          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-slate-400 transition-colors rounded-md hover:text-red-400 hover:bg-red-500/10 border border-slate-700/60"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}


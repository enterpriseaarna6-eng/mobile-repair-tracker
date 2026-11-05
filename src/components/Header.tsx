'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Plus, Calendar, ShieldCheck, User } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { formatKolkataDateOnly, getKolkataDateString } from '@/lib/timezone';

interface HeaderProps {
  user: UserProfile | null;
  onOpenSidebar: () => void;
}

export function Header({ user, onOpenSidebar }: HeaderProps) {
  const [formattedDate, setFormattedDate] = useState('Today');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const cur = getKolkataDateString();
    setFormattedDate(formatKolkataDateOnly(cur));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-slate-600 rounded-md lg:hidden hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>{formattedDate}</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded uppercase">
            IST
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Action Button for Technician */}
        {!isAdmin && (
          <Link
            href="/pickup"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Pickup</span>
          </Link>
        )}

        {/* User Role Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.full_name || 'Loading...'}
            </p>
            <p className="text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              isAdmin
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </header>
  );
}

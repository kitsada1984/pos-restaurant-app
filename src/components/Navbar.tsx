'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  QrCode,
  Settings,
  Volume2,
  VolumeX,
  Store,
  ExternalLink,
} from 'lucide-react';
import { playOrderChime } from '@/lib/sound';

export default function Navbar() {
  const pathname = usePathname();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [storeName, setStoreName] = useState('ร้านอาหารตามสั่ง');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.storeName) setStoreName(data.storeName);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: '/pos', label: 'ผังโต๊ะ & แคชเชียร์', icon: LayoutGrid },
    { href: '/kitchen', label: 'ห้องครัว (KDS)', icon: ChefHat },
    { href: '/admin/menu', label: 'เมนู & ของหมด', icon: UtensilsCrossed },
    { href: '/admin/reports', label: 'ยอดขาย & ปิดกะ', icon: BarChart3 },
    { href: '/admin/qr-codes', label: 'พิมพ์ QR โต๊ะ', icon: QrCode },
    { href: '/admin/settings', label: 'ตั้งค่าร้าน', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo & Store Name (Single Line) */}
          <Link href="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight whitespace-nowrap">
                  {storeName}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700 whitespace-nowrap">
                  POS PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">
                ระบบจัดการร้านอาหาร & สแกนสั่งที่โต๊ะ
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items (Strictly Single Line, whitespace-nowrap) */}
          <nav className="hidden xl:flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 text-xs font-bold whitespace-nowrap flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs (Strictly Single Line) */}
          <div className="flex items-center space-x-2.5 flex-shrink-0 whitespace-nowrap">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderChime();
              }}
              title={soundEnabled ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือน'}
              className={`p-2.5 rounded-xl text-xs transition-all border flex-shrink-0 ${
                soundEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Customer Table Link */}
            <Link
              href="/table/1"
              target="_blank"
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all whitespace-nowrap flex-shrink-0"
            >
              <span className="whitespace-nowrap">ทดลองสั่ง (โต๊ะ 1)</span>
              <ExternalLink className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* Medium and Mobile Horizontal Scrolling Submenu */}
        <div className="xl:hidden flex items-center space-x-1.5 overflow-x-auto py-2.5 border-t border-slate-100 scrollbar-none text-xs whitespace-nowrap">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

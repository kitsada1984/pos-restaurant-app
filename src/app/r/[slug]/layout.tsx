'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
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
  ShieldCheck,
  User,
} from 'lucide-react';
import { playOrderChime } from '@/lib/sound';

export default function TenantStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = (params?.slug as string) || 'lung-pa';

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [storeInfo, setStoreInfo] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setStoreInfo(data);
      })
      .catch(() => {});
  }, [slug]);

  const navItems = [
    { href: `/r/${slug}/pos`, label: 'ผังโต๊ะ & POS', icon: LayoutGrid },
    { href: `/r/${slug}/kitchen`, label: 'ห้องครัว (KDS)', icon: ChefHat },
    { href: `/r/${slug}/admin/tables`, label: 'จัดการโต๊ะ', icon: LayoutGrid },
    { href: `/r/${slug}/admin/menu`, label: 'เมนู & ของหมด', icon: UtensilsCrossed },
    { href: `/r/${slug}/admin/reports`, label: 'ยอดขาย & ปิดกะ', icon: BarChart3 },
    { href: `/r/${slug}/admin/qr-codes`, label: 'พิมพ์ QR โต๊ะ', icon: QrCode },
    { href: `/r/${slug}/admin/settings`, label: 'ตั้งค่าร้าน', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-orange-500 selection:text-white">
      <header className="sticky top-0 z-40 glass-header no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Store Brand & Slug */}
            <Link href={`/r/${slug}/pos`} className="flex items-center space-x-3 group flex-shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight whitespace-nowrap">
                    {storeInfo?.storeName || 'ร้านอาหาร'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700 whitespace-nowrap">
                    POS
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">
                  /r/{slug}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 text-xs font-bold whitespace-nowrap flex-shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/r/${slug}` && pathname.startsWith(item.href));

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

            {/* Actions & Links */}
            <div className="flex items-center space-x-2.5 flex-shrink-0 whitespace-nowrap">
              {/* Sound toggle */}
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

              {/* Test table ordering link */}
              <Link
                href={`/r/${slug}/table/1`}
                target="_blank"
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all whitespace-nowrap flex-shrink-0"
              >
                <span className="whitespace-nowrap">ทดลองสั่ง (โต๊ะ 1)</span>
                <ExternalLink className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              </Link>

              {/* Owner Hub link */}
              <Link
                href="/store/dashboard"
                className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-all flex items-center"
                title="แดชบอร์ดเจ้าของร้าน"
              >
                <User className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Mobile sub menu */}
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

      {/* Tenant Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

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
  User,
  Package,
  Gift,
  MoreHorizontal,
  X,
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setStoreInfo(data);
      })
      .catch(() => {});
  }, [slug]);

  // Close more menu on route change
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

  // If the user is on the customer table ordering page (/r/[slug]/table/[id]),
  // DO NOT show any staff/admin navigation bar at all!
  const isCustomerTableRoute = pathname.includes('/table/');
  if (isCustomerTableRoute) {
    return <>{children}</>;
  }

  const primaryMobileNav = [
    { href: `/r/${slug}/pos`, label: 'ผังโต๊ะ POS', icon: LayoutGrid },
    { href: `/r/${slug}/kitchen`, label: 'จอครัว KDS', icon: ChefHat },
    { href: `/r/${slug}/admin/menu`, label: 'เมนูอาหาร', icon: UtensilsCrossed },
    { href: `/r/${slug}/admin/inventory`, label: 'คลังวัตถุดิบ', icon: Package },
  ];

  const allNavItems = [
    { href: `/r/${slug}/pos`, label: 'ผังโต๊ะ & POS', icon: LayoutGrid },
    { href: `/r/${slug}/kitchen`, label: 'ห้องครัว (KDS)', icon: ChefHat },
    { href: `/r/${slug}/admin/tables`, label: 'จัดการโต๊ะ', icon: LayoutGrid },
    { href: `/r/${slug}/admin/menu`, label: 'เมนู & ของหมด', icon: UtensilsCrossed },
    { href: `/r/${slug}/admin/inventory`, label: 'คลังวัตถุดิบ & สูตร', icon: Package },
    { href: `/r/${slug}/admin/promotions`, label: 'สมาชิก & โปรโมชั่น', icon: Gift },
    { href: `/r/${slug}/admin/reports`, label: 'ยอดขาย & ปิดกะ', icon: BarChart3 },
    { href: `/r/${slug}/admin/qr-codes`, label: 'พิมพ์ QR โต๊ะ', icon: QrCode },
    { href: `/r/${slug}/admin/settings`, label: 'ตั้งค่าร้าน', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-orange-500 selection:text-white pb-20 xl:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-header no-print border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-18 gap-2 sm:gap-4">
            {/* Store Brand & Slug */}
            <Link href={`/r/${slug}/pos`} className="flex items-center space-x-2.5 sm:space-x-3 group flex-shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-slate-900 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Store className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px]">
                    {storeInfo?.storeName || 'ร้านอาหาร'}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-orange-100 text-orange-700 whitespace-nowrap">
                    POS
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">
                  /r/{slug}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation (XL screens) */}
            <nav className="hidden xl:flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 text-xs font-bold whitespace-nowrap flex-shrink-0">
              {allNavItems.map((item) => {
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
            <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0 whitespace-nowrap">
              {/* Sound toggle */}
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) playOrderChime();
                }}
                title={soundEnabled ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือน'}
                className={`p-2 sm:p-2.5 rounded-xl text-xs transition-all border flex-shrink-0 ${
                  soundEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* Test table ordering link */}
              <Link
                href={`/r/${slug}/table/1`}
                target="_blank"
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all whitespace-nowrap flex-shrink-0"
              >
                <span className="whitespace-nowrap">ทดลองสั่ง (โต๊ะ 1)</span>
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 flex-shrink-0" />
              </Link>

              {/* Owner Hub link */}
              <Link
                href="/store/dashboard"
                className="p-2 sm:p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-all flex items-center"
                title="แดชบอร์ดเจ้าของร้าน"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on < XL screens) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl py-1.5 px-2 flex items-center justify-around no-print">
        {primaryMobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== `/r/${slug}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-orange-600 font-black scale-105'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-orange-100' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu Button */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isMoreMenuOpen ? 'text-orange-600 font-black' : 'text-slate-500 font-semibold'
          }`}
        >
          <div className="p-1.5 rounded-xl hover:bg-slate-100">
            <MoreHorizontal className="w-5 h-5 text-slate-500" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">เพิ่มเติม</span>
        </button>
      </div>

      {/* Mobile Slide-up Drawer for Extra Menus */}
      {isMoreMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex-1"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-orange-500" />
                <span className="font-extrabold text-slate-900 text-sm">เมนูทั้งหมดของร้าน</span>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={`flex items-center space-x-2.5 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md shadow-orange-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100 font-semibold'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-xs truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/store/dashboard"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md"
              >
                <User className="w-4 h-4 text-orange-400" />
                <span>แดชบอร์ดเจ้าของร้าน (Store Hub)</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

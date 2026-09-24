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
} from 'lucide-react';
import { playOrderChime } from '@/lib/sound';

export default function Navbar() {
  const pathname = usePathname() || '';
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_voice_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [storeName, setStoreName] = useState('ร้านอาหารตามสั่ง');

  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setSoundEnabled(e.detail.enabled);
      }
    };
    window.addEventListener('pos-voice-changed', handleVoiceChange);
    return () => window.removeEventListener('pos-voice-changed', handleVoiceChange);
  }, []);

  // Intelligent slug prefix detection for multi-tenant SaaS vs standalone routes
  const slugMatch = pathname.match(/^\/r\/([^\/]+)/);
  const tenantSlug = slugMatch ? slugMatch[1] : null;
  const basePath = tenantSlug ? `/r/${tenantSlug}` : '';

  useEffect(() => {
    const fetchSettingsUrl = tenantSlug ? `/api/r/${tenantSlug}/settings` : '/api/settings';
    fetch(fetchSettingsUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data?.storeName || data?.name) setStoreName(data.storeName || data.name);
      })
      .catch(() => {});
  }, [tenantSlug]);

  const navItems = [
    { href: `${basePath}/pos`, base: '/pos', label: 'ผังโต๊ะ & POS', icon: LayoutGrid },
    { href: `${basePath}/kitchen`, base: '/kitchen', label: 'ห้องครัว (KDS)', icon: ChefHat },
    { href: `${basePath}/admin/tables`, base: '/admin/tables', label: 'จัดการโต๊ะ', icon: LayoutGrid },
    { href: `${basePath}/admin/menu`, base: '/admin/menu', label: 'เมนู & ของหมด', icon: UtensilsCrossed },
    { href: `${basePath}/admin/reports`, base: '/admin/reports', label: 'ยอดขาย & ปิดกะ', icon: BarChart3 },
    { href: `${basePath}/admin/qr-codes`, base: '/admin/qr-codes', label: 'พิมพ์ QR โต๊ะ', icon: QrCode },
    { href: `${basePath}/admin/settings`, base: '/admin/settings', label: 'ตั้งค่าร้าน', icon: Settings },
  ];

  // Mobile Bottom Bar items (Top 5 primary actions per Rules 21, 22, 46, 50)
  const mobileBottomItems = [
    { href: `${basePath}/pos`, base: '/pos', label: 'POS ขาย', icon: LayoutGrid },
    { href: `${basePath}/kitchen`, base: '/kitchen', label: 'ครัว KDS', icon: ChefHat },
    { href: `${basePath}/admin/tables`, base: '/admin/tables', label: 'ผังโต๊ะ', icon: LayoutGrid },
    { href: `${basePath}/admin/menu`, base: '/admin/menu', label: 'เมนูสต็อก', icon: UtensilsCrossed },
    { href: `${basePath}/admin/reports`, base: '/admin/reports', label: 'รายงาน', icon: BarChart3 },
  ];

  const isItemActive = (href: string, base: string) => {
    if (pathname === href) return true;
    if (base !== '/' && (pathname.endsWith(base) || pathname.includes(`${base}/`))) return true;
    return false;
  };

  return (
    <>
      {/* Top Header for Desktop, Tablet, and Mobile Header Title */}
      <header className="sticky top-0 z-40 glass-header no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-18 gap-4">
            {/* Brand Logo & Store Name */}
            <Link href={basePath ? `${basePath}/pos` : '/'} className="flex items-center space-x-2.5 md:space-x-3 group flex-shrink-0">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-tr from-slate-900 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Store className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <span className="font-black text-slate-900 text-sm md:text-lg tracking-tight truncate max-w-[160px] sm:max-w-[240px] md:max-w-none">
                    {storeName}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700 whitespace-nowrap">
                    POS PRO
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden md:block">
                  ระบบจัดการร้านอาหาร &amp; สแกนสั่งที่โต๊ะ
                </span>
              </div>
            </Link>

            {/* Desktop Nav Items (Rule 9: Desktop Multi-column / Top Navigation) */}
            <nav className="hidden lg:flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 text-xs font-bold whitespace-nowrap flex-shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.base);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-sound="tap"
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all duration-75 active:scale-95 ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Action CTAs */}
            <div className="flex items-center space-x-2 flex-shrink-0 whitespace-nowrap">
              {/* Audio Toggle */}
              <button
                type="button"
                data-sound="tap"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('pos_voice_enabled', next ? 'true' : 'false');
                    localStorage.setItem('pos_audio_unlocked', 'true');
                    window.dispatchEvent(new CustomEvent('pos-voice-changed', { detail: { enabled: next } }));
                  }
                  if (next) playOrderChime();
                }}
                title={soundEnabled ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือน'}
                className={`min-h-[38px] md:min-h-[40px] px-3 py-1.5 rounded-xl text-xs transition-all border flex-shrink-0 flex items-center space-x-1.5 duration-75 active:scale-95 cursor-pointer select-none ${
                  soundEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 font-bold'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span className="text-xs hidden sm:inline">{soundEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
              </button>
            </div>
          </div>

          {/* Tablet Horizontal Scrolling Submenu (768px - 1023px) */}
          <div className="hidden md:flex lg:hidden items-center space-x-1.5 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none text-xs whitespace-nowrap">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href, item.base);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-sound="tap"
                  className={`min-h-[40px] flex items-center space-x-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold transition-all duration-75 active:scale-95 select-none flex-shrink-0 cursor-pointer ${
                    active
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Rule 21, 22, 50: Mobile Bottom Navigation Bar (< 768px) - Thumb-friendly, 1-Hand Reach */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl safe-area-bottom no-print">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href, item.base);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-sound="tap"
                className={`flex flex-col items-center justify-center h-full w-full py-1 text-[10px] font-extrabold transition-all duration-75 active:scale-90 select-none cursor-pointer ${
                  active ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`w-9 h-7 rounded-xl flex items-center justify-center transition-all ${
                    active ? 'bg-orange-100/80 text-orange-600' : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate max-w-[58px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

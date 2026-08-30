'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  LayoutGrid,
  ChefHat,
  Smartphone,
  UtensilsCrossed,
  BarChart3,
  QrCode,
  Settings,
  Store,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Users,
  Activity,
  Receipt,
  Flame,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function HomePage() {
  const [store, setStore] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setStore(d?.error ? null : d))
      .catch(() => setStore(null));

    fetch('/api/tables')
      .then((r) => r.json())
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch(() => setTables([]));

    fetch('/api/reports/daily')
      .then((r) => r.json())
      .then((d) => setReport(d?.error ? null : d))
      .catch(() => setReport(null));

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const safeTables = Array.isArray(tables) ? tables : [];
  const occupiedCount = safeTables.filter((t) => t?.status && t.status !== 'AVAILABLE').length;
  const pendingPaymentCount = safeTables.filter((t) => t?.status === 'PAYMENT_PENDING').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* HERO / WELCOME BANNER (Linear/Apple Bento Style) */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-10 overflow-hidden shadow-2xl border border-slate-800">
          {/* Subtle Ambient Light Gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-orange-300">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>ระบบ POS ร้านอาหารตามสั่ง & สแกนสั่งอาหารที่โต๊ะ</span>
                {currentTime && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="font-mono text-white/90">{currentTime} น.</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {store?.storeName || 'ร้านอาหารตามสั่ง'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                จัดการออเดอร์หน้าร้าน • ลูกค้าสแกนสั่งผ่าน LINE/Web • จอครัว Real-time มีเสียงเตือน • คิดเงิน Dynamic PromptPay QR อัตโนมัติ
              </p>
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <div className="flex-1 sm:flex-none px-5 py-3.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 min-w-[150px]">
                <span className="text-[11px] font-semibold text-slate-400 block">ยอดขายวันนี้</span>
                <span className="text-xl font-black text-white mt-0.5 block">
                  {formatPrice(report?.totalSales || 0)}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {report?.orderCount || 0} บิลสำเร็จ
                </span>
              </div>

              <div className="flex-1 sm:flex-none px-5 py-3.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 min-w-[150px]">
                <span className="text-[11px] font-semibold text-slate-400 block">สถานะโต๊ะ (10 โต๊ะ)</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xl font-black text-white">{occupiedCount}/10</span>
                  <span className="text-[11px] font-bold text-orange-400">กำลังทาน</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  ว่าง {10 - occupiedCount} โต๊ะ {pendingPaymentCount > 0 && `• รอคิดเงิน ${pendingPaymentCount}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK TABLE STATUS STRIP */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-700">
            <Activity className="w-4 h-4 text-orange-500" />
            <span>ผังสถานะโต๊ะด่วน:</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {safeTables.length === 0
              ? Array.from({ length: 10 }, (_, i) => ({ id: i + 1, status: 'AVAILABLE' })).map((t) => (
                  <Link
                    key={t.id}
                    href={`/table/${t.id}`}
                    target="_blank"
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all flex-shrink-0"
                  >
                    {t.id}
                  </Link>
                ))
              : safeTables.map((t) => {
                  const isAvail = t.status === 'AVAILABLE';
                  const isPending = t.status === 'PAYMENT_PENDING';
                  return (
                    <Link
                      key={t.id}
                      href="/pos"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all flex-shrink-0 ${
                        isAvail
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : isPending
                          ? 'bg-amber-50 border-amber-400 text-amber-900 animate-pulse'
                          : 'bg-orange-50 border-orange-300 text-orange-900'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAvail ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-orange-500'
                        }`}
                      />
                      <span>โต๊ะ {t.id}</span>
                    </Link>
                  );
                })}
          </div>

          <Link
            href="/table/1"
            target="_blank"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1 self-end md:self-auto"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>จำลองสแกนสั่งที่โต๊ะ</span>
          </Link>
        </div>
      </section>

      {/* 6 BENTO CARDS GRID */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: POS Cashier */}
          <Link
            href="/pos"
            className="group relative rounded-3xl bg-white p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60">
                  {occupiedCount}/10 กำลังทาน
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                  ผังโต๊ะ & แคชเชียร์ (POS)
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  ดูผังโต๊ะ 1-10 สด, รับออเดอร์หน้าร้าน, ย้ายโต๊ะ/รวมโต๊ะ, เช็คบิลเงินสด (คำนวณเงินทอน) และสแกน PromptPay พร้อมพิมพ์ใบเสร็จ
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
              <span>เปิดหน้าจอแคชเชียร์</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Kitchen KDS */}
          <Link
            href="/kitchen"
            className="group relative rounded-3xl bg-white p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <ChefHat className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                  🔔 เสียงกระดิ่งเตือน
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                  จอห้องครัว Real-time (KDS)
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  ออเดอร์ใหม่เด้งเข้าครัวทันทีพร้อมเสียงกระดิ่งเตือน แยกรายละเอียดเนื้อสัตว์/ไข่ดาว/ระดับเผ็ดชัดเจน กดเปลี่ยนสถานะ 1-Click
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>เปิดหน้าจอห้องครัว</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Menu & Stock */}
          <Link
            href="/admin/menu"
            className="group relative rounded-3xl bg-white p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  1-Click ของหมด
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  จัดการเมนู & ของหมด
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  เพิ่ม/แก้ไขเมนูตามสั่ง ราคา ท็อปปิ้ง และกดสวิตช์ 1-Click ปิดรับออเดอร์เมนูที่วัตถุดิบหมดได้ทันทีจากมือถือ
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>จัดการเมนูอาหาร</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Reports & Daily Close */}
          <Link
            href="/admin/reports"
            className="group relative rounded-3xl bg-white p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  {formatPrice(report?.totalSales || 0)}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  รายงานยอดขาย & ปิดกะ
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  วิเคราะห์ยอดขายประจำวัน สัดส่วนเงินสด vs PromptPay โอนเงิน สถิติ 10 เมนูขายดี และพิมพ์ใบสรุปปิดกะ
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>ดูสถิติและปิดกะ</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Table QR Codes Print */}
          <Link
            href="/admin/qr-codes"
            className="group relative rounded-3xl bg-white p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform">
                  <QrCode className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                  พร้อมพิมพ์ A4
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
                  พิมพ์ป้าย QR Code โต๊ะ
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  พิมพ์ป้ายตั้งโต๊ะ QR Code สำหรับโต๊ะ 1 ถึง 10 ในขนาด A4 ตัดวางที่โต๊ะให้ลูกค้าสแกนสั่งอาหารผ่าน Wi-Fi ได้ทันที
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
              <span>พิมพ์ป้าย QR Code</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Settings */}
          <Link
            href="/admin/settings"
            className="group relative rounded-3xl bg-white p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-400 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-md shadow-slate-900/20 group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  PromptPay
                </span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-slate-700 transition-colors">
                  ตั้งค่าร้าน & พร้อมเพย์
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  ตั้งค่าชื่อร้าน, เบอร์โทร, เบอร์ PromptPay รับเงินสแกนจ่าย และข้อความท้ายใบเสร็จ
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>ตั้งค่าข้อมูลร้านค้า</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

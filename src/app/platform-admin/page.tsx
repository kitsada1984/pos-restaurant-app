'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platform-admin/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          ภาพรวมแพลตฟอร์ม (Platform Overview)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          ระบบบริหารจัดการร้านค้าสมาชิก สมาชิกทดลองใช้ และยอดรายได้ค่าบริการ SaaS
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ร้านค้าทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{stats?.totalStores || 0}</span>
            <span className="text-xs text-slate-400 ml-2">ร้าน</span>
          </div>
          <div className="mt-2 flex items-center space-x-3 text-[11px]">
            <span className="text-emerald-400 font-bold">{stats?.activeStores || 0} เปิดใช้งาน</span>
            <span className="text-amber-400 font-bold">{stats?.trialStores || 0} ทดลองใช้</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">รอตรวจสลิปแจ้งโอน</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400">{stats?.pendingStores || 0}</span>
            <span className="text-xs text-slate-400 ml-2">รายการ</span>
          </div>
          <div className="mt-2">
            <Link
              href="/platform-admin/subscriptions"
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1"
            >
              <span>ไปหน้าตรวจสลิป</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">รายได้ค่าบริการ SaaS</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-400">
              ฿{stats?.totalRevenue ? stats.totalRevenue.toLocaleString() : '0'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            ยอดชำระที่อนุมัติแล้วทั้งหมด
          </div>
        </div>

        <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ออเดอร์สะสมทุกร้าน</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">{stats?.totalOrders || 0}</span>
            <span className="text-xs text-slate-400 ml-2">บิล</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            จำนวนออเดอร์ในระบบทั้งหมด
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/platform-admin/stores"
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-orange-500/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-white mt-4 group-hover:text-orange-400 transition-colors">
            จัดการร้านค้าสมาชิก
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ดูรายชื่อร้านทั้งหมด, อนุมัติ, ขยายวันใช้งาน, ระงับร้าน และทดลองเข้าหน้าร้าน
          </p>
          <div className="mt-4 text-xs font-bold text-orange-400 flex items-center space-x-1">
            <span>เข้าสู่ระบบจัดการ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/platform-admin/subscriptions"
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-white mt-4 group-hover:text-amber-400 transition-colors">
            ตรวจสลิปแจ้งชำระเงิน
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ตรวจสอบหลักฐานการโอนเงินของร้านค้า และกดอนุมัติเพื่อเพิ่มวันใช้งานให้อัตโนมัติ
          </p>
          <div className="mt-4 text-xs font-bold text-amber-400 flex items-center space-x-1">
            <span>ดูสลิปที่รอดำเนินการ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/platform-admin/plans"
          className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-emerald-500/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-white mt-4 group-hover:text-emerald-400 transition-colors">
            ตั้งค่าแพ็กเกจราคา
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            กำหนดราคาแพ็กเกจ (Basic, Pro, Yearly) ระยะเวลา และจำนวนโต๊ะสูงสุดของแต่ละแพ็กเกจ
          </p>
          <div className="mt-4 text-xs font-bold text-emerald-400 flex items-center space-x-1">
            <span>จัดการแพ็กเกจ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}

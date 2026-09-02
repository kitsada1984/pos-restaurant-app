'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Store,
  QrCode,
  ChefHat,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  Clock,
  Star,
  Users,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  CreditCard,
} from 'lucide-react';

export default function ProfessionalLandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const stats = [
    { label: 'ร้านอาหารที่เปิดใช้งาน', value: '5,000+' },
    { label: 'ยอดสั่งซื้อต่อเดือน', value: '฿120M+' },
    { label: 'ความเสถียรของระบบ (Uptime)', value: '99.99%' },
    { label: 'ความพึงพอใจของลูกค้า', value: '4.9/5 ★' },
  ];

  const features = [
    {
      icon: QrCode,
      color: 'from-blue-600 to-indigo-600',
      tag: 'Table QR Ordering',
      title: 'สแกนสั่งอาหารที่โต๊ะผ่าน LINE & Web',
      description:
        'ลูกค้าสแกน QR Code ประจำโต๊ะแล้วสั่งอาหารได้ทันที ปรับแต่งรสชาติ เลือกท็อปปิ้งไข่ดาว/ระดับเผ็ด และติดตามสถานะแบบเรียลไทม์',
      highlights: ['ไม่ต้องโหลดแอปเพิ่ม', 'เปิดผ่าน LINE / เบราว์เซอร์', 'รองรับภาพเมนูสวยงาม'],
    },
    {
      icon: ChefHat,
      color: 'from-teal-500 to-emerald-600',
      tag: 'Real-time KDS',
      title: 'หน้าจอห้องครัวพร้อมเสียงกระดิ่งเตือน',
      description:
        'ออเดอร์ส่งตรงเข้าครัวทันทีแบบวินาทีต่อวินาที มีเสียงกระดิ่งแจ้งเตือน แยกรายละเอียดอาหารชัดเจน พ่อครัวกดเปลี่ยนสถานะได้ด้วยคลิกเดียว',
      highlights: ['เสียงแจ้งเตือนอัตโนมัติ', 'ตัวหนังสือใหญ่อ่านง่าย', 'พิมพ์ใบสั่งครัวได้'],
    },
    {
      icon: CreditCard,
      color: 'from-slate-800 to-slate-950',
      tag: 'Dynamic PromptPay',
      title: 'คิดเงินอัตโนมัติ & Dynamic PromptPay QR',
      description:
        'สร้าง QR Code พร้อมเพย์ตามยอดบิลสุทธิของโต๊ะนั้นอัตโนมัติ ไม่ต้องคอยกดเครื่องคิดเลข รองรับทั้งเงินสด (ทอนเงิน) และสแกนจ่าย',
      highlights: ['QR ฝังยอดเงินอัตโนมัติ', 'ระบบแนบสลิป/ตรวจสลิป', 'พิมพ์ใบเสร็จ Slip 80mm'],
    },
  ];

  const testimonials = [
    {
      quote:
        'ตั้งแต่ใช้ระบบ POS สแกนสั่งที่โต๊ะ ร้านเราลดเวลาเดินจดออเดอร์ได้เยอะมาก ลูกค้าชอบที่ไม่ต้องรอเรียกพนักงาน ยอดขายเพิ่มขึ้น 30% ชัดเจนครับ',
      author: 'คุณสมศักดิ์ พัฒนากุล',
      role: 'เจ้าของร้าน กะเพราถาดยายสม (10 โต๊ะ)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    },
    {
      quote:
        'ฟังก์ชันกดปุ่ม "ของหมด" 1-Click ช่วยชีวิตช่วงพีคมาก เมนูไหนหมดกดปิดปุ๊บ ลูกค้าที่โต๊ะจะเห็นทันที ไม่ต้องเดินไปบอกยกเลิกออเดอร์ในครัวอีกต่อไป',
      author: 'คุณวิภาวรรณ สุขประเสริฐ',
      role: 'ผู้จัดการร้าน อาหารตามสั่งริมทาง',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    },
    {
      quote:
        'ระบบ PromptPay Dynamic QR ทำให้เช็คบิลเร็วขึ้นมาก ลูกค้าไม่ต้องพิมพ์ยอดเงินเอง ป้องกันการโอนผิดยอด และมีรายงานยอดขายปิดกะครบถ้วน',
      author: 'เชฟก้องภพ อนันต์ชัย',
      role: 'เจ้าของร้าน ครัวก้องภพ A-La-Carte',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
  ];

  const pricing = [
    {
      name: 'Starter (ร้านขนาดเล็ก)',
      badge: 'เริ่มต้นใช้งานฟรี',
      price: '฿0',
      period: 'ฟรีตลอดชีพ',
      description: 'เหมาะสำหรับร้านอาหารตามสั่ง 1-5 โต๊ะ ที่ต้องการเริ่มต้นระบบสแกนสั่ง',
      features: [
        'รองรับสูงสุด 5 โต๊ะ',
        'ระบบสแกนสั่งอาหารผ่าน QR Code',
        'หน้าจอแคชเชียร์ POS พื้นฐาน',
        'สร้าง PromptPay Dynamic QR',
        'ฐานข้อมูล Local ในเครื่อง 100%',
      ],
      popular: false,
      cta: 'เริ่มใช้งานฟรี',
      href: '/pos',
    },
    {
      name: 'Pro (ยอดนิยม)',
      badge: 'แนะนำสำหรับร้าน 5-10 โต๊ะ',
      price: billingCycle === 'monthly' ? '฿390' : '฿3,900',
      period: billingCycle === 'monthly' ? '/เดือน' : '/ปี (ประหยัด 2 เดือน)',
      description: 'ครบครันทุกฟังก์ชัน สำหรับร้านอาหารตามสั่งที่ต้องการความคล่องตัวสูงสุด',
      features: [
        'รองรับสูงสุด 15 โต๊ะ',
        'หน้าจอห้องครัว KDS สด + เสียงเตือน',
        'ปุ่ม 1-Click ปิดเมนูของหมด',
        'ระบบย้ายโต๊ะ / รวมโต๊ะ / แยกบิล',
        'พิมพ์ใบเสร็จ Thermal Slip 58mm/80mm',
        'รายงานยอดขาย & ปิดกะประจำวัน',
        'พิมพ์แผ่นป้าย QR Code ตั้งโต๊ะ A4',
      ],
      popular: true,
      cta: 'เปิดใช้งานโหมด Pro',
      href: '/pos',
    },
    {
      name: 'Enterprise / แฟรนไชส์',
      badge: 'สำหรับหลายสาขา',
      price: '฿990',
      period: '/เดือน/สาขา',
      description: 'สำหรับร้านที่มีหลายสาขา และต้องการระบบจัดการสต็อกขั้นสูง',
      features: [
        'ไม่จำกัดจำนวนโต๊ะ',
        'ระบบบริหารหลายสาขาจากส่วนกลาง',
        'LINE Official Account Webhook เชื่อมต่อ',
        'ระบบตัดสต็อกวัตถุดิบอัตโนมัติ',
        'API เชื่อมต่อระบบบัญชีและ ERP',
        'ทีมงานดูแล Support ตลอด 24 ชม.',
      ],
      popular: false,
      cta: 'ติดต่อฝ่ายขาย',
      href: '/pos',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#2563EB] selection:text-white font-sans">
      {/* 1. STICKY TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all w-full">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group flex-shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#0F172A] via-[#2563EB] to-[#14B8A6] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#0F172A] block leading-none">
                POS PRO<span className="text-[#2563EB]">.</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#14B8A6] tracking-wider uppercase">
                Restaurant OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-[#2563EB] transition-colors">
              ฟีเจอร์หลัก
            </a>
            <a href="#kds" className="hover:text-[#2563EB] transition-colors">
              ห้องครัว (KDS)
            </a>
            <a href="#pricing" className="hover:text-[#2563EB] transition-colors">
              แพ็กเกจราคา
            </a>
            <a href="#testimonials" className="hover:text-[#2563EB] transition-colors">
              รีวิวจากร้านค้า
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors whitespace-nowrap h-9 sm:h-10 flex items-center justify-center"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#14B8A6] hover:from-blue-700 hover:to-teal-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-1 whitespace-nowrap h-9 sm:h-10"
            >
              <span>ทดลองใช้ฟรี</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-400/15 via-teal-400/15 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#2563EB] text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Restaurant POS & Table Ordering Platform</span>
          </div>

          {/* Headline */}
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0F172A] tracking-tight leading-[1.1]">
              ยกระดับร้านอาหารของคุณด้วยระบบ <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-[#2563EB] via-blue-600 to-[#14B8A6] bg-clip-text text-transparent">
                สแกนสั่งที่โต๊ะ & POS อัจฉริยะ
              </span>
            </h1>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              สำหรับร้านอาหารตามสั่งและร้านขนาดเล็ก (5-10 โต๊ะ) ลูกค้าสแกนสั่งอาหารผ่าน LINE / Web จอครัว Real-time พร้อมเสียงเตือน และคิดเงิน Dynamic PromptPay QR อัตโนมัติ
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/pos"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-base shadow-xl shadow-slate-900/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <span>เปิดใช้งานหน้าร้าน POS</span>
              <ChevronRight className="w-5 h-5" />
            </Link>

            <Link
              href="/kitchen"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-base shadow-sm active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <ChefHat className="w-5 h-5 text-[#2563EB]" />
              <span>ดูหน้าจอห้องครัว (KDS)</span>
            </Link>
          </div>

          {/* Product Dashboard Mockup Preview */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="relative rounded-3xl bg-slate-900 p-2 sm:p-4 shadow-2xl border border-slate-800 ring-1 ring-slate-800/50">
              {/* Window Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-3 text-xs text-slate-400">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="bg-slate-800 px-4 py-1 rounded-lg text-[11px] font-mono">
                  pos-restaurant-app.local:3000
                </div>
                <div className="w-12" />
              </div>

              {/* Inner Mockup Interactive Visual */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2 bg-slate-950 rounded-2xl text-left">
                {/* Visual Col 1: POS Table Matrix */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <LayoutGrid className="w-4 h-4 text-blue-400" />
                      <span>ผังโต๊ะ 1-10 (POS)</span>
                    </span>
                    <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[10px]">
                      Live
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg text-center text-xs font-bold border ${
                          i === 2 || i === 3
                            ? 'bg-orange-950/60 border-orange-500/80 text-orange-300'
                            : i === 4
                            ? 'bg-amber-950/60 border-amber-500/80 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div>โต๊ะ {i}</div>
                        <div className="text-[9px] font-normal opacity-80">
                          {i === 2 || i === 3 ? 'กำลังทาน' : i === 4 ? 'รอเช็คบิล' : 'ว่าง'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Col 2: Live Kitchen Ticket */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <ChefHat className="w-4 h-4 text-teal-400" />
                      <span>ออเดอร์ในครัว</span>
                    </span>
                    <span className="text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded text-[10px]">
                      🔔 มีเสียงเตือน
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-white">
                      <span>โต๊ะ 3 (รอบที่ 1)</span>
                      <span className="text-amber-400">รอทำ</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      • กะเพราหมูกรอบ (ไข่ดาวไม่สุก / เผ็ดมาก)
                    </p>
                    <p className="text-red-400 text-[10px] italic">*ไม่ใส่ผัก ไม่ใส่ชูรส</p>
                  </div>
                </div>

                {/* Visual Col 3: PromptPay Dynamic QR */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <QrCode className="w-4 h-4 text-blue-400" />
                      <span>PromptPay Dynamic QR</span>
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg text-center text-slate-900 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-700 font-mono text-[9px] border">
                      [QR Code 150.00฿]
                    </div>
                    <span className="text-[10px] font-bold mt-1 text-[#113566]">
                      ยอดชำระ: ฿150.00
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold text-center">
                    ✓ ฝังยอดเงินอัตโนมัติตรงบิล
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CLIENT LOGOS & TRUST ROW */}
      <section className="py-10 border-y border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            ได้รับความไว้วางใจจากร้านอาหารชั้นนำและร้านอาหารตามสั่งทั่วประเทศ
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-60 grayscale hover:grayscale-0 transition-all text-sm font-extrabold text-slate-600">
            <span>KAPROW BOWL</span>
            <span>NOODLE MASTER</span>
            <span>CHEF GONG</span>
            <span>THAI STREET BISTRO</span>
            <span>A-LA-CARTE EXPRESS</span>
          </div>
        </div>
      </section>

      {/* 4. THREE FEATURE CARDS (12-Column Grid) */}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">
            ฟีเจอร์ระดับมืออาชีพ
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
            ออกแบบมาเพื่อแก้ปัญหาจริง <br />
            ของร้านอาหารตามสั่งขนาดเล็ก
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            ทุกฟังก์ชันถูกปรับแต่งให้ลดความผิดพลาด เพิ่มความเร็วในการเสิร์ฟ และสรุปบัญชีได้แบบอัตโนมัติ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-bold text-[#14B8A6] uppercase tracking-wider block">
                    {feat.tag}
                  </span>
                  <h3 className="text-xl font-bold text-[#0F172A] leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {feat.highlights.map((h, hIdx) => (
                    <div key={hIdx} className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. STATISTICS METRICS BAR */}
      <section className="bg-[#0F172A] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {stats.map((stat, idx) => (
              <div key={idx} className="pt-4 lg:pt-0 space-y-1">
                <span className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS CAROUSEL / GRID */}
      <section id="testimonials" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">
            เสียงตอบรับจากผู้ใช้งานจริง
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A]">
            ร้านค้าที่เติบโตไปพร้อมกับเรา
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((test, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex text-amber-400 space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  "{test.quote}"
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200">
                  <Image src={test.avatar} alt={test.author} fill className="object-cover" sizes="40px" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#0F172A]">{test.author}</h4>
                  <p className="text-[11px] text-slate-500">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. TRANSPARENT PRICING TABLE */}
      <section id="pricing" className="py-20 md:py-28 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">
              แพ็กเกจราคาโปร่งใส
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A]">
              เลือกแพ็กเกจที่เหมาะกับขนาดร้านของคุณ
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              ไม่มีค่าธรรมเนียมแอบแฝง รันในเครื่องร้านได้ตลอดชีพ หรือต่อยอดขึ้นคลาวด์ได้ทันที
            </p>

            {/* Toggle Billing */}
            <div className="pt-3 flex items-center justify-center space-x-3 text-xs font-bold">
              <span className={billingCycle === 'monthly' ? 'text-[#0F172A]' : 'text-slate-400'}>
                รายเดือน
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 bg-[#0F172A] rounded-full p-1 transition-colors relative"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={billingCycle === 'yearly' ? 'text-[#2563EB]' : 'text-slate-400'}>
                รายปี (ประหยัด 20%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {pricing.map((tier, idx) => (
              <div
                key={idx}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all ${
                  tier.popular
                    ? 'bg-white border-2 border-[#2563EB] shadow-xl relative ring-4 ring-blue-500/10'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[11px] font-black uppercase px-3.5 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-lg text-[#0F172A]">{tier.name}</h3>
                    <p className="text-xs text-slate-500">{tier.description}</p>
                  </div>

                  <div className="flex items-baseline space-x-1 pt-2">
                    <span className="text-4xl font-black text-[#0F172A]">{tier.price}</span>
                    <span className="text-xs text-slate-500 font-semibold">{tier.period}</span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    {tier.features.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start space-x-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-[#14B8A6] flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={tier.href}
                    className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center transition-all ${
                      tier.popular
                        ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#0F172A] text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Col */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-white font-black text-lg">
                <Store className="w-6 h-6 text-[#2563EB]" />
                <span>POS PRO.</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ระบบจัดการร้านอาหารตามสั่งและ POS ขนาดเล็กที่ดีที่สุด ใช้งานง่าย คิดเงินไว ลูกค้าประทับใจ
              </p>
            </div>

            {/* Links Col 1 */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider mb-2">โมดูลระบบ</h4>
              <p><Link href="/pos" className="hover:text-white">ผังโต๊ะ & แคชเชียร์ POS</Link></p>
              <p><Link href="/kitchen" className="hover:text-white">หน้าจอห้องครัว KDS</Link></p>
              <p><Link href="/table/1" className="hover:text-white">สแกนสั่งอาหารที่โต๊ะ</Link></p>
              <p><Link href="/admin/menu" className="hover:text-white">จัดการเมนู & ของหมด</Link></p>
            </div>

            {/* Links Col 2 */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider mb-2">เครื่องมือร้านค้า</h4>
              <p><Link href="/admin/reports" className="hover:text-white">รายงานยอดขาย & ปิดกะ</Link></p>
              <p><Link href="/admin/qr-codes" className="hover:text-white">พิมพ์ป้าย QR Code โต๊ะ A4</Link></p>
              <p><Link href="/admin/settings" className="hover:text-white">ตั้งค่าบัญชี PromptPay</Link></p>
            </div>

            {/* Contact Col */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider mb-2">ติดต่อ & ช่วยเหลือ</h4>
              <p>โทร: 089-123-4567</p>
              <p>LINE OA: @posrestaurant</p>
              <p>เวลาทำการ: ทุกวัน 08:00 - 22:00 น.</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 POS PRO Restaurant Platform. All rights reserved.</p>
            <p>Designed with High-Fidelity UI/UX Standards</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

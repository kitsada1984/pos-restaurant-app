'use client';

import React, { useState, useEffect } from 'react';
import {
  Gift,
  Users,
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Percent,
  Calendar,
  Save,
  Loader2,
  X,
  Phone,
  DollarSign,
  Sparkles,
} from 'lucide-react';

export default function AdminLoyaltyView({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<'members' | 'promotions'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pointsRate, setPointsRate] = useState(25);
  const [pointValue, setPointValue] = useState(1);

  // Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDiscountType, setPromoDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [promoDiscountValue, setPromoDiscountValue] = useState('');
  const [promoMinSpend, setPromoMinSpend] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [memRes, promoRes] = await Promise.all([
        fetch(`/api/r/${slug}/members`),
        fetch(`/api/r/${slug}/promotions`),
      ]);
      const memData = await memRes.json();
      const promoData = await promoRes.json();
      if (memData.members) setMembers(memData.members);
      if (memData.pointsRate) setPointsRate(memData.pointsRate);
      if (memData.pointValue) setPointValue(memData.pointValue);
      if (promoData.promotions) setPromotions(promoData.promotions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoTitle || !promoDiscountValue) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          title: promoTitle,
          discountType: promoDiscountType,
          discountValue: parseFloat(promoDiscountValue),
          minSpend: parseFloat(promoMinSpend) || 0,
        }),
      });
      if (res.ok) {
        setIsPromoModalOpen(false);
        setPromoCode('');
        setPromoTitle('');
        setPromoDiscountValue('');
        setPromoMinSpend('0');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('ยืนยันลบคูปองส่วนลดนี้?')) return;
    try {
      const res = await fetch(`/api/r/${slug}/promotions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.phone.includes(searchTerm) ||
      (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
            ระบบสมาชิกสะสมแต้ม CRM &amp; คูปอง
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            สะสมแต้มลูกค้าประจำด้วยเบอร์โทรศัพท์ และสร้างคูปองส่วนลดเพื่อกระตุ้นยอดขาย
          </p>
        </div>

        {activeTab === 'promotions' && (
          <button
            onClick={() => setIsPromoModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            + สร้างคูปองส่วนลดใหม่
          </button>
        )}
      </div>

      {/* KPI Cards (Equal Height Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 auto-rows-fr w-full">
        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">สมาชิกทั้งหมด</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{members.length} คน</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">อัตราสะสมแต้มปัจจุบัน</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">฿{pointsRate} = 1 แต้ม</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">คูปองโปรโมชั่นที่เปิดใช้งาน</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {promotions.filter((p) => p.isActive).length} โค้ด
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-5 py-3 font-extrabold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          รายชื่อสมาชิก & แต้มสะสม
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`px-5 py-3 font-extrabold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'promotions'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          คูปองส่วนลด & โค้ดโปรโมชั่น
        </button>
      </div>

      {/* TAB 1: Members */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเบอร์โทร หรือชื่อสมาชิก..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6">เบอร์โทรศัพท์</th>
                  <th className="py-4 px-6">ชื่อสมาชิก</th>
                  <th className="py-4 px-6">แต้มคงเหลือ</th>
                  <th className="py-4 px-6">มูลค่าส่วนลด (บาท)</th>
                  <th className="py-4 px-6">ยอดซื้อสะสม</th>
                  <th className="py-4 px-6">จำนวนครั้งที่มา</th>
                  <th className="py-4 px-6">วันที่สมัคร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-black text-slate-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-500" />
                      {m.phone}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700">
                      {m.name || 'ลูกค้าทั่วไป'}
                    </td>
                    <td className="py-4 px-6 font-black text-orange-600 text-base">
                      {m.points.toLocaleString()} <span className="text-xs font-normal">แต้ม</span>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-emerald-600">
                      ฿{(m.points * pointValue).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-slate-900 font-bold">
                      ฿{m.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {m.visitCount} ครั้ง
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {new Date(m.createdAt).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Promotions */}
      {activeTab === 'promotions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-orange-100 text-orange-700 tracking-wider">
                    {p.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                    เปิดใช้งาน
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{p.title}</h3>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">มูลค่าส่วนลด</span>
                  <span className="text-lg font-black text-orange-600">
                    {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `฿${p.discountValue}`}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div>ยอดซื้อขั้นต่ำ: <strong>฿{p.minSpend}</strong></div>
                  <div>ใช้ไปแล้ว: <strong>{p.usageCount} ครั้ง</strong></div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeletePromo(p.id)}
                  className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบโค้ด
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: New Promo */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">สร้างคูปองส่วนลดใหม่</h3>
              <button onClick={() => setIsPromoModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสโค้ด (Coupon Code)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น PROMO50, DISC10, AROI20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black tracking-wider focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อโปรโมชั่น / คำอธิบาย</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ส่วนลดเปิดร้านใหม่ 50 บาท"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทส่วนลด</label>
                  <select
                    value={promoDiscountType}
                    onChange={(e) => setPromoDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="FIXED">ลดเป็นบาท (฿)</option>
                    <option value="PERCENT">ลดเป็นเปอร์เซ็นต์ (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">มูลค่าส่วนลด</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder={promoDiscountType === 'PERCENT' ? 'เช่น 10 (ลด 10%)' : 'เช่น 50 (ลด 50 บ.)'}
                    value={promoDiscountValue}
                    onChange={(e) => setPromoDiscountValue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ยอดสั่งซื้อขั้นต่ำ (บาท)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="0 = ไม่มีขั้นต่ำ"
                  value={promoMinSpend}
                  onChange={(e) => setPromoMinSpend(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้างคูปอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

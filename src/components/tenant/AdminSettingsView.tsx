'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Store, CreditCard, Receipt, Phone, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AdminSettingsView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [form, setForm] = useState({
    storeName: '',
    promptPayId: '',
    promptPayName: '',
    address: '',
    phone: '',
    receiptFooter: '',
    tableCount: 10,
    linemanGp: 30,
    grabGp: 30,
    shopeeGp: 30,
    robinhoodGp: 20,
    deliveryWebhookSecret: '',
  });

  useEffect(() => {
    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setForm({
            storeName: data.storeName || '',
            promptPayId: data.promptPayId || '',
            promptPayName: data.promptPayName || '',
            address: data.address || '',
            phone: data.phone || '',
            receiptFooter: data.receiptFooter || '',
            tableCount: data.tableCount || 10,
            linemanGp: data.linemanGp ?? 30,
            grabGp: data.grabGp ?? 30,
            shopeeGp: data.shopeeGp ?? 30,
            robinhoodGp: data.robinhoodGp ?? 20,
            deliveryWebhookSecret: data.deliveryWebhookSecret || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch(`/api/r/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSavedSuccess(true);
        showSuccess('บันทึกการตั้งค่าสำเร็จ ✨', 'ข้อมูลร้านค้าและพร้อมเพย์ได้รับการอัปเดตแล้ว');
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        showError('บันทึกไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/80 shadow-sm w-full">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 flex-shrink-0">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-xl text-slate-900">ตั้งค่าร้านค้า &amp; พร้อมเพย์</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              ร้าน: <span className="font-bold text-slate-800">{form.storeName || slug}</span> • ตั้งค่าข้อมูลร้าน บัญชี PromptPay รับเงิน และข้อความท้ายใบเสร็จ
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200/80 shadow-sm space-y-5 sm:space-y-6 w-full">
        {savedSuccess && (
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว</span>
          </div>
        )}

        {/* Section 1: Store Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Store className="w-4 h-4 text-orange-500" />
            <span>ข้อมูลร้านอาหาร</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">ชื่อร้านอาหาร *</label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">เบอร์โทรศัพท์ร้าน</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">ที่อยู่ร้าน (แสดงในใบเสร็จ)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: PromptPay Receiving Account */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>บัญชีพร้อมเพย์รับเงิน (PromptPay) ของร้าน</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือ Tax ID 13 หลัก) *
              </label>
              <input
                type="text"
                required
                placeholder="0812345678"
                value={form.promptPayId}
                onChange={(e) => setForm({ ...form, promptPayId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ชื่อบัญชีพร้อมเพย์ที่แสดง</label>
              <input
                type="text"
                placeholder="เช่น ร้านตามสั่ง ลุง-ป้า"
                value={form.promptPayName}
                onChange={(e) => setForm({ ...form, promptPayName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Receipt Footer */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Receipt className="w-4 h-4 text-indigo-500" />
            <span>ข้อความท้ายใบเสร็จ (Receipt Footer)</span>
          </h3>

          <div className="text-xs">
            <input
              type="text"
              placeholder="ขอบคุณที่อุดหนุนครับ/ค่ะ โอกาสหน้าเชิญใหม่"
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Section 4: Delivery Platforms & GP Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <span>🛵 การตั้งค่าเดลิเวอรี &amp; หักค่าคอมมิชชั่น GP (Delivery Platforms)</span>
          </h3>
          <p className="text-xs text-slate-500">
            กำหนด % GP ที่แต่ละแอปหัก เพื่อให้ระบบคำนวณกำไรและยอดเงินสุทธิที่ร้านจะได้รับจริงแบบอัตโนมัติ
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
              <label className="block text-emerald-950 font-black">🟢 LINE MAN GP (%)</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.linemanGp}
                  onChange={(e) => setForm({ ...form, linemanGp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="font-extrabold text-emerald-800">%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
              <label className="block text-emerald-950 font-black">🟢 GrabFood GP (%)</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.grabGp}
                  onChange={(e) => setForm({ ...form, grabGp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="font-extrabold text-emerald-800">%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
              <label className="block text-amber-950 font-black">🟠 ShopeeFood GP (%)</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.shopeeGp}
                  onChange={(e) => setForm({ ...form, shopeeGp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="font-extrabold text-amber-800">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าร้าน'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

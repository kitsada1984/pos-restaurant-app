'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Settings, Save, CheckCircle2, Store, CreditCard, Receipt, Phone, MapPin } from 'lucide-react';

export default function SettingsPage() {
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
  });

  useEffect(() => {
    fetch('/api/settings')
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
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">ตั้งค่าข้อมูลร้านค้า & พร้อมเพย์</h1>
              <p className="text-xs text-slate-500">
                กำหนดข้อมูลบัญชีสำหรับสร้าง PromptPay Dynamic QR และหัว/ท้ายใบเสร็จ
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 flex-1">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Details Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base text-slate-800 flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Store className="w-5 h-5 text-orange-500" />
                <span>ข้อมูลทั่วไปของร้าน</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อร้านอาหาร:
                  </label>
                  <input
                    type="text"
                    required
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                    placeholder="เช่น ร้านกะเพราถาดยายสม"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อร้าน:
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="เช่น 089-123-4567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ที่อยู่ร้าน (แสดงบนใบเสร็จ):
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="เช่น 123/45 ถนนสุขุมวิท..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* PromptPay Settings Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base text-[#113566] flex items-center space-x-2 pb-2 border-b border-slate-100">
                <CreditCard className="w-5 h-5 text-[#113566]" />
                <span>บัญชี PromptPay รับเงินสแกนจ่าย</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมายเลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือ เลข ปชช./Tax ID 13 หลัก):
                  </label>
                  <input
                    type="text"
                    required
                    value={form.promptPayId}
                    onChange={(e) => setForm({ ...form, promptPayId: e.target.value })}
                    placeholder="เช่น 0891234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ระบบจะนำหมายเลขนี้ไปสร้าง Dynamic QR Code พร้อมยอดเงินอัตโนมัติ
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อบัญชีผู้รับเงิน (แสดงให้ลูกค้าตรวจสอบ):
                  </label>
                  <input
                    type="text"
                    required
                    value={form.promptPayName}
                    onChange={(e) => setForm({ ...form, promptPayName: e.target.value })}
                    placeholder="เช่น นายสมชาย พัฒนาสุข"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Footer Message Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base text-slate-800 flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Receipt className="w-5 h-5 text-orange-500" />
                <span>ข้อความท้ายใบเสร็จ & จำนวนโต๊ะ</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ข้อความขอบคุณท้ายใบเสร็จ:
                  </label>
                  <input
                    type="text"
                    value={form.receiptFooter}
                    onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                    placeholder="ขอบคุณที่มาอุดหนุนครับ โอกาสหน้าเชิญใหม่"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนโต๊ะในร้าน (ค่าเริ่มต้น 10 โต๊ะ):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.tableCount}
                    onChange={(e) => setForm({ ...form, tableCount: parseInt(e.target.value, 10) || 10 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-2">
              {savedSuccess && (
                <div className="flex items-center space-x-1.5 text-emerald-600 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
                </div>
              )}
              {!savedSuccess && <div />}

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

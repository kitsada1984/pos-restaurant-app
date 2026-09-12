'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Store, CreditCard, Receipt, Phone, MapPin, Loader2, Copy, Zap, ExternalLink, ShieldCheck, BellRing, RefreshCw, Smartphone } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AdminSettingsView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingBankWebhook, setTestingBankWebhook] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

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
    slipAutoCheckout: false,
    slipProvider: 'HYBRID',
    slipApiKey: '',
    slipBranchId: '',
    bankWebhookKey: '',
    bankAutoCheckout: true,
  });

  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }

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
            slipAutoCheckout: data.slipAutoCheckout ?? false,
            slipProvider: data.slipProvider || 'HYBRID',
            slipApiKey: data.slipApiKey || '',
            slipBranchId: data.slipBranchId || '',
            bankWebhookKey: data.bankWebhookKey || '',
            bankAutoCheckout: data.bankAutoCheckout ?? true,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showSuccess(`คัดลอก ${label} แล้ว 📋`, text);
    }
  };

  const handleRegenerateBankKey = async () => {
    if (!confirm('ต้องการสุ่ม Webhook Key ใหม่ใช่หรือไม่? (หากเปลี่ยน ต้องอัปเดตในแอปมือถือด้วย)')) return;
    setRegeneratingKey(true);
    try {
      const res = await fetch(`/api/r/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateBankKey: true }),
      });
      const data = await res.json();
      if (res.ok && data.bankWebhookKey) {
        setForm((prev) => ({ ...prev, bankWebhookKey: data.bankWebhookKey }));
        showSuccess('สุ่ม Webhook Key ใหม่เรียบร้อยแล้ว 🔑', data.bankWebhookKey);
      }
    } catch (e: any) {
      showError('ไม่สามารถสุ่มคีย์ใหม่ได้', e.message);
    } finally {
      setRegeneratingKey(false);
    }
  };

  const handleTestBankWebhook = async () => {
    setTestingBankWebhook(true);
    try {
      const mockTestAmount = 150;
      const res = await fetch(`/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'SCB Connect',
          text: `เงินเข้าบัญชี x-9999 จำนวน ฿${mockTestAmount}.00 จาก นาย กิตติศักดิ์ เมื่อ ${new Date().toLocaleDateString('th-TH')} ยอดเงินคงเหลือ ฿12,450.00`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('ส่งทดสอบสำเร็จแล้ว 🔔', data.message || `ยอด ฿${mockTestAmount} ถูกส่งเข้า POS แล้ว`);
      } else {
        showInfo('ส่งทดสอบแล้ว (เซิร์ฟเวอร์ตอบกลับ)', data.message || data.error);
      }
    } catch (e: any) {
      showError('เกิดข้อผิดพลาดในการทดสอบ', e.message);
    } finally {
      setTestingBankWebhook(false);
    }
  };

  const handleTestWebhook = async (channel: 'LINEMAN' | 'GRAB') => {
    setTestingWebhook(true);
    try {
      const endpoint = `/api/r/${slug}/webhooks/delivery/${channel === 'LINEMAN' ? 'lineman' : 'grab'}`;
      const mockPayload =
        channel === 'LINEMAN'
          ? {
              orderId: `LM-${Math.floor(1000 + Math.random() * 9000)}`,
              rider: { name: 'สมชาย พุ่มพวง (LINE MAN Rider)', phone: '0891234567' },
              customer: { name: 'คุณเอกชัย (ลูกค้า LINE MAN)' },
              items: [
                { name: 'ข้าวกะเพราหมูกรอบ', price: 65, quantity: 1, instruction: 'เผ็ดกลาง ไม่ใส่ชูรส' },
                { name: 'ไข่ดาว', price: 10, quantity: 1 },
              ],
              note: 'ทดสอบส่ง Webhook อัตโนมัติจาก LINE MAN Open API',
            }
          : {
              shortOrderNumber: `GF-${Math.floor(1000 + Math.random() * 9000)}`,
              driver: { name: 'วิชัย ใจดี (GrabFood Driver)', phone: '0819876543' },
              consumer: { name: 'คุณกิตติ (ลูกค้า GrabFood)' },
              items: [{ name: 'ข้าวผัดหมู', price: 55, quantity: 2, instruction: 'ขอพริกน้ำปลาเยอะๆ' }],
              specialInstructions: 'ทดสอบส่ง Webhook อัตโนมัติจาก GrabFood Partner API',
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });

      if (res.ok) {
        showSuccess(`ยิง Webhook จำลองจาก ${channel} สำเร็จ! 🛵✨`, 'ออเดอร์เด้งเข้าจอครัว KDS และตัดสต็อกวัตถุดิบอัตโนมัติแล้ว');
      } else {
        showError('ยิง Webhook ไม่สำเร็จ');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาดในการทดสอบ Webhook');
    } finally {
      setTestingWebhook(false);
    }
  };

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

          {/* Webhook Endpoints & API Partner Integration */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black">Webhook API Endpoints (สำหรับเชื่อมต่อตรงอัตโนมัติ 100%)</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                พร้อมใช้งาน
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              นำ URL ด้านล่างนี้ไปกรอกในระบบ LINE MAN Wongnai Open API หรือ Grab Partner Developer Portal เพื่อให้ออเดอร์เด้งเข้า POS และครัวอัตโนมัติ
            </p>

            <div className="space-y-2 text-xs">
              {/* LINE MAN Webhook URL */}
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] text-emerald-400 font-bold block">🟢 LINE MAN Webhook URL:</span>
                  <code className="text-[11px] text-slate-200 font-mono select-all truncate block">
                    {currentOrigin ? `${currentOrigin}/api/r/${slug}/webhooks/delivery/lineman` : `/api/r/${slug}/webhooks/delivery/lineman`}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${currentOrigin || 'https://pos-restaurant-app-psi.vercel.app'}/api/r/${slug}/webhooks/delivery/lineman`,
                      'LINE MAN Webhook URL'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1 flex-shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>คัดลอก</span>
                </button>
              </div>

              {/* Grab Webhook URL */}
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] text-emerald-400 font-bold block">🟢 GrabFood Webhook URL:</span>
                  <code className="text-[11px] text-slate-200 font-mono select-all truncate block">
                    {currentOrigin ? `${currentOrigin}/api/r/${slug}/webhooks/delivery/grab` : `/api/r/${slug}/webhooks/delivery/grab`}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${currentOrigin || 'https://pos-restaurant-app-psi.vercel.app'}/api/r/${slug}/webhooks/delivery/grab`,
                      'Grab Webhook URL'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1 flex-shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>คัดลอก</span>
                </button>
              </div>

              {/* Secret Token Field */}
              <div className="pt-2">
                <label className="block text-slate-300 font-bold text-[11px] mb-1">
                  Webhook Secret / Signature Token (รหัสความปลอดภัยจากแพลตฟอร์ม)
                </label>
                <input
                  type="text"
                  placeholder="เช่น lm_secret_key_xxxx หรือ grab_partner_secret_xxxx"
                  value={form.deliveryWebhookSecret}
                  onChange={(e) => setForm({ ...form, deliveryWebhookSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Test Simulation Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-bold">ทดสอบระบบอัตโนมัติ:</span>
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => handleTestWebhook('LINEMAN')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ ยิงจำลองออเดอร์ LINE MAN</span>
                </button>
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => handleTestWebhook('GRAB')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ ยิงจำลองออเดอร์ GrabFood</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Bank Transfer Slip Verification Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>ระบบอ่านและตรวจสอบสลิปโอนเงิน (Bank Slip Verification)</span>
          </h3>
          <p className="text-xs text-slate-500">
            ตั้งค่าระบบอ่านสลิปธนาคาร ป้องกันการใช้สลิปซ้ำ (Anti-Fraud) และกำหนดพฤติกรรมการปิดบิล
          </p>

          <div className="space-y-4">
            {/* Auto Checkout Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer">
                  <span>⚡ ปิดบิลและเคลียร์โต๊ะอัตโนมัติเมื่อสลิปผ่าน (Auto Checkout)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  หากเปิดใช้งาน: เมื่อระบบตรวจพบว่าสลิปถูกต้อง ยอดเงินตรง และไม่เป็นสลิปซ้ำ จะปิดบิลและเปิดโต๊ะให้อัตโนมัติทันที
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={form.slipAutoCheckout}
                  onChange={(e) => setForm({ ...form, slipAutoCheckout: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Provider Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  เครื่องมือตรวจสอบสลิป (Verification Engine)
                </label>
                <select
                  value={form.slipProvider}
                  onChange={(e) => setForm({ ...form, slipProvider: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="HYBRID">ระบบไฮบริด (ตรวจในตัวฟรี + API Gateway หากมี Key) (แนะนำ)</option>
                  <option value="INTERNAL">ตรวจด้วยระบบในตัวฟรี (Mini-QR + Anti-Duplicate Hash)</option>
                  <option value="SLIPOK">SlipOK API Gateway (เช็คเงินเข้าบัญชีธนาคารจริง)</option>
                  <option value="EASYSLIP">EasySlip API Gateway</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  ระบบในตัวสามารถอ่าน Mini-QR ตรวจยอดเงิน และบล็อกสลิปซ้ำได้ฟรีโดยไม่มีค่าใช้จ่าย
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  API Key (สำหรับ SlipOK หรือ EasySlip - ถ้ามี)
                </label>
                <input
                  type="password"
                  placeholder="กรอก API Key (เว้นว่างไว้เพื่อใช้ระบบฟรีในตัว)"
                  value={form.slipApiKey}
                  onChange={(e) => setForm({ ...form, slipApiKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {form.slipProvider === 'SLIPOK' && (
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Branch ID (SlipOK - ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    placeholder="รหัสสาขา SlipOK เช่น 12345 (ถ้ามี)"
                    value={form.slipBranchId}
                    onChange={(e) => setForm({ ...form, slipBranchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 6: Bank / LINE Incoming Money Notification Webhook */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <BellRing className="w-4 h-4 text-orange-500" />
              <span>ระบบรับแจ้งเตือนเงินเข้าอัตโนมัติ (LINE / ธนาคาร Webhook)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">
              ทุกธนาคารในไทย 🇹🇭
            </span>
          </div>
          <p className="text-xs text-slate-500">
            เมื่อมีเงินโอนเข้าบัญชีร้านค้า แอปบนมือถือ (เช่น MacroDroid / Notification Forwarder) จะจับข้อความแจ้งเตือนจาก LINE (SCB Connect, KBank Live, Krungthai Connext ฯลฯ) หรือแอปธนาคาร แล้วส่งยอดยิงเข้า POS ทันที
          </p>

          <div className="space-y-4">
            {/* Auto Checkout on Bank Notify */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer">
                  <span>⚡ ปิดบิลอัตโนมัติทันทีเมื่อยอดเงินตรงกับโต๊ะอาหาร (Auto-Match & Checkout)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  หากเปิดใช้งาน: เมื่อยอดเงินที่โอนเข้ามาตรงกับบิลโต๊ะอาหาร (1 โต๊ะพอดี) ระบบจะปิดบิล เคลียร์โต๊ะว่าง และสะสมแต้มให้อัตโนมัติทันที
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={form.bankAutoCheckout}
                  onChange={(e) => setForm({ ...form, bankAutoCheckout: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Webhook Endpoint URL */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-orange-500" />
                  <span>Webhook URL ประจำร้านของคุณ (นำไปใส่ในแอปบนมือถือ):</span>
                </label>
                <button
                  type="button"
                  onClick={handleTestBankWebhook}
                  disabled={testingBankWebhook}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{testingBankWebhook ? 'กำลังทดสอบ...' : '🧪 ทดสอบยิงเงินเข้า ฿150'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${currentOrigin}/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`}
                  className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(`${currentOrigin}/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`, 'Webhook URL')}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก URL</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-slate-500 gap-2">
                <div className="flex items-center gap-2">
                  <span>Secret Key: <strong className="font-mono text-slate-800">{form.bankWebhookKey || 'กำลังสร้าง...'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateBankKey}
                  disabled={regeneratingKey}
                  className="text-orange-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <RefreshCw className={`w-3 h-3 ${regeneratingKey ? 'animate-spin' : ''}`} />
                  <span>สุ่มคีย์ใหม่ (Regenerate Key)</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Setup Guide Accordion */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <div className="font-black flex items-center gap-1.5 text-amber-800">
                <span>📱 วิธีตั้งค่าให้ส่งแจ้งเตือนจากมือถือเข้า POS อัตโนมัติ (ทำครั้งเดียว ใช้ได้ตลอดไป):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 font-medium leading-relaxed pl-1">
                <li>
                  ติดตั้งแอปฟรี <strong>MacroDroid</strong> หรือ <strong>Notification Forwarder</strong> จาก Google Play Store บนมือถือที่รับแจ้งเตือน
                </li>
                <li>
                  สร้างคำสั่ง (Macro):
                  <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5 text-slate-600">
                    <li><strong>Trigger:</strong> เลือก <em>Notification Received</em> ➔ เลือกแอป <strong>LINE</strong> (หรือ K PLUS / SCB EASY / Krungthai NEXT)</li>
                    <li><strong>Action:</strong> เลือก <em>HTTP Request</em> ➔ Method เลือก <strong>POST</strong> ➔ วาง <strong>Webhook URL</strong> ด้านบนลงไป</li>
                    <li><strong>Content-Type:</strong> เลือก <code>application/json</code></li>
                    <li><strong>Body:</strong> ใส่ <code>{`{"text":"[not_text]","sender":"[not_title]"}`}</code></li>
                  </ul>
                </li>
                <li>
                  <strong>เสร็จสิ้น!</strong> เมื่อมีเงินโอนเข้าและ LINE แจ้งเตือน ระบบจะอ่านยอดเงินและปิดบิลที่หน้าจอ POS ให้ทันทีอัตโนมัติ ⚡
                </li>
              </ol>
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

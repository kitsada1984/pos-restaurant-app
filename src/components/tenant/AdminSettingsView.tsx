'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Store, CreditCard, Receipt, Phone, MapPin, Loader2, Copy, Zap, ExternalLink, ShieldCheck, BellRing, RefreshCw, Smartphone, HardDrive, ChevronDown, ChevronUp, Folder, Mail, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Printer } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/google-drive-template';
import { getBankEmailAppsScript } from '@/lib/bank-email-template';

export interface ServiceCallOption {
  id: string;
  icon: string;
  label: string;
  active: boolean;
}

export const DEFAULT_SERVICE_ITEMS: ServiceCallOption[] = [
  { id: 'srv-1', icon: '🌶️', label: 'ขอน้ำปลาพริก / พริกน้ำส้ม / เครื่องปรุง', active: true },
  { id: 'srv-2', icon: '🧊', label: 'ขอเติมน้ำแข็ง / น้ำดื่ม', active: true },
  { id: 'srv-3', icon: '🥢', label: 'ขอช้อนส้อม / ตะเกียบ / จานแบ่ง', active: true },
  { id: 'srv-4', icon: '🧻', label: 'ขอกระดาษทิชชู่', active: true },
  { id: 'srv-5', icon: '💵', label: 'เรียกเช็คบิล (ชำระด้วยเงินสด)', active: true },
  { id: 'srv-6', icon: '❓', label: 'สอบถามพนักงาน / ความช่วยเหลืออื่นๆ', active: true },
];

const PRESET_EMOJIS = ['🌶️', '🧊', '🥢', '🧻', '💵', '❓', '🍲', '🧂', '🥤', '🍽️', '🥣', '🛎️', '🧹', '👨‍🍳'];

export default function AdminSettingsView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [lastTestDeliveryOrderId, setLastTestDeliveryOrderId] = useState<string>('');
  const [testingBankWebhook, setTestingBankWebhook] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [testingGoogleDrive, setTestingGoogleDrive] = useState(false);
  const [googleDriveTestResult, setGoogleDriveTestResult] = useState<{ success: boolean; message: string; viewUrl?: string } | null>(null);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [bankNotifyTab, setBankNotifyTab] = useState<'EMAIL' | 'APP'>('EMAIL');

  const [form, setForm] = useState<{
    storeName: string;
    promptPayId: string;
    promptPayName: string;
    address: string;
    phone: string;
    receiptFooter: string;
    tableCount: number;
    linemanGp: number;
    grabGp: number;
    shopeeGp: number;
    robinhoodGp: number;
    deliveryWebhookSecret: string;
    slipAutoCheckout: boolean;
    slipProvider: string;
    slipApiKey: string;
    slipBranchId: string;
    bankWebhookKey: string;
    bankAutoCheckout: boolean;
    googleDriveFolderId: string;
    googleDriveWebhookUrl: string;
    serviceCallItems: ServiceCallOption[];
    autoPrintKitchenTicket: boolean;
    printerPaperWidth: string;
  }>({
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
    googleDriveFolderId: '',
    googleDriveWebhookUrl: '',
    serviceCallItems: DEFAULT_SERVICE_ITEMS,
    autoPrintKitchenTicket: false,
    printerPaperWidth: '80mm',
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
            googleDriveFolderId: data.googleDriveFolderId || '',
            googleDriveWebhookUrl: data.googleDriveWebhookUrl || '',
            serviceCallItems: (Array.isArray(data.serviceCallItems) && data.serviceCallItems.length > 0)
              ? data.serviceCallItems
              : DEFAULT_SERVICE_ITEMS,
            autoPrintKitchenTicket: data.autoPrintKitchenTicket ?? false,
            printerPaperWidth: data.printerPaperWidth || '80mm',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddServiceItem = () => {
    const newItem: ServiceCallOption = {
      id: `srv-${Date.now()}`,
      icon: '🛎️',
      label: 'บริการใหม่',
      active: true,
    };
    setForm((prev) => ({
      ...prev,
      serviceCallItems: [...prev.serviceCallItems, newItem],
    }));
  };

  const handleUpdateServiceItem = (id: string, updates: Partial<ServiceCallOption>) => {
    setForm((prev) => ({
      ...prev,
      serviceCallItems: prev.serviceCallItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const handleDeleteServiceItem = (id: string) => {
    setForm((prev) => ({
      ...prev,
      serviceCallItems: prev.serviceCallItems.filter((item) => item.id !== id),
    }));
  };

  const handleMoveServiceItem = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const items = [...prev.serviceCallItems];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return prev;
      const temp = items[index];
      items[index] = items[targetIndex];
      items[targetIndex] = temp;
      return { ...prev, serviceCallItems: items };
    });
  };

  const handleRestoreDefaultServiceItems = () => {
    setForm((prev) => ({
      ...prev,
      serviceCallItems: DEFAULT_SERVICE_ITEMS,
    }));
    showInfo('โหลดค่าเริ่มต้น 6 รายการแล้ว', 'อย่าลืมกด "บันทึกการตั้งค่าร้าน" ด้านล่าง');
  };

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showSuccess(`คัดลอก ${label} แล้ว 📋`, text);
    }
  };

  const handleTestGoogleDrive = async () => {
    if (!form.googleDriveWebhookUrl) {
      showError('กรุณาระบุ Webhook URL', 'กรุณากรอก Google Apps Script Webhook URL ก่อนกดทดสอบ');
      return;
    }
    setTestingGoogleDrive(true);
    setGoogleDriveTestResult(null);
    try {
      const res = await fetch(`/api/r/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testGoogleDrive: true,
          googleDriveWebhookUrl: form.googleDriveWebhookUrl,
          googleDriveFolderId: form.googleDriveFolderId,
        }),
      });
      const data = await res.json();
      const isSuccess = Boolean(data.success || data.testResult?.success);
      const resultMessage = data.message || data.testResult?.message || 'เชื่อมต่อ Google Drive สำเร็จ! ไฟล์ทดสอบถูกบันทึกลงไดรฟ์เรียบร้อย';
      const viewUrl = data.data?.viewUrl || data.testResult?.data?.viewUrl || data.viewUrl;

      if (res.ok && isSuccess) {
        if (data.correctedUrl) {
          setForm((prev) => ({ ...prev, googleDriveWebhookUrl: data.correctedUrl }));
        }
        setGoogleDriveTestResult({
          success: true,
          message: resultMessage,
          viewUrl,
        });
        showSuccess('เชื่อมต่อ Google Drive สำเร็จ! 🎉', resultMessage);
      } else {
        const errMsg = data.message || data.testResult?.message || data.error || 'เชื่อมต่อ Google Drive ไม่สำเร็จ ตรวจสอบ Webhook URL หรือการ Deploy';
        setGoogleDriveTestResult({ success: false, message: errMsg });
        showError('ทดสอบ Google Drive ไม่สำเร็จ', errMsg);
      }
    } catch (e: any) {
      setGoogleDriveTestResult({ success: false, message: e.message });
      showError('เกิดข้อผิดพลาดในการทดสอบ', e.message);
    } finally {
      setTestingGoogleDrive(false);
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

  const handleTestBankEmailWebhook = async (bankName: 'KBANK' | 'SCB' = 'KBANK') => {
    setTestingBankWebhook(true);
    try {
      const mockTestAmount = 150;
      const payload = bankName === 'KBANK'
        ? {
            sender: 'K-eMail Alert (kasikornbank.com)',
            title: 'K-eMail Alert: แจ้งเงินเข้าบัญชี x-9999',
            text: `ธนาคารกสิกรไทย เงินเข้าบัญชี x-9999 จำนวน ${mockTestAmount}.00 บาท เมื่อ ${new Date().toLocaleTimeString('th-TH')} ยอดเงินคงเหลือ 15,200.00 บาท`,
          }
        : {
            sender: 'SCB Email Alert (scb.co.th)',
            title: 'SCB Alert: รายการเงินเข้าบัญชี PromptPay',
            text: `ธนาคารไทยพาณิชย์ รายการเงินโอนเข้าบัญชีพร้อมเพย์ จำนวน ฿${mockTestAmount}.00 เมื่อ ${new Date().toLocaleTimeString('th-TH')} คงเหลือ 18,350.00 บาท`,
          };

      const res = await fetch(`/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`จำลองอีเมลเงินเข้า ฿${mockTestAmount} (${bankName}) สำเร็จ! 📧✨`, data.message || 'ส่งสัญญาณแจ้งเตือนและส่งเสียงพูดไปยังหน้าจอ POS แล้ว');
      } else {
        showInfo('ส่งทดสอบแล้ว (เซิร์ฟเวอร์ตอบกลับ)', data.message || data.error);
      }
    } catch (e: any) {
      showError('เกิดข้อผิดพลาดในการทดสอบอีเมล', e.message);
    } finally {
      setTestingBankWebhook(false);
    }
  };


  const handleTestWebhook = async (channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'CANCEL') => {
    setTestingWebhook(true);
    try {
      const endpoint = `/api/r/${slug}/webhooks/delivery/klikit`;
      let mockPayload: any;

      if (channel === 'CANCEL') {
        const orderIdToCancel = lastTestDeliveryOrderId || `LM-${Math.floor(1000 + Math.random() * 9000)}`;
        mockPayload = {
          event: 'ORDER_CANCELLED',
          orderId: orderIdToCancel,
          reason: 'ลูกค้ายกเลิกผ่านแอปเดลิเวอรี (Klikit)',
          cancelReason: 'Customer requested cancellation via delivery app',
        };
      } else if (channel === 'LINEMAN') {
        const newOrderId = `LM-${Math.floor(1000 + Math.random() * 9000)}`;
        setLastTestDeliveryOrderId(newOrderId);
        mockPayload = {
          channel: 'LINEMAN',
          orderId: newOrderId,
          rider: { name: 'สมชาย พุ่มพวง (LINE MAN Rider)', phone: '0891234567' },
          customer: { name: 'คุณเอกชัย (ลูกค้า LINE MAN)' },
          items: [
            { name: 'ข้าวกะเพราหมูกรอบ', price: 65, quantity: 1, instruction: 'เผ็ดกลาง ไม่ใส่ชูรส' },
            { name: 'ไข่ดาว', price: 10, quantity: 1 },
          ],
          note: 'ทดสอบส่ง Webhook ผ่านตัวกลาง Klikit (LINE MAN)',
        };
      } else if (channel === 'GRAB') {
        const newOrderId = `GF-${Math.floor(1000 + Math.random() * 9000)}`;
        setLastTestDeliveryOrderId(newOrderId);
        mockPayload = {
          channel: 'GRAB',
          shortOrderNumber: newOrderId,
          driver: { name: 'วิชัย ใจดี (GrabFood Driver)', phone: '0819876543' },
          consumer: { name: 'คุณกิตติ (ลูกค้า GrabFood)' },
          items: [{ name: 'ข้าวผัดหมู', price: 55, quantity: 2, instruction: 'ขอพริกน้ำปลาเยอะๆ' }],
          specialInstructions: 'ทดสอบส่ง Webhook ผ่านตัวกลาง Klikit (GrabFood)',
        };
      } else {
        const newOrderId = `SF-${Math.floor(1000 + Math.random() * 9000)}`;
        setLastTestDeliveryOrderId(newOrderId);
        mockPayload = {
          channel: 'SHOPEE_FOOD',
          orderId: newOrderId,
          rider: { name: 'สุรชัย ว่องไว (ShopeeFood Rider)', phone: '0854321098' },
          customer: { name: 'คุณพิมพ์ใจ (ลูกค้า ShopeeFood)' },
          items: [
            { name: 'ข้าวกะเพราหมูกรอบ', price: 65, quantity: 1, instruction: 'เผ็ดน้อย' },
            { name: 'ไข่เจียว', price: 15, quantity: 1 },
          ],
          note: 'ทดสอบส่ง Webhook ผ่านตัวกลาง Klikit (ShopeeFood)',
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(form.deliveryWebhookSecret ? { 'x-klikit-signature': form.deliveryWebhookSecret } : {}),
        },
        body: JSON.stringify(mockPayload),
      });

      const data = await res.json();
      if (res.ok) {
        if (channel === 'CANCEL') {
          showSuccess('จำลองยกเลิกออเดอร์สำเร็จ! 🚫✨', `ออเดอร์ ${mockPayload.orderId} เปลี่ยนเป็นยกเลิกและคืนสต็อกเรียบร้อย`);
        } else {
          showSuccess(
            `ยิง Webhook Klikit (${channel}) สำเร็จ! 🛵✨`,
            `ออเดอร์ #${data.deliveryOrderId || mockPayload.orderId} เด้งเข้าจอครัว KDS และตัดสต็อกอัตโนมัติแล้ว`
          );
        }
      } else {
        showError('ยิง Webhook ไม่สำเร็จ', data.error || 'ตรวจสอบ Secret Token หรือการเชื่อมต่อ');
      }
    } catch (e: any) {
      showError('เกิดข้อผิดพลาดในการทดสอบ Webhook', e?.message);
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

        {/* Section: Thermal Printer & Auto-Print Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>เครื่องพิมพ์ความร้อน &amp; การพิมพ์ออเดอร์อัตโนมัติ (Thermal Printer &amp; Auto-Print)</span>
          </h3>
          <p className="text-xs text-slate-500">
            ตั้งค่าการพิมพ์ใบสั่งอาหารส่งครัว (Kitchen Ticket / KOT) อัตโนมัติเมื่อมีออเดอร์ใหม่เข้าสู่ระบบ
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Auto Print Kitchen Ticket Toggle */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-900 font-extrabold flex items-center space-x-2 cursor-pointer">
                  <span>พิมพ์ใบสั่งอาหารเข้าครัวอัตโนมัติ</span>
                </label>
                <input
                  type="checkbox"
                  checked={form.autoPrintKitchenTicket}
                  onChange={(e) => setForm({ ...form, autoPrintKitchenTicket: e.target.checked })}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                เมื่อมีออเดอร์ใหม่ (ลูกค้าสแกนสั่ง, แคชเชียร์คีย์ หรือเดลิเวอรี) หน้าจอห้องครัว KDS จะสั่งพิมพ์ใบสั่งอาหารส่งครัวอัตโนมัติทันที
              </p>
            </div>

            {/* Printer Paper Width */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="block text-slate-900 font-extrabold">ขนาดหน้ากว้างกระดาษความร้อน</label>
              <select
                value={form.printerPaperWidth}
                onChange={(e) => setForm({ ...form, printerPaperWidth: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="80mm">80 มม. (80mm - เครื่องพิมพ์ตั้งโต๊ะมาตรฐาน)</option>
                <option value="58mm">58 มม. (58mm - เครื่องพิมพ์พกพา / ขนาดเล็ก)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                ระบบจะปรับสเกลใบเสร็จและความกว้างของตารางให้พอดีกับกระดาษอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Kiosk Mode Tip */}
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2.5">
            <span className="text-base flex-shrink-0">💡</span>
            <div className="space-y-1">
              <p className="font-extrabold">เคล็ดลับการพิมพ์ทันทีโดยไม่ต้องกดยืนยัน (Silent Auto-Printing):</p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                หากเปิดเบราว์เซอร์ Google Chrome หรือ Microsoft Edge ด้วยพารามิเตอร์ <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold">--kiosk --kiosk-printing</code> เบราว์เซอร์จะสั่งพิมพ์ไปยังเครื่องพิมพ์เริ่มต้นทันทีโดยไม่ต้องคลิกปุ่มพิมพ์ในหน้าต่าง Preview
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Delivery Platforms & GP Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <span>🛵 การตั้งค่าเดลิเวอรี &amp; ค่า GP (Delivery Platforms &amp; GP Settings)</span>
          </h3>
          <p className="text-xs text-slate-500">
            กำหนด % GP ที่แต่ละแอปหัก เพื่อให้ระบบคำนวณกำไรและรายได้สุทธิ (Net Revenue) ที่ร้านจะได้รับจริงแบบอัตโนมัติเมื่อออเดอร์ส่งเข้ามาผ่านตัวกลาง Klikit
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

          {/* Unified Klikit Webhook Integration Card */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black">🚀 ระบบเชื่อมต่อเดลิเวอรีผ่านตัวกลาง Klikit (klikit.io Unified Delivery Hub)</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                เชื่อมต่อจุดเดียว ครอบคลุมทุกค่าย
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              นำ Webhook URL ด้านล่างนี้ไปผูกในระบบ <span className="text-amber-300 font-bold">Klikit Portal (klikit.io)</span> เพียงจุดเดียว ระบบจะรับออเดอร์เดลิเวอรีทุกแพลตฟอร์ม (LINE MAN, Grab, ShopeeFood, Foodpanda, Robinhood) เข้าสู่หน้าจอแคชเชียร์ POS และจอครัว KDS อัตโนมัติ พร้อมคำนวณหัก GP ตามค่าย และตัดสต็อกวัตถุดิบทันที
            </p>

            <div className="space-y-2 text-xs">
              {/* Klikit Unified Webhook URL */}
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] text-amber-400 font-bold block">🌐 Klikit Unified Webhook URL:</span>
                  <code className="text-[11px] text-slate-200 font-mono select-all truncate block">
                    {currentOrigin ? `${currentOrigin}/api/r/${slug}/webhooks/delivery/klikit` : `/api/r/${slug}/webhooks/delivery/klikit`}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${currentOrigin || 'https://pos-restaurant-app-psi.vercel.app'}/api/r/${slug}/webhooks/delivery/klikit`,
                      'Klikit Webhook URL'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black flex items-center space-x-1 flex-shrink-0 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  <span>คัดลอก</span>
                </button>
              </div>

              {/* Secret Token Field */}
              <div className="pt-2">
                <label className="block text-slate-300 font-bold text-[11px] mb-1">
                  Klikit Webhook Secret / Signature Token (รหัสความปลอดภัยจาก Klikit)
                </label>
                <input
                  type="text"
                  placeholder="เช่น klikit_sec_xxxx หรือ token ยืนยันความถูกต้อง"
                  value={form.deliveryWebhookSecret}
                  onChange={(e) => setForm({ ...form, deliveryWebhookSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Test Simulation Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-bold">จำลองออเดอร์ Klikit:</span>
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => handleTestWebhook('LINEMAN')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ ยิงจำลอง LINE MAN</span>
                </button>
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => handleTestWebhook('GRAB')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ ยิงจำลอง GrabFood</span>
                </button>
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => handleTestWebhook('SHOPEE_FOOD')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600 border border-amber-500/50 text-amber-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ ยิงจำลอง ShopeeFood</span>
                </button>
                <button
                  type="button"
                  disabled={testingWebhook}
                  onClick={() => handleTestWebhook('CANCEL')}
                  className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-red-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>🚫 ยิงจำลองยกเลิกออเดอร์</span>
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

        {/* Section 5.5: Google Drive & Local Disk Slip Storage */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>ที่จัดเก็บรูปสลิปโอนเงิน (Google Drive &amp; โฟลเดอร์เซิร์ฟเวอร์)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              ลดขนาด DB 100% 🚀
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            ระบบแก้ปัญหาฐานข้อมูลบวม โดย<strong>ไม่เก็บรูปภาพขนาดใหญ่ (Base64) ลงใน Supabase PostgreSQL</strong> แต่จะอัปโหลดไปเก็บที่ Google Drive ส่วนตัวของคุณ (ฟรี 15GB) หรือบันทึกลงโฟลเดอร์เซิร์ฟเวอร์สำรอง และเก็บเฉพาะ URL ขนาดเล็กลงฐานข้อมูลเท่านั้น
          </p>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-800 font-bold">
                    Google Apps Script Webhook URL (สำหรับส่งรูปไป Google Drive)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const latestUrl = 'https://script.google.com/macros/s/AKfycbw3SHPGQN2z4op26gJ2IAHTA3RVxakKlZK9Lj6IrTaES85XcmjyCLV0gdCnD1Xv4AFM/exec';
                      setForm({ ...form, googleDriveWebhookUrl: latestUrl });
                      showSuccess('เปลี่ยนเป็น URL ล่าสุดแล้ว ✨', 'กดปุ่มทดสอบเชื่อมต่อ Google Drive ได้เลยครับ');
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                  >
                    <span>⚡ ใส่ URL ล่าสุดของระบบอัตโนมัติ</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={form.googleDriveWebhookUrl}
                  onChange={(e) => setForm({ ...form, googleDriveWebhookUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {(form.googleDriveWebhookUrl.includes('zsxxYWIcg') || form.googleDriveWebhookUrl.includes('AKfycbrzsxx')) && (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-between">
                    <span>⚠️ URL นี้เป็น URL เก่าที่ส่งผลลัพธ์ 404 (ไม่มีอยู่ในระบบ) กรุณากดปุ่มเพื่อเปลี่ยนเป็น URL ล่าสุด</span>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, googleDriveWebhookUrl: 'https://script.google.com/macros/s/AKfycbw3SHPGQN2z4op26gJ2IAHTA3RVxakKlZK9Lj6IrTaES85XcmjyCLV0gdCnD1Xv4AFM/exec' }))}
                      className="ml-2 px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-extrabold text-[10px] whitespace-nowrap"
                    >
                      เปลี่ยนเป็น URL ล่าสุดทันที
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  นำ URL ที่ได้จากการ Deploy Web App ของ Google Apps Script มาวางที่นี่
                </p>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Google Drive Folder ID (โฟลเดอร์จัดเก็บ - ถ้าไม่ใส่จะบันทึกลงหน้าแรกของ Drive)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Folder className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="เช่น 1a2B3c4D5e... (ดูจาก URL โฟลเดอร์)"
                      value={form.googleDriveFolderId}
                      onChange={(e) => setForm({ ...form, googleDriveFolderId: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleTestGoogleDrive}
                  disabled={testingGoogleDrive || !form.googleDriveWebhookUrl}
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{testingGoogleDrive ? 'กำลังทดสอบส่งรูปเข้า Drive...' : '⚡ ทดสอบเชื่อมต่อ Google Drive'}</span>
                </button>
              </div>
            </div>

            {/* Test Result Message */}
            {googleDriveTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  googleDriveTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {googleDriveTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold">{googleDriveTestResult.message}</p>
                  {googleDriveTestResult.viewUrl && (
                    <a
                      href={googleDriveTestResult.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-mono text-[11px] inline-flex items-center gap-1 mt-1 hover:text-emerald-900"
                    >
                      <span>เปิดดูไฟล์ทดสอบบน Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Fallback & Safety Note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <span>🛡️ ความปลอดภัย &amp; ระบบสำรองเซิร์ฟเวอร์:</span>
              </div>
              <p>
                • หากยังไม่ได้เชื่อมต่อ Google Drive หรือเน็ตเวิร์กขัดข้อง ระบบจะบันทึกรูปลงโฟลเดอร์ในเซิร์ฟเวอร์ (<code>public/uploads/slips/</code>) อัตโนมัติ ป้องกันรูปสลิปหาย
              </p>
              <p>
                • ฐานข้อมูล Supabase PostgreSQL จะเก็บเฉพาะลิงก์ CDN ขนาดเล็กเพียงไม่กี่ไบต์เท่านั้น หมดกังวลเรื่องพื้นที่ฐานข้อมูลเต็ม
              </p>
            </div>

            {/* Collapsible Setup Guide */}
            <div className="border border-emerald-200/70 rounded-xl overflow-hidden bg-emerald-50/40">
              <button
                type="button"
                onClick={() => setShowScriptGuide(!showScriptGuide)}
                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-emerald-900 hover:bg-emerald-100/50 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span>📖 วิธีติดตั้ง Google Apps Script สำหรับเชื่อมต่อ Google Drive ฟรี (ใช้เวลา 2 นาที)</span>
                </span>
                {showScriptGuide ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
              </button>

              {showScriptGuide && (
                <div className="p-4 border-t border-emerald-200/70 space-y-3 text-xs text-slate-700 bg-white">
                  <ol className="list-decimal list-inside space-y-2 font-medium pl-1">
                    <li>
                      เปิดเว็บ <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold underline inline-flex items-center gap-0.5">Google Apps Script <ExternalLink className="w-3 h-3 inline" /></a> แล้วกด <strong>&quot;โครงการใหม่&quot; (New project)</strong>
                    </li>
                    <li>
                      คัดลอกโค้ดด้านล่างนี้ไปวางแทนที่โค้ดเดิมใน <code>Code.gs</code> ทั้งหมด:
                      <div className="mt-2 relative">
                        <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 select-all">
                          {GOOGLE_APPS_SCRIPT_TEMPLATE}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopy(GOOGLE_APPS_SCRIPT_TEMPLATE, 'โค้ด Google Apps Script')}
                          className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow"
                        >
                          <Copy className="w-3 h-3" />
                          <span>คัดลอกโค้ด</span>
                        </button>
                      </div>
                    </li>
                    <li>
                      กดปุ่ม <strong>&quot;การทำให้ใช้งานได้&quot; (Deploy)</strong> มุมบนขวา ➔ เลือก <strong>&quot;การทำให้ใช้งานได้รายการใหม่&quot; (New deployment)</strong>
                      <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-600">
                        <li>คลิกรูปเฟืองเลือกประเภท: <strong>เว็บแอป (Web app)</strong></li>
                        <li>เรียกใช้ในฐานะ (Execute as): <strong>ฉัน (Me)</strong></li>
                        <li>ผู้มีสิทธิ์เข้าถึง (Who has access): <strong>ทุกคน (Anyone)</strong> <em>(สำคัญมาก เพื่อให้ระบบส่งรูปเข้าได้)</em></li>
                        <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> แล้วคัดลอก <strong>URL เว็บแอป</strong> มาวางในช่องด้านบน</li>
                      </ul>
                    </li>
                    <li>
                      <em>(ไม่บังคับ)</em> หากต้องการเก็บในโฟลเดอร์เฉพาะ ให้สร้างโฟลเดอร์ใน Google Drive แล้วคัดลอกรหัส Folder ID ท้าย URL (เช่น <code>drive.google.com/drive/folders/<b>1abc...xyz</b></code>) มากรอกในช่อง Google Drive Folder ID
                    </li>
                  </ol>
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
              <span>ระบบรับแจ้งเตือนเงินเข้าอัตโนมัติ (Bank Incoming Notification)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">
              ทุกธนาคารในไทย 🇹🇭
            </span>
          </div>
          <p className="text-xs text-slate-500">
            ระบบรองรับการแจ้งเตือนเงินโอนเข้า ทั้งผ่าน <strong>หน้าเว็บโดยตรง (Direct Web - ฟรี ไม่ต้องตั้งค่า)</strong>, <strong>อีเมลธนาคาร (Gmail Automation)</strong> และ <strong>แอปบนมือถือ (MacroDroid)</strong> พร้อมระบบอ่านออกเสียงภาษาไทย
          </p>

          <div className="space-y-4">
            {/* Direct Web Notification Highlight */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 text-emerald-950 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-900">
                    ระบบแจ้งเตือนเงินเข้าผ่านเว็บโดยตรง (Direct Web Notification) - เปิดใช้งานแล้ว 100% ฟรี!
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-sm w-fit">
                  ใช้งานได้ทันที ไม่ต้องตั้งค่า
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                เมื่อลูกค้าอยู่ที่โต๊ะอาหาร สแกน QR โอนเงินแล้วกดปุ่ม <strong>"✅ ฉันโอนเงินเรียบร้อยแล้ว (แจ้งแคชเชียร์)"</strong> หรือแนบรูปสลิป
                หน้าจอ POS ของแคชเชียร์จะ<strong>ส่งเสียงพูดภาษาไทย</strong> (เช่น <em>"เงินเข้า โต๊ะ 1 50 บาท เรียบร้อยค่ะ"</em>) พร้อมป๊อปอัพขึ้นเตือนทันที 
                <strong>คุณไม่จำเป็นต้องติดตั้ง MacroDroid หรือตั้งค่าอีเมลใดๆ</strong>
              </p>
            </div>
            {/* Auto Checkout on Bank Notify */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer">
                  <span>⚡ ปิดบิลอัตโนมัติทันทีเมื่อยอดเงินตรงกับโต๊ะอาหาร (Auto-Match & Checkout)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  • หาก<strong>เปิดใช้งาน</strong>: เมื่อยอดเงินตรงกับโต๊ะอาหาร ระบบจะปิดบิล เคลียร์โต๊ะ และสะสมแต้มให้อัตโนมัติทันที<br />
                  • หาก<strong>ปิดไว้</strong>: ระบบจะส่งเสียงพูดภาษาไทยแจ้งเตือน และเปิดหน้าต่างให้แคชเชียร์กดปุ่มยืนยันปิดบิลเอง
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

            {/* Mode Tabs: Gmail Email Alert vs Mobile App */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setBankNotifyTab('EMAIL')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
                  bankNotifyTab === 'EMAIL'
                    ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>📧 อีเมลธนาคาร (Gmail Alert) ⭐ แนะนำ - ไม่ต้องใช้ MacroDroid</span>
              </button>
              <button
                type="button"
                onClick={() => setBankNotifyTab('APP')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
                  bankNotifyTab === 'APP'
                    ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>📱 แอปบนมือถือ (MacroDroid / LINE)</span>
              </button>
            </div>

            {/* TAB 1: Gmail Bank Email Automation */}
            {bankNotifyTab === 'EMAIL' && (
              <div className="space-y-4">
                {/* Webhook URL & Quick Test */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-orange-500" />
                      <span>Webhook URL ประจำร้าน (สำหรับรับข้อมูลจาก Google Apps Script):</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestBankEmailWebhook('KBANK')}
                        disabled={testingBankWebhook}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>{testingBankWebhook ? '...' : '🧪 จำลอง KBank (฿150)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestBankEmailWebhook('SCB')}
                        disabled={testingBankWebhook}
                        className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>{testingBankWebhook ? '...' : '🧪 จำลอง SCB (฿150)'}</span>
                      </button>
                    </div>
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
                </div>

                {/* Setup Guide Step-by-Step */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 space-y-3">
                  <div className="font-extrabold flex items-center gap-1.5 text-emerald-900 text-sm">
                    <span>🚀 วิธีติดตั้งระบบตรวจจับอีเมลเงินเข้าอัตโนมัติ (ทำเพียง 2 นาที ฟรี 100%):</span>
                  </div>

                  <ol className="list-decimal list-inside space-y-2 font-medium pl-1 leading-relaxed">
                    <li>
                      เปิดเว็บ <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-3 h-3 inline" /></a> ด้วยบัญชี <strong>Gmail ของร้าน</strong> แล้วกด <strong>&quot;โครงการใหม่&quot; (New project)</strong>
                    </li>
                    <li>
                      คัดลอกโค้ดด้านล่างนี้ไปวางทับโค้ดเดิมใน <code>Code.gs</code> ทั้งหมด แล้วกดบันทึก (Ctrl + S):
                      <div className="mt-2 relative">
                        <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 select-all leading-normal">
                          {getBankEmailAppsScript(`${currentOrigin || 'https://pos-restaurant-app-psi.vercel.app'}/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`)}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopy(
                            getBankEmailAppsScript(`${currentOrigin || 'https://pos-restaurant-app-psi.vercel.app'}/api/r/${slug}/webhooks/bank-notify?key=${form.bankWebhookKey}`),
                            'โค้ด Google Apps Script ตรวจจับอีเมลธนาคาร'
                          )}
                          className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow"
                        >
                          <Copy className="w-3 h-3" />
                          <span>คัดลอกโค้ดสคริปต์</span>
                        </button>
                      </div>
                    </li>
                    <li>
                      เลือกฟังก์ชัน <strong>&quot;installTrigger&quot;</strong> จากเมนูด้านบน แล้วกดปุ่ม <strong>&quot;เรียกใช้&quot; (Run)</strong> 1 ครั้ง:
                      <p className="text-[11px] text-slate-600 pl-4 pt-1">
                        • กดยอมรับสิทธิ์ (Review permissions ➔ เลือกบัญชี Gmail ➔ กด Advanced ➔ Go to Untitled project)
                        <br />
                        • <strong>เสร็จสิ้น!</strong> สคริปต์จะเริ่มทำงานบน Google Cloud คอยตรวจสอบอีเมลเงินเข้าทุก 1 นาทีตลอด 24 ชั่วโมง โดยไม่ต้องเปิดมือถือหรือติดตั้งโปรแกรมใดๆ
                      </p>
                    </li>
                  </ol>

                  {/* How to enable email alerts in Thai banks */}
                  <div className="mt-3 pt-3 border-t border-emerald-200/80 space-y-1.5 text-[11px]">
                    <div className="font-bold text-emerald-950">📲 วิธีเปิดรับอีเมลแจ้งเตือนเงินเข้าฟรีในแอปธนาคาร:</div>
                    <ul className="list-disc list-inside pl-2 space-y-1 text-slate-700">
                      <li><strong>ธนาคารกสิกรไทย (KBank):</strong> เข้าแอป K PLUS ➔ เมนู &quot;บริการอื่นๆ&quot; ➔ เลือก &quot;K-eMail Alert&quot; ➔ กรอก Gmail ของร้านและกดยืนยัน (ฟรีไม่มีค่าบริการ)</li>
                      <li><strong>ธนาคารไทยพาณิชย์ (SCB):</strong> เข้าแอป SCB EASY ➔ เมนูตั้งค่า ➔ การแจ้งเตือน ➔ เลือก &quot;อีเมลแจ้งเตือน&quot; และเปิดใช้งาน</li>
                      <li><strong>ธนาคารกรุงไทย (Krungthai):</strong> เข้าแอป Krungthai NEXT ➔ เมนูตั้งค่า ➔ การแจ้งเตือนผ่านอีเมล</li>
                      <li><strong>ธนาคารอื่นๆ (BBL / ttb / GSB):</strong> เปิดบริการแจ้งเตือนเงินเข้าผ่านอีเมลในแอปของธนาคารนั้นๆ ไปยัง Gmail ของร้าน</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Mobile App (MacroDroid) */}
            {bankNotifyTab === 'APP' && (
              <div className="space-y-4">
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
            )}
          </div>
        </div>

        {/* Section: Service Call Items */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-orange-500" />
                <span>จัดการปุ่มเรียกพนักงานจากโต๊ะลูกค้า (Service Call Options)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                กำหนดรายการที่ลูกค้าจะเห็นเมื่อกดปุ่ม 🔔 บนมือถือ (เพิ่ม, ลบ, แก้ไขชื่อ/ไอคอน, เปิด-ปิด, และจัดเรียง)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDefaultServiceItems}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                title="กู้คืนรายการมาตรฐาน 6 อย่าง"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>โหลดค่าเริ่มต้น 6 รายการ</span>
              </button>
              <button
                type="button"
                onClick={handleAddServiceItem}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการใหม่</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {form.serviceCallItems && form.serviceCallItems.length > 0 ? (
              form.serviceCallItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                    item.active
                      ? 'bg-slate-50/70 border-slate-200/90'
                      : 'bg-slate-100/60 border-slate-200/50 opacity-60'
                  }`}
                >
                  {/* Order & Up-Down buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      {idx + 1}
                    </span>
                    <div className="flex flex-row sm:flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveServiceItem(idx, 'up')}
                        className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 disabled:opacity-20 transition-all"
                        title="เลื่อนขึ้น"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === form.serviceCallItems.length - 1}
                        onClick={() => handleMoveServiceItem(idx, 'down')}
                        className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 disabled:opacity-20 transition-all"
                        title="เลื่อนลง"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Emoji Icon selector / input */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        value={item.icon}
                        onChange={(e) => handleUpdateServiceItem(item.id, { icon: e.target.value })}
                        className="w-12 h-10 text-center text-xl bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                        maxLength={4}
                        title="พิมพ์หรือเปลี่ยนอิโมจิ"
                      />
                    </div>
                    {/* Quick emoji presets */}
                    <div className="hidden lg:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/70">
                      {PRESET_EMOJIS.slice(0, 6).map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleUpdateServiceItem(item.id, { icon: em })}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-slate-100 transition-all ${
                            item.icon === em ? 'bg-orange-100 ring-1 ring-orange-400' : ''
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Label text input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.label}
                      placeholder="เช่น ขอน้ำปลาพริก หรือ ขอเติมน้ำดื่ม"
                      onChange={(e) => handleUpdateServiceItem(item.id, { label: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                    />
                  </div>

                  {/* Action Controls: Active Toggle & Delete */}
                  <div className="flex items-center justify-end gap-3 flex-shrink-0">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => handleUpdateServiceItem(item.id, { active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                      <span className={`text-[11px] font-bold ${item.active ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {item.active ? 'เปิดใช้' : 'ปิดชั่วคราว'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteServiceItem(item.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 space-y-2">
                <p className="text-xs">ยังไม่มีรายการปุ่มเรียกพนักงาน</p>
                <button
                  type="button"
                  onClick={handleRestoreDefaultServiceItems}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-all inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>โหลดค่าเริ่มต้น 6 รายการ</span>
                </button>
              </div>
            )}
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

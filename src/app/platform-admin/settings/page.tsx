'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle2, Loader2, CreditCard, Building2, Phone, MessageSquare } from 'lucide-react';

export default function PlatformAdminSettingsPage() {
  const [setting, setSetting] = useState<any>({
    platformName: '',
    bankName: '',
    bankAccountNo: '',
    bankAccountName: '',
    promptPayId: '',
    contactLine: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/platform-admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.setting) setSetting(data.setting);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/platform-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setting),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          บัญชีรับเงิน &amp; ข้อมูลแพลตฟอร์ม
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          ข้อมูลบัญชีธนาคารและพร้อมเพย์นี้จะแสดงให้เจ้าของร้านเห็นเมื่อต้องการโอนเงินต่ออายุสมาชิก
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        {saved && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Building2 className="w-4 h-4 text-orange-400" />
            <span>ข้อมูลแบรนด์แพลตฟอร์ม</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              ชื่อระบบ / แพลตฟอร์ม POS
            </label>
            <input
              type="text"
              value={setting.platformName}
              onChange={(e) => setSetting({ ...setting, platformName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>บัญชีธนาคาร &amp; พร้อมเพย์รับเงินค่าบริการ SaaS</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ธนาคาร (Bank Name)
              </label>
              <input
                type="text"
                placeholder="เช่น ธนาคารกสิกรไทย (KBANK)"
                value={setting.bankName}
                onChange={(e) => setSetting({ ...setting, bankName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                เลขที่บัญชี (Account No.)
              </label>
              <input
                type="text"
                placeholder="123-4-56789-0"
                value={setting.bankAccountNo}
                onChange={(e) => setSetting({ ...setting, bankAccountNo: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ชื่อบัญชี (Account Name)
              </label>
              <input
                type="text"
                placeholder="บจก. ออร์เดียโอ โซลูชั่นส์"
                value={setting.bankAccountName}
                onChange={(e) => setSetting({ ...setting, bankAccountName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                เบอร์พร้อมเพย์รับเงิน (PromptPay ID)
              </label>
              <input
                type="text"
                placeholder="0812345678"
                value={setting.promptPayId}
                onChange={(e) => setSetting({ ...setting, promptPayId: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Phone className="w-4 h-4 text-amber-400" />
            <span>ช่องทางติดต่อ Support แพลตฟอร์ม</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                LINE Official Account
              </label>
              <input
                type="text"
                placeholder="@ordeopos"
                value={setting.contactLine}
                onChange={(e) => setSetting({ ...setting, contactLine: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                เบอร์โทรติดต่อ Support
              </label>
              <input
                type="text"
                placeholder="081-234-5678"
                value={setting.contactPhone}
                onChange={(e) => setSetting({ ...setting, contactPhone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลแพลตฟอร์ม</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

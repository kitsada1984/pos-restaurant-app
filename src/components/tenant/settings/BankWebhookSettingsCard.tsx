'use client';

import React from 'react';
import { BellRing, Smartphone, Zap, Copy, RefreshCw } from 'lucide-react';

export interface BankWebhookSettingsCardProps {
  slug: string;
  currentOrigin: string;
  form: {
    bankWebhookKey: string;
    bankAutoCheckout: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleCopy: (text: string, label: string) => void;
  handleTestBankWebhook: () => Promise<void>;
  handleRegenerateBankKey: () => Promise<void>;
  testingBankWebhook: boolean;
  regeneratingKey: boolean;
}

export default function BankWebhookSettingsCard({
  slug,
  currentOrigin,
  form,
  setForm,
  handleCopy,
  handleTestBankWebhook,
  handleRegenerateBankKey,
  testingBankWebhook,
  regeneratingKey,
}: BankWebhookSettingsCardProps) {
  return (
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
        ระบบรองรับการแจ้งเตือนเงินโอนเข้า ทั้งผ่าน <strong>หน้าเว็บโดยตรง (Direct Web - ฟรี ไม่ต้องตั้งค่า)</strong> และ <strong>แอปบนมือถือ (MacroDroid / LINE)</strong> พร้อมระบบอ่านออกเสียงภาษาไทย
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
            เมื่อลูกค้าอยู่ที่โต๊ะอาหาร สแกน QR โอนเงินแล้วกดปุ่ม <strong>&quot;✅ ฉันโอนเงินเรียบร้อยแล้ว (แจ้งแคชเชียร์)&quot;</strong> หรือแนบรูปสลิป
            หน้าจอ POS ของแคชเชียร์จะ<strong>ส่งเสียงพูดภาษาไทย</strong> (เช่น <em>&quot;เงินเข้า โต๊ะ 1 50 บาท เรียบร้อยค่ะ&quot;</em>) พร้อมป๊อปอัพขึ้นเตือนทันที 
            <strong>คุณไม่จำเป็นต้องติดตั้งโปรแกรมหรือตั้งค่าภายนอกใดๆ</strong>
          </p>
        </div>

        {/* Auto Checkout on Bank Notify */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <label className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer">
              <span>⚡ ปิดบิลอัตโนมัติทันทีเมื่อยอดเงินตรงกับโต๊ะอาหาร (Auto-Match &amp; Checkout)</span>
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
              onChange={(e) => setForm((prev: any) => ({ ...prev, bankAutoCheckout: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>

        {/* Mobile App (MacroDroid / LINE Notification Forwarder) */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <span>Webhook URL ประจำร้านของคุณ (สำหรับรับข้อความแจ้งเตือนจากแอปบนมือถือ):</span>
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
    </div>
  );
}

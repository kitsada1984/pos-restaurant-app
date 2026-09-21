'use client';

import React, { useState } from 'react';
import { BellRing, Mail, Smartphone, Zap, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { getBankEmailAppsScript } from '@/lib/bank-email-template';

export interface BankWebhookSettingsCardProps {
  slug: string;
  currentOrigin: string;
  form: {
    bankWebhookKey: string;
    bankAutoCheckout: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleCopy: (text: string, label: string) => void;
  handleTestBankEmailWebhook: (bankName: 'KBANK' | 'SCB' | 'KTB' | 'BBL' | 'TTB') => Promise<void>;
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
  handleTestBankEmailWebhook,
  handleTestBankWebhook,
  handleRegenerateBankKey,
  testingBankWebhook,
  regeneratingKey,
}: BankWebhookSettingsCardProps) {
  const [bankNotifyTab, setBankNotifyTab] = useState<'EMAIL' | 'APP'>('EMAIL');

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
            เมื่อลูกค้าอยู่ที่โต๊ะอาหาร สแกน QR โอนเงินแล้วกดปุ่ม <strong>&quot;✅ ฉันโอนเงินเรียบร้อยแล้ว (แจ้งแคชเชียร์)&quot;</strong> หรือแนบรูปสลิป
            หน้าจอ POS ของแคชเชียร์จะ<strong>ส่งเสียงพูดภาษาไทย</strong> (เช่น <em>&quot;เงินเข้า โต๊ะ 1 50 บาท เรียบร้อยค่ะ&quot;</em>) พร้อมป๊อปอัพขึ้นเตือนทันที 
            <strong>คุณไม่จำเป็นต้องติดตั้ง MacroDroid หรือตั้งค่าอีเมลใดๆ</strong>
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
  );
}

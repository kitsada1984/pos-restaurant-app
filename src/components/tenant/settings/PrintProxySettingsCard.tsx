'use client';

import React, { useState } from 'react';
import { Printer, Copy, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export interface PrintProxySettingsCardProps {
  slug: string;
  currentOrigin: string;
  form: {
    linemanGp: number;
    grabGp: number;
    shopeeGp: number;
    deliveryWebhookSecret: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleCopy: (text: string, label: string) => void;
  testingWebhook: boolean;
  handleTestWebhook: (channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'CANCEL') => Promise<void>;
  showInfo: (title: string, message?: string) => void;
}

export default function PrintProxySettingsCard({
  slug,
  currentOrigin,
  form,
  setForm,
  handleCopy,
  testingWebhook,
  handleTestWebhook,
  showInfo,
}: PrintProxySettingsCardProps) {
  const [showProxyGuide, setShowProxyGuide] = useState(false);

  return (
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
              onChange={(e) => setForm((prev: any) => ({ ...prev, linemanGp: parseFloat(e.target.value) || 0 }))}
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
              onChange={(e) => setForm((prev: any) => ({ ...prev, grabGp: parseFloat(e.target.value) || 0 }))}
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
              onChange={(e) => setForm((prev: any) => ({ ...prev, shopeeGp: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
            />
            <span className="font-extrabold text-amber-800">%</span>
          </div>
        </div>
      </div>

      {/* Virtual Print Proxy Webhook Integration Card */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black">🖨️ ระบบรับออเดอร์เดลิเวอรีผ่านเครื่องพิมพ์เสมือน (Virtual Print Proxy Hub)</h4>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white self-start sm:self-auto">
            ฟรี 0 บ. • ปลอดภัย 100% ไม่โดนแบน
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          ดักจับข้อความการพิมพ์จากแอป <span className="text-amber-300 font-bold">Wongnai Merchant (LINE MAN)</span>, <span className="text-emerald-300 font-bold">GrabMerchant</span> หรือ <span className="text-orange-300 font-bold">Shopee Partner</span> บนมือถือ ส่งเข้าหน้าจอแคชเชียร์ POS และจอครัว KDS อัตโนมัติ พร้อมส่งต่อให้พิมพ์กระดาษจริงในครัว (Pass-through) โดยไม่ต้องเสียค่าบริการรายเดือนใดๆ ทั้งสิ้น
        </p>

        <div className="space-y-2 text-xs">
          {/* Print Proxy Webhook URL */}
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] text-amber-400 font-bold block">🌐 Print Proxy Webhook URL:</span>
              <code className="text-[11px] text-slate-200 font-mono select-all truncate block">
                {currentOrigin ? `${currentOrigin}/api/r/${slug}/webhooks/delivery/print-proxy` : `/api/r/${slug}/webhooks/delivery/print-proxy`}
              </code>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${currentOrigin || 'https://pos-restaurant-app-psi.vercel.app'}/api/r/${slug}/webhooks/delivery/print-proxy`,
                  'Print Proxy Webhook URL'
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-bold text-[11px]">
                Print Proxy Security Token (รหัสความปลอดภัยสำหรับจับคู่กับเครื่องพิมพ์เสมือน)
              </label>
              <div className="flex items-center space-x-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const randomToken = 'proxy_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8);
                    setForm((prev: any) => ({ ...prev, deliveryWebhookSecret: randomToken }));
                    showInfo('สร้างรหัสสุ่มให้แล้ว อย่าลืมกดบันทึกการตั้งค่า');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>🎲 สุ่มรหัสใหม่</span>
                </button>
                {form.deliveryWebhookSecret && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev: any) => ({ ...prev, deliveryWebhookSecret: '' }));
                      showInfo('ล้างรหัสแล้ว (เว้นว่างไว้เพื่อเปิดรับอัตโนมัติ)');
                    }}
                    className="text-slate-400 hover:text-slate-300"
                  >
                    ล้างรหัส
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              placeholder="ร้านตั้งเองได้เลย หรือเว้นว่างไว้เพื่อเปิดรับอัตโนมัติ"
              value={form.deliveryWebhookSecret}
              onChange={(e) => setForm((prev: any) => ({ ...prev, deliveryWebhookSecret: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
              💡 <strong>ที่มาของรหัส:</strong> คุณสามารถ <span className="text-amber-300 font-bold">คิดและตั้งเองได้ตามใจชอบ</span> หรือ <span className="text-emerald-300 font-bold">เว้นว่างไว้ได้เลย</span> (ไม่ต้องไปขอจากใคร) หากตั้งรหัสไว้ ให้นำรหัสนี้ไปใส่ในโปรแกรมหรือแอป Print Proxy ด้วยเพื่อให้จับคู่ตรงกัน
            </p>
          </div>

          {/* Collapsible Setup Guide */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowProxyGuide(!showProxyGuide)}
              className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center justify-between transition-all"
            >
              <span className="flex items-center space-x-2">
                <span>📖 ดูคู่มือการตั้งค่าเครื่องพิมพ์เสมือน 3 สเต็ปง่ายๆ</span>
              </span>
              {showProxyGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showProxyGuide && (
              <div className="mt-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-2.5 leading-relaxed">
                <p className="font-bold text-white text-xs border-b border-slate-800 pb-1.5">
                  🚀 วิธีเชื่อมต่อให้บิลจากแอปเดลิเวอรีไหลเข้า POS อัตโนมัติ:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      <strong>รันสคริปต์ตัวกลาง Print Proxy</strong> บนคอมพิวเตอร์หรือแท็บเล็ตในร้าน (รันสคริปต์ <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">node scripts/print-proxy-companion.js</code> หรือติดตั้งแอป Print Proxy APK) เพื่อจำลองเครื่องพิมพ์เสมือนพอร์ต 9100 / Bluetooth
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      <strong>ในแอป Wongnai / Grab / Shopee:</strong> ไปที่เมนู <em>ตั้งค่าเครื่องพิมพ์ ➔ เพิ่มเครื่องพิมพ์ (เลือกแบบ Network หรือ Bluetooth) ➔ เลือกเครื่องพิมพ์เสมือน Virtual Printer</em>
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      <strong>เสร็จสมบูรณ์!</strong> เมื่อมีออเดอร์ใหม่เข้าและแอปเดลิเวอรีสั่งพิมพ์ ข้อมูลจะไหลเข้าหน้าจอ POS ตัดสต็อกทันที และพิมพ์ใบสั่งอาหารออกที่เครื่องพิมพ์ในครัวตามปกติ
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Simulation Buttons */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-bold">จำลองสลิปการพิมพ์:</span>
            <button
              type="button"
              disabled={testingWebhook}
              onClick={() => handleTestWebhook('LINEMAN')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>⚡ จำลองสลิป LINE MAN</span>
            </button>
            <button
              type="button"
              disabled={testingWebhook}
              onClick={() => handleTestWebhook('GRAB')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>⚡ จำลองสลิป GrabFood</span>
            </button>
            <button
              type="button"
              disabled={testingWebhook}
              onClick={() => handleTestWebhook('SHOPEE_FOOD')}
              className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600 border border-amber-500/50 text-amber-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>⚡ จำลองสลิป ShopeeFood</span>
            </button>
            <button
              type="button"
              disabled={testingWebhook}
              onClick={() => handleTestWebhook('CANCEL')}
              className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-red-300 hover:text-white font-black text-xs flex items-center space-x-1 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>🚫 จำลองยกเลิกออเดอร์</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

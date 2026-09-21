'use client';

import React, { useState } from 'react';
import { HardDrive, Folder, Zap, CheckCircle2, ShieldCheck, ExternalLink, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/google-drive-template';

export interface SlipStorageSettingsCardProps {
  form: {
    googleDriveFolderId: string;
    googleDriveWebhookUrl: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleCopy: (text: string, label: string) => void;
  handleTestGoogleDrive: () => Promise<void>;
  testingGoogleDrive: boolean;
  googleDriveTestResult: { success: boolean; message: string; viewUrl?: string } | null;
  showSuccess: (title: string, message?: string) => void;
}

export default function SlipStorageSettingsCard({
  form,
  setForm,
  handleCopy,
  handleTestGoogleDrive,
  testingGoogleDrive,
  googleDriveTestResult,
  showSuccess,
}: SlipStorageSettingsCardProps) {
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  return (
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
                  setForm((prev: any) => ({ ...prev, googleDriveWebhookUrl: latestUrl }));
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
              onChange={(e) => setForm((prev: any) => ({ ...prev, googleDriveWebhookUrl: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {(form.googleDriveWebhookUrl.includes('zsxxYWIcg') || form.googleDriveWebhookUrl.includes('AKfycbrzsxx')) && (
              <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-between">
                <span>⚠️ URL นี้เป็น URL เก่าที่ส่งผลลัพธ์ 404 (ไม่มีอยู่ในระบบ) กรุณากดปุ่มเพื่อเปลี่ยนเป็น URL ล่าสุด</span>
                <button
                  type="button"
                  onClick={() => setForm((prev: any) => ({ ...prev, googleDriveWebhookUrl: 'https://script.google.com/macros/s/AKfycbw3SHPGQN2z4op26gJ2IAHTA3RVxakKlZK9Lj6IrTaES85XcmjyCLV0gdCnD1Xv4AFM/exec' }))}
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
                  onChange={(e) => setForm((prev: any) => ({ ...prev, googleDriveFolderId: e.target.value }))}
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
  );
}

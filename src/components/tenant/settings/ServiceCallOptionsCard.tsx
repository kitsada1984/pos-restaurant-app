'use client';

import React from 'react';
import { BellRing, RotateCcw, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

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

export const PRESET_EMOJIS = ['🌶️', '🧊', '🥢', '🧻', '💵', '❓', '🍲', '🧂', '🥤', '🍽️', '🥣', '🛎️', '🧹', '👨‍🍳'];

export interface ServiceCallOptionsCardProps {
  items: ServiceCallOption[];
  onAdd: () => void;
  onRestoreDefaults: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onUpdate: (id: string, updates: Partial<ServiceCallOption>) => void;
  onDelete: (id: string) => void;
}

export default function ServiceCallOptionsCard({
  items,
  onAdd,
  onRestoreDefaults,
  onMove,
  onUpdate,
  onDelete,
}: ServiceCallOptionsCardProps) {
  return (
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
            onClick={onRestoreDefaults}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="กู้คืนรายการมาตรฐาน 6 อย่าง"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>โหลดค่าเริ่มต้น 6 รายการ</span>
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มรายการใหม่</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {items && items.length > 0 ? (
          items.map((item, idx) => (
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
                    onClick={() => onMove(idx, 'up')}
                    className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 disabled:opacity-20 transition-all"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => onMove(idx, 'down')}
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
                    onChange={(e) => onUpdate(item.id, { icon: e.target.value })}
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
                      onClick={() => onUpdate(item.id, { icon: em })}
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
                  onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                />
              </div>

              {/* Action Controls: Active Toggle & Delete */}
              <div className="flex items-center justify-end gap-3 flex-shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(e) => onUpdate(item.id, { active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                  <span className={`text-[11px] font-bold ${item.active ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {item.active ? 'เปิดใช้' : 'ปิดชั่วคราว'}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
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
              onClick={onRestoreDefaults}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-all inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>โหลดค่าเริ่มต้น 6 รายการ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

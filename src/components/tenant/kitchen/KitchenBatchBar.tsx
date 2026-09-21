'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { BatchCookingDish } from '@/hooks/useKitchenOrders';

interface KitchenBatchBarProps {
  batchCookingSummary: BatchCookingDish[];
  showBatchBar: boolean;
  setShowBatchBar: (show: boolean) => void;
  isSplitView?: boolean;
}

export default function KitchenBatchBar({
  batchCookingSummary,
  showBatchBar,
  setShowBatchBar,
  isSplitView = false,
}: KitchenBatchBarProps) {
  if (batchCookingSummary.length === 0) return null;

  const totalDishes = batchCookingSummary.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={`bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl shadow-2xs ${
        isSplitView ? 'p-2 sm:p-2.5' : 'p-3.5 sm:p-5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="p-1 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-2xs flex-shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs sm:text-sm font-black text-amber-950 truncate">
            🍳 สรุปเมนูปรุงพร้อมกัน ({totalDishes} จานค้างทำ)
          </h3>
        </div>
        <button
          type="button"
          data-sound="pop"
          onClick={() => setShowBatchBar(!showBatchBar)}
          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg hover:bg-amber-100/80 active:scale-90 active:translate-y-0.5 duration-75 select-none transition-all flex-shrink-0 cursor-pointer"
        >
          {showBatchBar ? 'ย่อ ▲' : 'ดูเมนู ▼'}
        </button>
      </div>

      {showBatchBar && (
        <div className="flex flex-wrap gap-2 pt-1">
          {batchCookingSummary.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-amber-200/80 rounded-xl px-3 py-2 shadow-xs flex items-center space-x-2.5"
            >
              <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                {item.quantity}
              </span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">
                  {item.name}
                </span>
                <span className="text-[10px] font-bold text-amber-800/80 block">
                  {item.tables.join(', ')}
                  {item.notes.length > 0 && ` • โน้ต: ${item.notes.join(', ')}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

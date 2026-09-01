'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  AlertCircle,
  Volume2,
  VolumeX,
  Printer,
  RefreshCw,
  Utensils,
  BellRing,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { playOrderChime, playSuccessChime } from '@/lib/sound';

export default function KitchenTerminal({ slug = 'lung-pa' }: { slug?: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE' | 'PENDING' | 'COOKING' | 'READY'
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/r/${slug}/orders`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource(`/api/r/${slug}/stream`);
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ORDER_CREATED') {
              if (soundEnabled) playOrderChime();
              fetchOrders();
            } else if (payload.type === 'ORDER_UPDATED' || payload.type === 'TABLE_UPDATED') {
              fetchOrders();
            }
          } catch (e) {}
        };
        eventSource.onerror = () => {
          eventSource?.close();
        };
      }
    } catch (e) {}

    return () => {
      eventSource?.close();
    };
  }, [slug, soundEnabled]);

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemStatus: newStatus }),
      });
      if (newStatus === 'READY') playSuccessChime();
      fetchOrders();
    } catch (err) {
      console.error('Error updating item status:', err);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus === 'READY' || newStatus === 'SERVED') playSuccessChime();
      fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus === 'ACTIVE') {
        return ['PENDING', 'COOKING', 'READY'].includes(order.status);
      }
      return order.status === filterStatus;
    });
  }, [orders, filterStatus]);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const cookingCount = orders.filter((o) => o.status === 'COOKING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                จอห้องครัว Real-time (KDS)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ร้าน: <span className="font-bold text-slate-800">{slug}</span> • รับตั๋วออเดอร์สดพร้อมเสียงกระดิ่งเตือน
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ACTIVE', label: `ทั้งหมด (${pendingCount + cookingCount + readyCount})`, count: pendingCount + cookingCount + readyCount },
            { id: 'PENDING', label: `รอดำเนินการ (${pendingCount})`, color: 'bg-rose-500 text-white' },
            { id: 'COOKING', label: `กำลังปรุง (${cookingCount})`, color: 'bg-amber-500 text-white' },
            { id: 'READY', label: `พร้อมเสิร์ฟ (${readyCount})`, color: 'bg-emerald-500 text-white' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                filterStatus === f.id
                  ? f.color || 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Ticket Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">ไม่มีออเดอร์ค้างในครัว 🎉</h3>
          <p className="text-xs text-slate-400">ออเดอร์ใหม่จากลูกค้าหรือแคชเชียร์จะปรากฏที่นี่ทันทีแบบเรียลไทม์</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isCooking = order.status === 'COOKING';
            const isReady = order.status === 'READY';

            return (
              <div
                key={order.id}
                className={`rounded-3xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all bg-white ${
                  isPending
                    ? 'border-rose-300 ring-2 ring-rose-500/20'
                    : isCooking
                    ? 'border-amber-300 ring-2 ring-amber-500/20'
                    : 'border-emerald-300 ring-2 ring-emerald-500/20'
                }`}
              >
                {/* Ticket Header */}
                <div
                  className={`p-4 text-white flex items-center justify-between ${
                    isPending
                      ? 'bg-rose-600'
                      : isCooking
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-black">{order.table?.name || `โต๊ะ ${order.tableNo}`}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/20 uppercase tracking-wider">
                      {order.orderType === 'TAKEAWAY' ? 'กลับบ้าน' : 'ทานที่ร้าน'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold block">{formatTime(order.createdAt)}</span>
                  </div>
                </div>

                {/* Ticket Items */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
                  {order.note && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                      ⚠️ {order.note}
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 space-y-2">
                    {order.items?.map((item: any) => {
                      let parsedOptions: any[] = [];
                      if (item.selectedOptions) {
                        try {
                          parsedOptions = JSON.parse(item.selectedOptions);
                        } catch (e) {}
                      }

                      return (
                        <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                                {item.quantity}
                              </span>
                              <span className="font-extrabold text-sm text-slate-900">{item.name}</span>
                            </div>

                            {/* Options */}
                            {parsedOptions.length > 0 && (
                              <div className="ml-7 mt-1 flex flex-wrap gap-1">
                                {parsedOptions.map((opt: any, oIdx: number) => (
                                  <span
                                    key={oIdx}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700"
                                  >
                                    {opt.choice || opt.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.specialNote && (
                              <div className="ml-7 mt-1 text-[11px] text-amber-700 font-bold">
                                💬 {item.specialNote}
                              </div>
                            )}
                          </div>

                          {/* Quick item state toggle */}
                          <button
                            onClick={() => {
                              const nextStatus =
                                item.status === 'PENDING' ? 'COOKING' : item.status === 'COOKING' ? 'READY' : 'SERVED';
                              updateItemStatus(order.id, item.id, nextStatus);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                              item.status === 'READY'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : item.status === 'COOKING'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {item.status === 'READY' ? '✓ พร้อม' : item.status === 'COOKING' ? '🔥 ทำอยู่' : 'รอดำเนินการ'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ticket Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {isPending && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'COOKING')}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1 transition-all"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>เริ่มปรุง</span>
                    </button>
                  )}

                  {isCooking && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ปรุงเสร็จแล้ว</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'SERVED')}
                      className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all"
                    >
                      <span>เสิร์ฟแล้ว (เรียบร้อย)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

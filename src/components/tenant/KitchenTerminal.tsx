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
import { playOrderChime, playSuccessChime, playDeliveryChime } from '@/lib/sound';
import { useToast } from '@/context/ToastContext';

export default function KitchenTerminal({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showInfo, showWarning, showError } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE' | 'PENDING' | 'COOKING' | 'READY' | 'DELIVERY'
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
    let reconnectTimeout: any = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed || typeof window === 'undefined' || !('EventSource' in window)) return;
      try {
        eventSource = new EventSource(`/api/r/${slug}/stream`);
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ORDER_CREATED') {
              const ch = payload.order?.orderChannel;
              const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(ch);
              if (soundEnabled) {
                if (isDelivery) {
                  playDeliveryChime();
                } else {
                  playOrderChime();
                }
              }

              if (isDelivery) {
                const label = ch === 'LINEMAN' ? 'LINE MAN' : ch === 'GRAB' ? 'GrabFood' : ch === 'SHOPEE_FOOD' ? 'ShopeeFood' : 'Robinhood';
                showInfo(`🛵 ออเดอร์เดลิเวอรีเข้าใหม่ (${label})`, `#${payload.order?.deliveryOrderId || payload.order?.id?.slice(-4)}`);
              } else {
                showInfo('มีออเดอร์ใหม่เข้าครัว 🛎️', `โต๊ะ ${payload.order?.tableNo || 'สั่งใหม่'}`);
              }
              fetchOrders();
            } else if (payload.type === 'ORDER_UPDATED' || payload.type === 'TABLE_UPDATED') {
              fetchOrders();
            }
          } catch (e) {}
        };
        eventSource.onerror = () => {
          eventSource?.close();
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch (e) {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectSSE, 3000);
        }
      }
    };

    connectSSE();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [slug, soundEnabled]);

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemStatus: newStatus }),
      });
      if (res.ok) {
        if (newStatus === 'READY') {
          playSuccessChime();
          showSuccess('ปรุงเสร็จแล้ว 🔔', 'พร้อมนำไปเสิร์ฟที่โต๊ะ');
        } else if (newStatus === 'SERVED') {
          showSuccess('เสิร์ฟเรียบร้อย ✨');
        } else if (newStatus === 'COOKING') {
          showInfo('เริ่มทำรายการ 👨‍🍳');
        }
        fetchOrders();
      }
    } catch (err) {
      console.error('Error updating item status:', err);
      showError('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === 'READY') {
          playSuccessChime();
          showSuccess('ออเดอร์พร้อมเสิร์ฟครบทุกจาน 🔔');
        } else if (newStatus === 'SERVED') {
          playSuccessChime();
          showSuccess('เสิร์ฟออเดอร์ครบถ้วน ✨');
        } else if (newStatus === 'CANCELLED') {
          showWarning('ยกเลิกออเดอร์เรียบร้อย');
        }
        fetchOrders();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      showError('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const deliveryOrdersCount = orders.filter(
    (o) =>
      ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(o.orderChannel) &&
      ['PENDING', 'COOKING', 'READY'].includes(o.status)
  ).length;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus === 'DELIVERY') {
        return (
          ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel) &&
          ['PENDING', 'COOKING', 'READY'].includes(order.status)
        );
      }
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
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                จอห้องครัว Real-time (KDS)
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                รับตั๋วออเดอร์สดพร้อมเสียงกระดิ่งเตือนและอัปเดตสถานะแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills - Full Width Grid on Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full md:w-auto">
          {[
            { id: 'ACTIVE', label: `ทั้งหมด (${pendingCount + cookingCount + readyCount})`, count: pendingCount + cookingCount + readyCount },
            { id: 'PENDING', label: `รอทำ (${pendingCount})`, color: 'bg-rose-500 text-white' },
            { id: 'COOKING', label: `กำลังปรุง (${cookingCount})`, color: 'bg-amber-500 text-white' },
            { id: 'READY', label: `เสร็จ (${readyCount})`, color: 'bg-emerald-500 text-white' },
            { id: 'DELIVERY', label: `🛵 เดลิเวอรี (${deliveryOrdersCount})`, color: 'bg-emerald-700 text-white font-black' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`py-2 px-1.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all text-center truncate ${
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
          <p className="text-xs text-slate-400">ออเดอร์ใหม่จากลูกค้า แคชเชียร์ หรือ LINE MAN / Grab จะปรากฏที่นี่ทันทีแบบเรียลไทม์</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isCooking = order.status === 'COOKING';
            const isReady = order.status === 'READY';
            const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);

            // Channel Theme
            let headerBg = isPending ? 'bg-rose-600' : isCooking ? 'bg-amber-600' : 'bg-emerald-600';
            let platformBadge = 'ทานที่ร้าน';
            let platformBadgeBg = 'bg-black/20';

            if (order.orderChannel === 'LINEMAN') {
              headerBg = 'bg-[#06C755]';
              platformBadge = '🛵 LINE MAN';
              platformBadgeBg = 'bg-black/30';
            } else if (order.orderChannel === 'GRAB') {
              headerBg = 'bg-[#00B14F]';
              platformBadge = '🛵 GrabFood';
              platformBadgeBg = 'bg-black/30';
            } else if (order.orderChannel === 'SHOPEE_FOOD') {
              headerBg = 'bg-[#EE4D2D]';
              platformBadge = '🛵 ShopeeFood';
              platformBadgeBg = 'bg-black/30';
            } else if (order.orderChannel === 'ROBINHOOD') {
              headerBg = 'bg-[#802882]';
              platformBadge = '🛵 Robinhood';
              platformBadgeBg = 'bg-black/30';
            } else if (order.orderType === 'TAKEAWAY') {
              platformBadge = '🛍️ กลับบ้าน';
            }

            return (
              <div
                key={order.id}
                className={`rounded-3xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all bg-white ${
                  isDelivery
                    ? 'border-emerald-300 ring-2 ring-emerald-500/30'
                    : isPending
                    ? 'border-rose-300 ring-2 ring-rose-500/20'
                    : isCooking
                    ? 'border-amber-300 ring-2 ring-amber-500/20'
                    : 'border-emerald-300 ring-2 ring-emerald-500/20'
                }`}
              >
                {/* Ticket Header */}
                <div className={`p-4 text-white flex items-center justify-between ${headerBg}`}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg sm:text-xl font-black">
                        {isDelivery
                          ? `#${order.deliveryOrderId || order.id.slice(-4)}`
                          : order.table?.name || `โต๊ะ ${order.tableNo}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${platformBadgeBg}`}>
                        {platformBadge}
                      </span>
                    </div>
                    {isDelivery && (
                      <span className="text-[10px] text-white/90 block mt-0.5">
                        👤 {order.riderName ? `ไรเดอร์: ${order.riderName}` : (order.customerName || 'เดลิเวอรี')}
                      </span>
                    )}
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

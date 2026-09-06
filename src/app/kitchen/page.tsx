'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
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

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE' | 'PENDING' | 'COOKING' | 'READY' | 'DELIVERY'
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=kitchen');
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
        eventSource = new EventSource('/api/realtime/stream');
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ORDER_CREATED') {
              if (soundEnabled) {
                const ch = payload.order?.orderChannel;
                if (['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(ch)) {
                  playDeliveryChime();
                } else {
                  playOrderChime();
                }
              }
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

    // Auto poll every 10 seconds as safety net
    const interval = setInterval(fetchOrders, 10000);

    return () => {
      eventSource?.close();
      clearInterval(interval);
    };
  }, [soundEnabled]);

  // Update order status
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      playSuccessChime();
      fetchOrders();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const deliveryOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(o?.orderChannel) &&
        ['PENDING', 'COOKING', 'READY'].includes(o?.status)
    ).length;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    if (filterStatus === 'DELIVERY') {
      return safeOrders.filter(
        (o) =>
          ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(o?.orderChannel) &&
          ['PENDING', 'COOKING', 'READY'].includes(o?.status)
      );
    }
    if (filterStatus === 'ACTIVE') {
      return safeOrders.filter((o) => ['PENDING', 'COOKING', 'READY'].includes(o?.status));
    }
    return safeOrders.filter((o) => o?.status === filterStatus);
  }, [orders, filterStatus]);

  // Calculate minutes elapsed
  const getMinutesAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    return mins;
  };

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const cookingCount = orders.filter((o) => o.status === 'COOKING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Kitchen Subheader */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 sticky top-16 sm:top-20 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Title & Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 leading-tight flex items-center space-x-2">
                <span>หน้าจอห้องครัว (Kitchen Display KDS)</span>
                <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200/80 px-2.5 py-0.5 rounded-full font-extrabold">
                  {filteredOrders.length} ออเดอร์
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">แสดงรายการอาหารที่ต้องปรุงแบบ Real-time</p>
            </div>
          </div>

          {/* Filter Tabs & Sound/Refresh */}
          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 text-xs font-bold">
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'ACTIVE'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({pendingCount + cookingCount + readyCount})
              </button>
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'PENDING'
                    ? 'bg-rose-500 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รอทำ ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('COOKING')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'COOKING'
                    ? 'bg-amber-500 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                กำลังทำ ({cookingCount})
              </button>
              <button
                onClick={() => setFilterStatus('READY')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === 'READY'
                    ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                พร้อมเสิร์ฟ ({readyCount})
              </button>
              {deliveryOrdersCount > 0 && (
                <button
                  onClick={() => setFilterStatus('DELIVERY')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    filterStatus === 'DELIVERY'
                      ? 'bg-emerald-700 text-white font-black shadow-sm'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  🛵 เดลิเวอรี ({deliveryOrdersCount})
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderChime();
              }}
              className={`p-2.5 rounded-2xl border transition-all ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
              title={soundEnabled ? 'เสียงเตือนเปิดอยู่' : 'เสียงเตือนปิดอยู่'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={fetchOrders}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all"
              title="รีเฟรชออเดอร์"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 text-sm font-medium">กำลังโหลดรายการออเดอร์...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto my-12 shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-2 shadow-inner">
              <ChefHat className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">ยังไม่มีรายการสั่งอาหารที่ต้องทำ 🎉</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              เมื่อมีลูกค้าสั่งอาหารผ่าน QR Code หรือแคชเชียร์คีย์ออเดอร์ รายการจะปรากฏที่นี่ทันทีพร้อมเสียงกระดิ่ง
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const minsAgo = getMinutesAgo(order.createdAt);
              const isUrgent = minsAgo >= 15;
              const isPending = order.status === 'PENDING';
              const isCooking = order.status === 'COOKING';
              const isReady = order.status === 'READY';
              const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);

              let headerBg = isPending
                ? 'bg-rose-50/80 border-b border-rose-100'
                : isCooking
                ? 'bg-amber-50/80 border-b border-amber-100'
                : 'bg-emerald-50/80 border-b border-emerald-100';

              let badgeBg = isPending
                ? 'bg-rose-500 text-white'
                : isCooking
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-500 text-white';

              let borderStyle = isDelivery
                ? 'border-emerald-300 ring-2 ring-emerald-500/30'
                : isPending
                ? 'border-rose-200 ring-2 ring-rose-500/20'
                : isCooking
                ? 'border-amber-200 ring-2 ring-amber-500/20'
                : 'border-emerald-200 ring-2 ring-emerald-500/20';

              let channelLabel = 'ทานที่ร้าน';
              if (order.orderChannel === 'LINEMAN') channelLabel = '🛵 LINE MAN';
              else if (order.orderChannel === 'GRAB') channelLabel = '🛵 GrabFood';
              else if (order.orderChannel === 'SHOPEE_FOOD') channelLabel = '🛵 ShopeeFood';
              else if (order.orderChannel === 'ROBINHOOD') channelLabel = '🛵 Robinhood';
              else if (order.orderType === 'TAKEAWAY') channelLabel = '🛍️ สั่งกลับบ้าน';

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-all bg-white ${borderStyle}`}
                >
                  {/* Ticket Header */}
                  <div className={`p-4 flex items-center justify-between ${headerBg}`}>
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-sm shadow-sm ${badgeBg}`}>
                        {isDelivery ? '🛵' : (order.tableNo || order.tableId || '—')}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-extrabold text-base text-slate-900">
                            {isDelivery
                              ? `#${order.deliveryOrderId || order.id.slice(-4).toUpperCase()}`
                              : order.table?.name || `โต๊ะ ${order.tableNo || order.tableId}`}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200 shadow-xs">
                            {channelLabel}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block font-medium">
                          บิล #{order.id.slice(-5).toUpperCase()}
                          {order.customerName && ` • คุณ${order.customerName}`}
                          {order.riderName && ` • ไรเดอร์: ${order.riderName}`}
                        </span>
                      </div>
                    </div>

                    {/* Timer */}
                    <div
                      className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-xl font-bold ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                          : 'bg-white text-slate-600 border border-slate-200/80 shadow-xs'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{minsAgo} นาทีที่แล้ว</span>
                    </div>
                  </div>

                  {/* Special Note if any */}
                  {order.note && (
                    <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center space-x-1.5">
                      <span>📝 หมายเหตุ: {order.note}</span>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 divide-y divide-slate-100">
                    {order.items.map((item: any, idx: number) => {
                      let opts: any[] = [];
                      try {
                        if (item.selectedOptions) {
                          opts = typeof item.selectedOptions === 'string'
                            ? JSON.parse(item.selectedOptions)
                            : item.selectedOptions;
                        }
                      } catch {}

                      return (
                        <div key={idx} className="pt-3 first:pt-0">
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-base text-slate-900 flex-1 pr-2">
                              {item.name}
                            </span>
                            <span className="w-7 h-7 rounded-lg bg-orange-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                              {item.quantity}
                            </span>
                          </div>

                          {/* Selected Customizations & Toppings */}
                          {opts && opts.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {opts.map((opt: any, oIdx: number) => (
                                <div
                                  key={oIdx}
                                  className="text-xs text-amber-700 font-semibold flex items-center space-x-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                                  <span>{opt.group ? `${opt.group}: ` : ''}{opt.choice || opt.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Special Note */}
                          {item.specialNote && (
                            <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-1">
                              <span>⚠️ {item.specialNote}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COOKING')}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <Flame className="w-4 h-4" />
                        <span>🍳 เริ่มทำอาหาร</span>
                      </button>
                    )}

                    {order.status === 'COOKING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>🥗 ปรุงเสร็จแล้ว (พร้อมเสิร์ฟ)</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                        className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center space-x-2 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
                      >
                        <span>✅ เสิร์ฟให้ลูกค้าเรียบร้อย</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

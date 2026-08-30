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
import { playOrderChime, playSuccessChime } from '@/lib/sound';

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE' | 'PENDING' | 'COOKING' | 'READY'
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=kitchen');
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const eventSource = new EventSource('/api/realtime/stream');

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

    // Auto poll every 10 seconds as safety net
    const interval = setInterval(fetchOrders, 10000);

    return () => {
      eventSource.close();
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

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'ACTIVE') {
      return orders.filter((o) => ['PENDING', 'COOKING', 'READY'].includes(o.status));
    }
    return orders.filter((o) => o.status === filterStatus);
  }, [orders, filterStatus]);

  // Calculate minutes elapsed
  const getMinutesAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    return mins;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      {/* Kitchen Subheader */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white flex items-center space-x-2">
                <span>หน้าจอห้องครัว (Kitchen Display KDS)</span>
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded-full font-medium">
                  {filteredOrders.length} ออเดอร์
                </span>
              </h1>
              <p className="text-xs text-slate-400">แสดงรายการอาหารที่ต้องปรุงแบบ Real-time</p>
            </div>
          </div>

          {/* Filter Tabs & Sound */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'ACTIVE' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'PENDING' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                รอทำ ({orders.filter((o) => o.status === 'PENDING').length})
              </button>
              <button
                onClick={() => setFilterStatus('COOKING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'COOKING' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                กำลังทำ ({orders.filter((o) => o.status === 'COOKING').length})
              </button>
              <button
                onClick={() => setFilterStatus('READY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'READY' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                พร้อมเสิร์ฟ ({orders.filter((o) => o.status === 'READY').length})
              </button>
            </div>

            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playOrderChime();
              }}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={soundEnabled ? 'เสียงเตือนเปิดอยู่' : 'เสียงเตือนปิดอยู่'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={fetchOrders}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
              title="รีเฟรชออเดอร์"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-sm">กำลังโหลดรายการออเดอร์...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-12 text-center max-w-md mx-auto my-12">
            <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-200">ยังไม่มีรายการสั่งอาหารที่ต้องทำ</h3>
            <p className="text-xs text-slate-400 mt-1">
              เมื่อมีลูกค้าสั่งอาหารผ่าน QR Code หรือแคชเชียร์คีย์ออเดอร์ รายการจะปรากฏที่นี่ทันทีพร้อมเสียงกระดิ่ง
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const minsAgo = getMinutesAgo(order.createdAt);
              const isUrgent = minsAgo >= 15;

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border flex flex-col justify-between overflow-hidden shadow-xl transition-all ${
                    order.status === 'PENDING'
                      ? 'bg-slate-800/95 border-amber-500/60 ring-2 ring-amber-500/20'
                      : order.status === 'COOKING'
                      ? 'bg-slate-800/95 border-orange-500/80 ring-2 ring-orange-500/30'
                      : 'bg-slate-800/90 border-emerald-500/60'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-4 flex items-center justify-between border-b ${
                      order.status === 'PENDING'
                        ? 'bg-amber-950/40 border-amber-900/60'
                        : order.status === 'COOKING'
                        ? 'bg-orange-950/40 border-orange-900/60'
                        : 'bg-emerald-950/40 border-emerald-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-9 h-9 rounded-xl bg-white text-slate-900 font-extrabold flex items-center justify-center text-sm shadow">
                        {order.tableId}
                      </span>
                      <div>
                        <h3 className="font-bold text-base text-white">
                          {order.table?.name || `โต๊ะ ${order.tableId}`}
                        </h3>
                        <span className="text-xs text-slate-300 block">
                          บิล #{order.id.slice(-5).toUpperCase()}
                          {order.customerName && ` • คุณ${order.customerName}`}
                        </span>
                      </div>
                    </div>

                    {/* Timer */}
                    <div
                      className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-xl font-bold ${
                        isUrgent
                          ? 'bg-red-500/30 text-red-300 border border-red-500 animate-pulse'
                          : 'bg-slate-900/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{minsAgo} นาทีที่แล้ว</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 divide-y divide-slate-700/60">
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
                            <span className="font-bold text-base text-white flex-1 pr-2">
                              {item.name}
                            </span>
                            <span className="w-7 h-7 rounded-lg bg-orange-500 text-white font-extrabold text-sm flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>

                          {/* Selected Customizations & Toppings */}
                          {opts && opts.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {opts.map((opt: any, oIdx: number) => (
                                <div
                                  key={oIdx}
                                  className="text-xs text-amber-300 font-semibold flex items-center space-x-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                  <span>{opt.group ? `${opt.group}: ` : ''}{opt.choice || opt.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Special Note */}
                          {item.specialNote && (
                            <div className="mt-1.5 p-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-bold flex items-center space-x-1">
                              <span>⚠️ {item.specialNote}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t border-slate-700 bg-slate-900/60 space-y-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COOKING')}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all"
                      >
                        <Flame className="w-4 h-4" />
                        <span>🍳 เริ่มทำอาหาร</span>
                      </button>
                    )}

                    {order.status === 'COOKING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>🥗 ปรุงเสร็จแล้ว (พร้อมเสิร์ฟ)</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                        className="w-full py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.99] transition-all"
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

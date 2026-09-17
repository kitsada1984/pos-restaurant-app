'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { playOrderChime, playSuccessChime, playDeliveryChime } from '@/lib/sound';
import { useToast } from '@/context/ToastContext';
import KitchenTicketPrintModal from '@/components/KitchenTicketPrintModal';
import ServeConfirmModal from '@/components/ServeConfirmModal';

export default function KitchenTerminal({
  slug = 'lung-pa',
  isSplitView = false,
}: {
  slug?: string;
  isSplitView?: boolean;
}) {
  const { showSuccess, showInfo, showWarning, showError } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE' | 'PENDING' | 'COOKING' | 'READY' | 'DELIVERY'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showBatchBar, setShowBatchBar] = useState(true);
  const [confirmingServeOrder, setConfirmingServeOrder] = useState<any | null>(null);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const servedOrderIdsRef = useRef<Set<string>>(new Set());
  const pendingUpdatesRef = useRef<Map<string, {
    orderStatus?: string;
    itemStatuses: Record<string, string>;
    updatedAt: number;
  }>>(new Map());

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/r/${slug}/orders`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : [];
      const now = Date.now();

      // Clear stale pending updates (> 10 seconds)
      pendingUpdatesRef.current.forEach((update, oId) => {
        if (now - update.updatedAt > 10000) {
          pendingUpdatesRef.current.delete(oId);
        }
      });

      // Merge server orders with pending optimistic updates to avoid rebound
      const merged = raw
        .filter((o: any) => !servedOrderIdsRef.current.has(o.id))
        .map((o: any) => {
          const pending = pendingUpdatesRef.current.get(o.id);
          if (!pending) return o;

          let hasDivergence = false;
          const mergedItems = o.items?.map((it: any) => {
            const pendingStatus = pending.itemStatuses?.[it.id];
            if (pendingStatus && it.status !== pendingStatus) {
              hasDivergence = true;
              return { ...it, status: pendingStatus };
            }
            return it;
          });

          let mergedOrderStatus = o.status;
          if (pending.orderStatus && o.status !== pending.orderStatus) {
            hasDivergence = true;
            mergedOrderStatus = pending.orderStatus;
          }

          // If server data has fully caught up with our local optimistic state, clear pending
          if (!hasDivergence) {
            pendingUpdatesRef.current.delete(o.id);
          }

          return {
            ...o,
            status: mergedOrderStatus,
            items: mergedItems || o.items,
          };
        });

      setOrders(merged);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
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
              // Bug #4: Read order object from payload.data (or fallback payload.order)
              const orderData = payload.data || payload.order;
              const ch = orderData?.orderChannel;
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
                showInfo(`🛵 ออเดอร์เดลิเวอรีเข้าใหม่ (${label})`, `#${orderData?.deliveryOrderId || orderData?.id?.slice(-4)}`);
              } else {
                showInfo('มีออเดอร์ใหม่เข้าครัว 🛎️', `โต๊ะ ${orderData?.tableNo || orderData?.table?.tableNo || 'สั่งใหม่'}`);
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

    // Polling fallback every 10s to guarantee kitchen screen never misses an order
    const pollInterval = setInterval(() => {
      if (isSubscribed) {
        fetchOrders();
      }
    }, 10000);

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      eventSource?.close();
    };
  }, [slug, soundEnabled]);

  const updateItemStatus = (orderId: string, itemId: string, newStatus: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const targetItem = targetOrder.items?.find((it: any) => it.id === itemId);

    // คำนวณสถานะใหม่ของรายการและออเดอร์แบบ Synchronous ทันที ไม่รอ React batching
    const nextItems = targetOrder.items?.map((it: any) =>
      it.id === itemId ? { ...it, status: newStatus } : it
    ) || [];

    let nextOrderStatus = targetOrder.status;
    let allServed = false;
    if (nextItems.length > 0) {
      allServed = nextItems.every((it: any) => it.status === 'SERVED');
      const allReadyOrServed = nextItems.every((it: any) => it.status === 'READY' || it.status === 'SERVED');
      const anyCookingOrReady = nextItems.some(
        (it: any) => it.status === 'COOKING' || it.status === 'READY' || it.status === 'SERVED'
      );

      if (allServed) {
        nextOrderStatus = 'SERVED';
        servedOrderIdsRef.current.add(orderId);
      } else if (allReadyOrServed) {
        nextOrderStatus = 'READY';
        servedOrderIdsRef.current.delete(orderId);
      } else if (anyCookingOrReady) {
        nextOrderStatus = 'COOKING';
        servedOrderIdsRef.current.delete(orderId);
      } else {
        nextOrderStatus = 'PENDING';
        servedOrderIdsRef.current.delete(orderId);
      }
    }

    // ⚡ Optimistic UI Update: เปลี่ยนสถานะบนหน้าจอทันที 0ms ไม่หน่วงเวลา
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextOrderStatus, items: nextItems } : o))
    );

    // บันทึกเข้า pendingUpdatesRef เพื่อป้องกัน Race Condition จาก SSE และ Polling
    const currentPending = pendingUpdatesRef.current.get(orderId) || { itemStatuses: {}, updatedAt: Date.now() };
    pendingUpdatesRef.current.set(orderId, {
      orderStatus: nextOrderStatus,
      itemStatuses: {
        ...currentPending.itemStatuses,
        [itemId]: newStatus,
      },
      updatedAt: Date.now(),
    });

    // เสียงแจ้งเตือนและข้อความ Toast แจ้งเตือนทันที
    if (allServed) {
      playSuccessChime();
      showSuccess('เสิร์ฟครบทุกจานแล้ว ✨', 'ออเดอร์เสร็จสมบูรณ์');
    } else if (newStatus === 'READY') {
      playSuccessChime();
      showSuccess('พร้อมเสิร์ฟ 🔔', targetItem?.name ? `${targetItem.name} พร้อมเสิร์ฟ` : 'นำไปเสิร์ฟที่โต๊ะได้');
    } else if (newStatus === 'SERVED') {
      playSuccessChime();
      showSuccess('เสิร์ฟแล้ว ✨', targetItem?.name ? `${targetItem.name} เสิร์ฟเรียบร้อย` : 'เสิร์ฟเรียบร้อย');
    } else if (newStatus === 'COOKING') {
      showInfo('เริ่มปรุง 👨‍🍳', targetItem?.name || '');
    } else if (newStatus === 'PENDING') {
      showInfo('ย้อนสถานะเป็นรอทำ ⏳', targetItem?.name || '');
    }

    // ส่งบันทึกลง Database ใน Background ไม่บล็อก UI
    fetch(`/api/r/${slug}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, itemStatus: newStatus, status: nextOrderStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          const p = pendingUpdatesRef.current.get(orderId);
          if (p?.itemStatuses) {
            delete p.itemStatuses[itemId];
          }
          if (allServed) {
            servedOrderIdsRef.current.delete(orderId);
          }
          fetchOrders();
          showError('ไม่สามารถอัปเดตสถานะได้');
        }
      })
      .catch((err) => {
        console.error('Error updating item status:', err);
        const p = pendingUpdatesRef.current.get(orderId);
        if (p?.itemStatuses) {
          delete p.itemStatuses[itemId];
        }
        if (allServed) {
          servedOrderIdsRef.current.delete(orderId);
        }
        fetchOrders();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      });
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // คำนวณสถานะทุกจานแบบ Synchronous ทันที
    const itemStatuses: Record<string, string> = {};
    const nextItems = targetOrder.items?.map((it: any) => {
      let itemSt = it.status;
      if (newStatus === 'READY') itemSt = it.status === 'SERVED' ? 'SERVED' : 'READY';
      else if (newStatus === 'SERVED') itemSt = 'SERVED';
      else if (newStatus === 'COOKING' && it.status === 'PENDING') itemSt = 'COOKING';
      itemStatuses[it.id] = itemSt;
      return { ...it, status: itemSt };
    }) || [];

    // ⚡ Optimistic UI Update: เปลี่ยนสถานะและเคลียร์บิลบนหน้าจอทันที 0ms
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, items: nextItems } : o))
    );

    // บันทึกเข้า pendingUpdatesRef
    pendingUpdatesRef.current.set(orderId, {
      orderStatus: newStatus,
      itemStatuses,
      updatedAt: Date.now(),
    });

    // เสียงแจ้งเตือนและข้อความ Toast แสดงทันที
    if (newStatus === 'READY') {
      playSuccessChime();
      showSuccess('ออเดอร์พร้อมเสิร์ฟครบทุกจาน 🔔');
    } else if (newStatus === 'SERVED') {
      playSuccessChime();
      showSuccess('เสิร์ฟออเดอร์ครบถ้วน ✨');
    } else if (newStatus === 'CANCELLED') {
      showWarning('ยกเลิกออเดอร์เรียบร้อย');
    }

    // ส่งบันทึกลง Database ใน Background ไม่บล็อก UI
    fetch(`/api/r/${slug}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          pendingUpdatesRef.current.delete(orderId);
          fetchOrders();
          showError('ไม่สามารถอัปเดตสถานะได้');
        }
      })
      .catch((err) => {
        console.error('Error updating order status:', err);
        pendingUpdatesRef.current.delete(orderId);
        fetchOrders();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      });
  };

  // ↩️ ฟังก์ชันย้อนสถานะ (Undo / Rollback) เผื่อแม่ครัวหรือพนักงานกดผิด
  const undoOrderStatus = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    let prevStatus = 'PENDING';
    if (targetOrder.status === 'READY') {
      prevStatus = 'COOKING';
    } else if (targetOrder.status === 'COOKING') {
      prevStatus = 'PENDING';
    } else {
      return;
    }

    const itemStatuses: Record<string, string> = {};
    const nextItems = targetOrder.items?.map((it: any) => {
      let itemSt = it.status;
      if (prevStatus === 'COOKING' && (it.status === 'READY' || it.status === 'SERVED')) {
        itemSt = 'COOKING';
      } else if (prevStatus === 'PENDING') {
        itemSt = 'PENDING';
      }
      itemStatuses[it.id] = itemSt;
      return { ...it, status: itemSt };
    }) || [];

    // ⚡ Optimistic UI Revert ทันที 0ms
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus, items: nextItems } : o))
    );

    pendingUpdatesRef.current.set(orderId, {
      orderStatus: prevStatus,
      itemStatuses,
      updatedAt: Date.now(),
    });

    const title = prevStatus === 'COOKING' ? 'ย้อนสถานะเป็นกำลังปรุง 👨‍🍳' : 'ย้อนสถานะเป็นรอทำ ⏳';
    const sub = targetOrder.table?.name || (targetOrder.tableNo ? `โต๊ะ ${targetOrder.tableNo}` : '');
    showInfo(title, sub);

    fetch(`/api/r/${slug}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: prevStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          pendingUpdatesRef.current.delete(orderId);
          fetchOrders();
          showError('ไม่สามารถย้อนสถานะได้');
        }
      })
      .catch((err) => {
        console.error('Error undoing status:', err);
        pendingUpdatesRef.current.delete(orderId);
        fetchOrders();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      });
  };

  // ✅ ยืนยันการเสิร์ฟออเดอร์: หายถาวรทันที 0ms ไม่มีการเด้งกลับมา
  const confirmServeOrder = (orderId: string) => {
    // 1. เพิ่มเข้า servedOrderIdsRef ป้องกันการเด้งกลับจากการ fetch ข้อมูล
    servedOrderIdsRef.current.add(orderId);
    pendingUpdatesRef.current.delete(orderId);

    // 2. ปิดโมดอลยืนยัน
    setConfirmingServeOrder(null);

    // 3. ลบออเดอร์ออกจากหน้าจอทันที 0ms (หายถาวร)
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // 4. เสียงและข้อความแจ้งเตือนทันที
    playSuccessChime();
    showSuccess('เสิร์ฟออเดอร์เรียบร้อย ✨');

    // 5. ส่งบันทึกลง Database ใน Background
    fetch(`/api/r/${slug}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SERVED' }),
    })
      .then((res) => {
        if (!res.ok) {
          servedOrderIdsRef.current.delete(orderId);
          fetchOrders();
          showError('ไม่สามารถอัปเดตสถานะเสิร์ฟได้');
        }
      })
      .catch((err) => {
        console.error('Error serving order:', err);
        servedOrderIdsRef.current.delete(orderId);
        fetchOrders();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      });
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

  // Batch Cooking Aggregator: Summarize identical dishes pending or cooking
  const batchCookingSummary = useMemo(() => {
    const pendingAndCookingOrders = orders.filter((o) => ['PENDING', 'COOKING'].includes(o.status));
    const map = new Map<string, { name: string; quantity: number; tables: string[]; notes: string[] }>();

    pendingAndCookingOrders.forEach((o) => {
      const tableLabel = o.tableNo ? `โต๊ะ ${o.tableNo}` : (o.orderChannel !== 'DINE_IN' ? o.orderChannel : 'กลับบ้าน');
      o.items?.forEach((item: any) => {
        if (item.status === 'READY' || item.status === 'SERVED') return;
        const key = item.name;
        if (!map.has(key)) {
          map.set(key, { name: item.name, quantity: 0, tables: [], notes: [] });
        }
        const entry = map.get(key)!;
        entry.quantity += item.quantity || 1;
        if (!entry.tables.includes(tableLabel)) {
          entry.tables.push(tableLabel);
        }
        if (item.specialNote && !entry.notes.includes(item.specialNote)) {
          entry.notes.push(item.specialNote);
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div className="flex items-center justify-between w-full md:w-auto">
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

          {/* Sound Toggle Button (Mobile) */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`md:hidden p-2 rounded-xl border text-xs font-bold flex items-center transition-all ${
              soundEnabled ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
            title={soundEnabled ? 'ปิดเสียงกระดิ่ง' : 'เปิดเสียงกระดิ่ง'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          {/* Sound Toggle Button (Desktop) */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`hidden md:flex px-3 py-2 rounded-xl border text-xs font-bold items-center space-x-1.5 transition-all ${
              soundEnabled ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
            title={soundEnabled ? 'ปิดเสียงกระดิ่ง' : 'เปิดเสียงกระดิ่ง'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundEnabled ? 'เสียงกระดิ่งเปิด' : 'เสียงปิด'}</span>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
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
      </div>

      {/* Batch Cooking Aggregator Banner */}
      {batchCookingSummary.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Flame className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-amber-950">
                🍳 สรุปเมนูปรุงพร้อมกัน (Batch Cooking) — {batchCookingSummary.reduce((s, i) => s + i.quantity, 0)} จานค้างทำ
              </h3>
            </div>
            <button
              onClick={() => setShowBatchBar(!showBatchBar)}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg hover:bg-amber-100/60 transition-all"
            >
              {showBatchBar ? 'ย่อแถบ ▲' : 'ขยายดู ▼'}
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
      )}

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
        <div className={`grid gap-4 sm:gap-5 ${isSplitView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isCooking = order.status === 'COOKING';
            const isReady = order.status === 'READY';
            const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);

            // Progress Bar Calculation
            const totalItems = order.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 0;
            const completedItems =
              order.items?.reduce((sum: number, it: any) => {
                if (it.status === 'READY' || it.status === 'SERVED') {
                  return sum + (it.quantity || 1);
                }
                return sum;
              }, 0) || 0;
            const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

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
                className={`rounded-3xl border shadow-sm flex flex-col justify-between overflow-hidden bg-white transition-all duration-200 ${
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
                  {(() => {
                    const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
                    const isUrgent = elapsedMin >= 15 && order.status !== 'READY';
                    const isWarning = elapsedMin >= 10 && elapsedMin < 15 && order.status !== 'READY';

                    return (
                      <div className="text-right flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold block opacity-95">{formatTime(order.createdAt)}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black mt-1 shadow-xs ${
                              isUrgent
                                ? 'bg-rose-500 text-white animate-pulse ring-2 ring-white/60'
                                : isWarning
                                ? 'bg-amber-300 text-slate-950 font-black'
                                : 'bg-black/25 text-white/95'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{isUrgent ? `🔥 รอ ${elapsedMin} น.` : isWarning ? `⚠️ ${elapsedMin} น.` : `${elapsedMin} น.`}</span>
                          </span>
                        </div>

                        {/* 🖨️ Print Kitchen Ticket Button in Header */}
                        <button
                          type="button"
                          onClick={() => setPrintingOrder(order)}
                          title="พิมพ์ใบสั่งอาหารห้องครัว (KOT)"
                          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 active:scale-90 text-white shadow-2xs transition-all duration-150 cursor-pointer flex items-center justify-center border border-white/30 backdrop-blur-xs"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* 📊 แถบความคืบหน้า (Item Progress Bar) */}
                {(() => {
                  const totalCount = order.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 0;
                  const servedCount =
                    order.items?.reduce((sum: number, it: any) => {
                      if (it.status === 'SERVED') return sum + (it.quantity || 1);
                      return sum;
                    }, 0) || 0;
                  const readyCount =
                    order.items?.reduce((sum: number, it: any) => {
                      if (it.status === 'READY') return sum + (it.quantity || 1);
                      return sum;
                    }, 0) || 0;
                  const progress = totalCount > 0 ? Math.round(((servedCount + readyCount) / totalCount) * 100) : 0;

                  return (
                    <>
                      <div className="bg-slate-50/95 border-b border-slate-100 px-4 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-600">
                          <Utensils className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            เสิร์ฟแล้ว {servedCount}/{totalCount} จาน
                            {readyCount > 0 && (
                              <span className="text-emerald-600 font-extrabold ml-1.5">• พร้อมเสิร์ฟ {readyCount} จาน</span>
                            )}
                          </span>
                        </div>
                        <span className={`font-black ${servedCount === totalCount && totalCount > 0 ? 'text-emerald-600' : readyCount > 0 ? 'text-teal-600' : 'text-amber-600'}`}>
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            servedCount === totalCount && totalCount > 0
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : readyCount > 0
                              ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </>
                  );
                })()}

                {/* Ticket Items */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
                  {order.note && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                      ⚠️ {order.note}
                    </div>
                  )}

                  <div className="space-y-2">
                    {order.items?.map((item: any, idx: number) => {
                      let parsedOptions: any[] = [];
                      if (item.selectedOptions) {
                        try {
                          parsedOptions = JSON.parse(item.selectedOptions);
                        } catch (e) {}
                      }

                      const itemIndex = idx + 1;
                      const isItemServed = item.status === 'SERVED';
                      const isItemReady = item.status === 'READY';
                      const isItemCooking = item.status === 'COOKING';

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-2.5 rounded-xl border transition-all duration-200 ${
                            isItemCooking
                              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/80 shadow-xs'
                              : isItemReady
                              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/80 shadow-xs'
                              : isItemServed
                              ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5">
                                {/* Dish Sequence Number */}
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                                    isItemCooking
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : isItemReady
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : isItemServed
                                      ? 'bg-slate-200 text-slate-500'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                  }`}
                                >
                                  #{itemIndex}
                                </span>

                                {/* Quantity */}
                                <span
                                  className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 transition-colors ${
                                    isItemServed
                                      ? 'bg-slate-300 text-slate-700'
                                      : isItemReady
                                      ? 'bg-emerald-600 text-white'
                                      : isItemCooking
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-900 text-white'
                                  }`}
                                >
                                  {item.quantity}
                                </span>

                                {/* Dish Name */}
                                <span
                                  className={`font-extrabold text-sm transition-all ${
                                    isItemServed
                                      ? 'line-through text-slate-400 font-medium'
                                      : isItemCooking
                                      ? 'text-amber-950 font-black'
                                      : isItemReady
                                      ? 'text-emerald-950 font-black'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {item.name}
                                </span>

                                {/* Status Indicator Badges */}
                                {isItemCooking && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    <Flame className="w-3 h-3 text-amber-600" />
                                    กำลังปรุง
                                  </span>
                                )}
                                {isItemReady && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
                                    <BellRing className="w-3 h-3 text-emerald-600" />
                                    พร้อมเสิร์ฟ
                                  </span>
                                )}
                                {isItemServed && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    ✓ เสิร์ฟแล้ว
                                  </span>
                                )}
                              </div>

                              {/* Options */}
                              {parsedOptions.length > 0 && (
                                <div className="mt-1.5 pl-6 flex flex-wrap gap-1">
                                  {parsedOptions.map((opt: any, oIdx: number) => (
                                    <span
                                      key={oIdx}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        isItemServed
                                          ? 'bg-slate-100 text-slate-400 line-through'
                                          : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                                      }`}
                                    >
                                      {opt.group ? `${opt.group}: ` : ''}{opt.choice || opt.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Special Note */}
                              {item.specialNote && (
                                <div
                                  className={`mt-1.5 pl-6 text-[11px] font-bold flex items-center gap-1 ${
                                    isItemServed ? 'text-slate-400 line-through' : 'text-amber-700'
                                  }`}
                                >
                                  <span>💬 {item.specialNote}</span>
                                </div>
                              )}
                            </div>

                            {/* 4-State dish button: [รอทำ] -> [🔥 กำลังปรุง] -> [🛎️ พร้อมเสิร์ฟ] -> [✓ เสิร์ฟแล้ว] -> [รอทำ] */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus =
                                  item.status === 'PENDING' || !item.status
                                    ? 'COOKING'
                                    : item.status === 'COOKING'
                                    ? 'READY'
                                    : item.status === 'READY'
                                    ? 'SERVED'
                                    : 'PENDING';
                                updateItemStatus(order.id, item.id, nextStatus);
                              }}
                              title={
                                isItemServed
                                  ? 'คลิกเพื่อย้อนกลับเป็นรอทำ'
                                  : isItemReady
                                  ? 'คลิกเมื่อยกไปเสิร์ฟที่โต๊ะแล้ว'
                                  : isItemCooking
                                  ? 'คลิกเมื่อปรุงเสร็จพร้อมเสิร์ฟ'
                                  : 'คลิกเพื่อเริ่มปรุงจานนี้'
                              }
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold border active:scale-90 transition-all duration-150 cursor-pointer shadow-2xs whitespace-nowrap flex items-center gap-1 shrink-0 ${
                                isItemServed
                                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                  : isItemReady
                                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs ring-2 ring-emerald-400/50'
                                  : isItemCooking
                                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {isItemServed ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>เสิร์ฟแล้ว</span>
                                </>
                              ) : isItemReady ? (
                                <>
                                  <BellRing className="w-3.5 h-3.5 text-white animate-bounce" />
                                  <span>พร้อมเสิร์ฟ</span>
                                </>
                              ) : isItemCooking ? (
                                <>
                                  <Flame className="w-3.5 h-3.5 text-white animate-pulse" />
                                  <span>กำลังปรุง</span>
                                </>
                              ) : (
                                <span>รอทำ</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ยืนยันการเสิร์ฟอาหาร (ป้องกันกดพลาด & หายถาวรทันที 0ms) */}
      <ServeConfirmModal
        isOpen={!!confirmingServeOrder}
        onClose={() => setConfirmingServeOrder(null)}
        order={confirmingServeOrder}
        onConfirm={() => confirmingServeOrder && confirmServeOrder(confirmingServeOrder.id)}
      />

      {/* Modal พิมพ์ใบสั่งอาหารห้องครัว (KOT) */}
      <KitchenTicketPrintModal
        isOpen={!!printingOrder}
        onClose={() => setPrintingOrder(null)}
        order={printingOrder}
      />
    </div>
  );
}

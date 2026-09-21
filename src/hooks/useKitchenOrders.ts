'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { playOrderChime, playSuccessChime, playDeliveryChime } from '@/lib/sound';
import { useToast } from '@/context/ToastContext';
import { subscribeRealtime } from '@/lib/realtimeManager';
import { printKitchenTicketDirect } from '@/lib/thermalPrinter';

export interface KitchenDishItem {
  id: string;
  name: string;
  quantity: number;
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED';
  selectedOptions?: string;
  specialNote?: string;
  [key: string]: any;
}

export interface KitchenOrder {
  id: string;
  orderNumber?: string;
  tableNo?: string | number;
  orderChannel: string;
  orderType?: string;
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string | Date;
  deliveryOrderId?: string;
  riderName?: string;
  customerName?: string;
  note?: string;
  table?: { name?: string; tableNo?: string | number };
  items: KitchenDishItem[];
  [key: string]: any;
}

export interface BatchCookingDish {
  name: string;
  quantity: number;
  tables: string[];
  notes: string[];
}

export interface UseKitchenOrdersOptions {
  slug?: string;
  initialSoundEnabled?: boolean;
}

/**
 * Deep Kitchen State Aggregate Hook
 * Encapsulates:
 * - Realtime SSE events with optimistic local updates and rebound suppression
 * - Stale pending updates clearance
 * - 4-stage cooking pipeline (PENDING -> COOKING -> READY -> SERVED)
 * - Order & item status transitions with automatic rollback on network failure
 * - Batch cooking aggregation across multi-table active tickets
 */
export function useKitchenOrders({
  slug = 'lung-pa',
  initialSoundEnabled = true,
}: UseKitchenOrdersOptions = {}) {
  const { showSuccess, showInfo, showWarning, showError } = useToast();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE' | 'PENDING' | 'COOKING' | 'READY' | 'DELIVERY'
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [showBatchBar, setShowBatchBar] = useState(true);
  const [confirmingServeOrder, setConfirmingServeOrder] = useState<KitchenOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<KitchenOrder | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`kds_auto_print_${slug}`);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false;
  });
  const [storeSettings, setStoreSettings] = useState<any>(null);

  const servedOrderIdsRef = useRef<Set<string>>(new Set());
  const printedOrderIdsRef = useRef<Set<string>>(new Set());
  const pendingUpdatesRef = useRef<
    Map<
      string,
      {
        orderStatus?: string;
        itemStatuses: Record<string, string>;
        updatedAt: number;
      }
    >
  >(new Map());

  // Load store settings to get store name and default auto-print config
  useEffect(() => {
    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setStoreSettings(data);
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`kds_auto_print_${slug}`);
            if (saved === null && data.autoPrintKitchenTicket !== undefined) {
              setAutoPrintEnabled(Boolean(data.autoPrintKitchenTicket));
            }
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  const toggleAutoPrint = useCallback(
    (explicit?: boolean) => {
      setAutoPrintEnabled((prev) => {
        const next = explicit !== undefined ? explicit : !prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem(`kds_auto_print_${slug}`, String(next));
        }
        if (next) {
          showSuccess('เปิดพิมพ์ออเดอร์อัตโนมัติ 🖨️', 'เมื่อมีออเดอร์ใหม่เข้า จะสั่งพิมพ์ใบส่งครัวทันที');
        } else {
          showInfo('ปิดพิมพ์ออเดอร์อัตโนมัติ', 'เปลี่ยนเป็นพิมพ์ด้วยตนเอง');
        }
        return next;
      });
    },
    [slug, showSuccess, showInfo]
  );

  const fetchOrders = useCallback(async () => {
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
        .filter((o: KitchenOrder) => !servedOrderIdsRef.current.has(o.id))
        .map((o: KitchenOrder) => {
          const pending = pendingUpdatesRef.current.get(o.id);
          if (!pending) return o;

          let hasDivergence = false;
          const mergedItems = o.items?.map((it: KitchenDishItem) => {
            const pendingStatus = pending.itemStatuses?.[it.id];
            if (pendingStatus && it.status !== pendingStatus) {
              hasDivergence = true;
              return { ...it, status: pendingStatus as any };
            }
            return it;
          });

          let mergedOrderStatus = o.status;
          if (pending.orderStatus && o.status !== pending.orderStatus) {
            hasDivergence = true;
            mergedOrderStatus = pending.orderStatus as any;
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
  }, [slug]);

  useEffect(() => {
    fetchOrders();

    const unsubscribe = subscribeRealtime(slug, (payload) => {
      try {
        if (payload.type === 'ORDER_CREATED') {
          const orderData = payload.data || payload.order;
          const ch = orderData?.orderChannel;
          const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD', 'FOODPANDA', 'KLIKIT'].includes(ch);
          if (soundEnabled) {
            if (isDelivery) {
              playDeliveryChime();
            } else {
              playOrderChime();
            }
          }

          if (isDelivery) {
            const label =
              ch === 'LINEMAN'
                ? 'LINE MAN'
                : ch === 'GRAB'
                ? 'GrabFood'
                : ch === 'SHOPEE_FOOD'
                ? 'ShopeeFood'
                : ch === 'FOODPANDA'
                ? 'foodpanda'
                : ch === 'KLIKIT'
                ? 'Klikit'
                : 'Robinhood';
            showInfo(`🛵 ออเดอร์เดลิเวอรีเข้าใหม่ (${label})`, `#${orderData?.deliveryOrderId || orderData?.id?.slice(-4)}`);
          } else {
            showInfo('มีออเดอร์ใหม่เข้าครัว 🛎️', `โต๊ะ ${orderData?.tableNo || orderData?.table?.tableNo || 'สั่งใหม่'}`);
          }

          // 🖨️ Auto-print Kitchen Ticket when enabled
          if (autoPrintEnabled && orderData && orderData.id) {
            if (!printedOrderIdsRef.current.has(orderData.id)) {
              printedOrderIdsRef.current.add(orderData.id);
              setTimeout(() => {
                printKitchenTicketDirect(orderData, storeSettings, {
                  width: storeSettings?.printerPaperWidth || '80mm',
                  copies: 1,
                }).catch((err) => console.warn('Auto print failed:', err));
              }, 400);
            }
          }

          fetchOrders();
        } else if (payload.type === 'ORDER_UPDATED' || payload.type === 'TABLE_UPDATED') {
          fetchOrders();
        }
      } catch (e) {}
    });

    // Polling fallback every 15s to guarantee kitchen screen never misses an order
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [slug, soundEnabled, autoPrintEnabled, storeSettings, fetchOrders, showInfo]);

  const updateItemStatus = useCallback(
    (orderId: string, itemId: string, newStatus: string) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (!targetOrder) return;

      const targetItem = targetOrder.items?.find((it) => it.id === itemId);

      const nextItems =
        targetOrder.items?.map((it) =>
          it.id === itemId ? { ...it, status: newStatus as any } : it
        ) || [];

      let nextOrderStatus = targetOrder.status;
      let allServed = false;
      if (nextItems.length > 0) {
        allServed = nextItems.every((it) => it.status === 'SERVED');
        const allReadyOrServed = nextItems.every((it) => it.status === 'READY' || it.status === 'SERVED');
        const anyCookingOrReady = nextItems.some(
          (it) => it.status === 'COOKING' || it.status === 'READY' || it.status === 'SERVED'
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

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextOrderStatus, items: nextItems } : o))
      );

      const currentPending = pendingUpdatesRef.current.get(orderId) || { itemStatuses: {}, updatedAt: Date.now() };
      pendingUpdatesRef.current.set(orderId, {
        orderStatus: nextOrderStatus,
        itemStatuses: {
          ...currentPending.itemStatuses,
          [itemId]: newStatus,
        },
        updatedAt: Date.now(),
      });

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
    },
    [orders, slug, fetchOrders, showSuccess, showInfo, showError]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, newStatus: string) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (!targetOrder) return;

      const itemStatuses: Record<string, string> = {};
      const nextItems =
        targetOrder.items?.map((it) => {
          let itemSt = it.status;
          if (newStatus === 'READY') itemSt = it.status === 'SERVED' ? 'SERVED' : 'READY';
          else if (newStatus === 'SERVED') itemSt = 'SERVED';
          else if (newStatus === 'COOKING' && it.status === 'PENDING') itemSt = 'COOKING';
          itemStatuses[it.id] = itemSt;
          return { ...it, status: itemSt as any };
        }) || [];

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any, items: nextItems } : o))
      );

      pendingUpdatesRef.current.set(orderId, {
        orderStatus: newStatus,
        itemStatuses,
        updatedAt: Date.now(),
      });

      if (newStatus === 'READY') {
        playSuccessChime();
        showSuccess('ออเดอร์พร้อมเสิร์ฟครบทุกจาน 🔔');
      } else if (newStatus === 'SERVED') {
        playSuccessChime();
        showSuccess('เสิร์ฟออเดอร์ครบถ้วน ✨');
      } else if (newStatus === 'CANCELLED') {
        showWarning('ยกเลิกออเดอร์เรียบร้อย');
      }

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
    },
    [orders, slug, fetchOrders, showSuccess, showWarning, showError]
  );

  const undoOrderStatus = useCallback(
    (orderId: string) => {
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
      const nextItems =
        targetOrder.items?.map((it) => {
          let itemSt = it.status;
          if (prevStatus === 'COOKING' && (it.status === 'READY' || it.status === 'SERVED')) {
            itemSt = 'COOKING';
          } else if (prevStatus === 'PENDING') {
            itemSt = 'PENDING';
          }
          itemStatuses[it.id] = itemSt;
          return { ...it, status: itemSt as any };
        }) || [];

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus as any, items: nextItems } : o))
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
    },
    [orders, slug, fetchOrders, showInfo, showError]
  );

  const confirmServeOrder = useCallback(
    (orderId: string) => {
      servedOrderIdsRef.current.add(orderId);
      pendingUpdatesRef.current.delete(orderId);

      setConfirmingServeOrder(null);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));

      playSuccessChime();
      showSuccess('เสิร์ฟออเดอร์เรียบร้อย ✨');

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
    },
    [slug, fetchOrders, showSuccess, showError]
  );

  const deliveryOrdersCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD', 'FOODPANDA', 'KLIKIT'].includes(o.orderChannel) &&
          ['PENDING', 'COOKING', 'READY'].includes(o.status)
      ).length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus === 'DELIVERY') {
        return (
          ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD', 'FOODPANDA', 'KLIKIT'].includes(order.orderChannel) &&
          ['PENDING', 'COOKING', 'READY'].includes(order.status)
        );
      }
      if (filterStatus === 'ACTIVE') {
        return ['PENDING', 'COOKING', 'READY'].includes(order.status);
      }
      return order.status === filterStatus;
    });
  }, [orders, filterStatus]);

  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'PENDING').length, [orders]);
  const cookingCount = useMemo(() => orders.filter((o) => o.status === 'COOKING').length, [orders]);
  const readyCount = useMemo(() => orders.filter((o) => o.status === 'READY').length, [orders]);

  const batchCookingSummary = useMemo(() => {
    const pendingAndCookingOrders = orders.filter((o) => ['PENDING', 'COOKING'].includes(o.status));
    const map = new Map<string, { name: string; quantity: number; tables: string[]; notes: string[] }>();

    pendingAndCookingOrders.forEach((o) => {
      const tableLabel = o.tableNo ? `โต๊ะ ${o.tableNo}` : o.orderChannel !== 'DINE_IN' ? o.orderChannel : 'กลับบ้าน';
      o.items?.forEach((item) => {
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

  return {
    orders,
    loading,
    filterStatus,
    setFilterStatus,
    soundEnabled,
    setSoundEnabled,
    showBatchBar,
    setShowBatchBar,
    confirmingServeOrder,
    setConfirmingServeOrder,
    printingOrder,
    setPrintingOrder,
    fetchOrders,
    updateItemStatus,
    updateOrderStatus,
    undoOrderStatus,
    confirmServeOrder,
    filteredOrders,
    pendingCount,
    cookingCount,
    readyCount,
    deliveryOrdersCount,
    batchCookingSummary,
    autoPrintEnabled,
    toggleAutoPrint,
    storeSettings,
  };
}

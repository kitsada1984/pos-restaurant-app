'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReceiptPrintModal from '@/components/ReceiptPrintModal';
import {
  Banknote,
  Camera,
  ArrowRightLeft,
  Plus,
  X,
  Printer,
  Volume2,
  VolumeX,
  BellRing,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import {
  playOrderChime,
  playSuccessChime,
  playDeliveryChime,
  playServiceCallChime,
  playButtonTapSound,
  speakThaiVoice,
  speakMoneyReceived,
  speakSlipSubmitted,
  speakCustomerNotifyTransfer,
  speakServiceCall,
} from '@/lib/sound';
import { useToast } from '@/context/ToastContext';
import { fetchWithCache, invalidateCache } from '@/lib/clientCache';
import { subscribeRealtime } from '@/lib/realtimeManager';

import CashierOrderModal from './pos/CashierOrderModal';
import TableActionModals from './pos/TableActionModals';
import ServiceCallModal, { ServiceCallItem, ServiceCallAlertMode } from './pos/ServiceCallModal';
import BankAlertModal from './pos/BankAlertModal';
import CheckoutModal from './pos/CheckoutModal';

export default function PosTerminal({
  slug = 'lung-pa',
  isSplitView = false,
}: {
  slug?: string;
  isSplitView?: boolean;
}) {
  const { showSuccess, showError, showInfo } = useToast();
  const [tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'PAYMENT_PENDING' | 'DELIVERY'>('ALL');

  // Delivery Channels & Hub State
  const [orderChannel, setOrderChannel] = useState<'DINE_IN' | 'TAKEAWAY' | 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD'>('DINE_IN');
  const [deliveryOrderId, setDeliveryOrderId] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);

  // Selected Table Drawer & Modal Triggers
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isCashierOrderOpen, setIsCashierOrderOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Print Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Bank Alert Queue & Modal State
  const [bankAlertQueue, setBankAlertQueue] = useState<any[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeServiceCalls, setActiveServiceCalls] = useState<{ [tableKey: string]: { requestType: string; timestamp: number } }>({});

  // Service Call Queue & Pop-up Modal State
  const [serviceCallQueue, setServiceCallQueue] = useState<ServiceCallItem[]>([]);
  const [activeServiceCallIndex, setActiveServiceCallIndex] = useState<number>(0);
  const [isServiceCallModalOpen, setIsServiceCallModalOpen] = useState<boolean>(false);

  const [serviceCallAlertMode, setServiceCallAlertMode] = useState<ServiceCallAlertMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_service_call_alert_mode');
      if (saved === 'BOTH' || saved === 'VOICE_ONLY' || saved === 'CHIME_ONLY' || saved === 'MUTE') {
        return saved;
      }
    }
    return 'BOTH';
  });
  const serviceCallAlertModeRef = useRef(serviceCallAlertMode);
  useEffect(() => {
    serviceCallAlertModeRef.current = serviceCallAlertMode;
  }, [serviceCallAlertMode]);

  const updateServiceCallAlertMode = (mode: ServiceCallAlertMode) => {
    setServiceCallAlertMode(mode);
    serviceCallAlertModeRef.current = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_service_call_alert_mode', mode);
    }
  };

  // Repeat service call alert every 20 seconds as long as there is an unacknowledged call
  useEffect(() => {
    if (serviceCallQueue.length === 0 || serviceCallAlertMode === 'MUTE') return;

    const repeatTimer = setInterval(() => {
      const call = serviceCallQueue[activeServiceCallIndex] || serviceCallQueue[0];
      if (call) {
        if (serviceCallAlertMode === 'BOTH') {
          playServiceCallChime();
          setTimeout(() => {
            speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
          }, 650);
        } else if (serviceCallAlertMode === 'VOICE_ONLY') {
          speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
        } else if (serviceCallAlertMode === 'CHIME_ONLY') {
          playServiceCallChime();
        }
      }
    }, 20000);

    return () => clearInterval(repeatTimer);
  }, [serviceCallQueue, activeServiceCallIndex, serviceCallAlertMode]);

  const addServiceCall = (call: Omit<ServiceCallItem, 'id'> & { id?: string }) => {
    const callId = call.id || `call_${call.tableNo}_${Date.now()}`;
    const newCall: ServiceCallItem = { ...call, id: callId };

    setServiceCallQueue((prev) => {
      const idx = prev.findIndex((p) => p.tableNo === call.tableNo);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newCall;
        return updated;
      }
      return [...prev, newCall];
    });

    const key = String(call.tableNo);
    setActiveServiceCalls((prev) => ({
      ...prev,
      [key]: { requestType: call.requestType, timestamp: call.timestamp || Date.now() },
    }));

    setIsServiceCallModalOpen(true);
  };

  const dismissedCallKeysRef = useRef<Set<string>>(new Set());

  const dismissServiceCall = (callId: string) => {
    setServiceCallQueue((prev) => {
      const call = prev.find((c) => c.id === callId);
      if (call) {
        dismissedCallKeysRef.current.add(`${call.tableNo}_${call.timestamp}`);
        const key = String(call.tableNo);
        setActiveServiceCalls((activePrev) => {
          const next = { ...activePrev };
          delete next[key];
          return next;
        });
      }
      const nextQueue = prev.filter((c) => c.id !== callId);
      if (nextQueue.length === 0) {
        setIsServiceCallModalOpen(false);
        setActiveServiceCallIndex(0);
      } else {
        setActiveServiceCallIndex((idx) => Math.min(idx, nextQueue.length - 1));
      }
      return nextQueue;
    });

    fetch(`/api/r/${slug}/service-call`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: callId, action: 'DISMISS' }),
    }).catch(() => {});
  };

  const dismissAllServiceCalls = () => {
    serviceCallQueue.forEach((call) => {
      dismissedCallKeysRef.current.add(`${call.tableNo}_${call.timestamp}`);
    });
    setServiceCallQueue([]);
    setActiveServiceCalls({});
    setIsServiceCallModalOpen(false);
    setActiveServiceCallIndex(0);

    fetch(`/api/r/${slug}/service-call`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DISMISS_ALL' }),
    }).catch(() => {});
  };

  const addBankAlert = (alert: any) => {
    const alertId = alert.id || `${alert.tableNo || alert.tableId || 'table'}_${Date.now()}`;
    const itemWithId = { ...alert, id: alertId };

    setBankAlertQueue((prev) => {
      const existingIndex = prev.findIndex(
        (p) =>
          (alert.tableNo && p.tableNo === alert.tableNo) ||
          (alert.tableId && p.tableId === alert.tableId)
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...prev[existingIndex], ...itemWithId };
        return updated;
      }
      return [...prev, itemWithId];
    });

    setActiveAlertId((curr) => curr || alertId);
    setIsAlertModalOpen(true);
  };

  const dismissCurrentAlert = () => {
    setIsAlertModalOpen(false);
  };

  const resolveAlertAndNext = (alertId: string) => {
    setBankAlertQueue((prev) => {
      const nextQueue = prev.filter((a) => a.id !== alertId);
      if (nextQueue.length === 0) {
        setIsAlertModalOpen(false);
        setActiveAlertId(null);
      } else {
        setActiveAlertId(nextQueue[0].id);
      }
      return nextQueue;
    });
  };

  // Voice Announcement State
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_voice_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pos_audio_unlocked') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsAudioUnlocked(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_audio_unlocked', 'true');
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Sync voice state across components (Navbar, Kitchen, POS)
  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setVoiceEnabled(e.detail.enabled);
      }
    };
    window.addEventListener('pos-voice-changed', handleVoiceChange);
    return () => window.removeEventListener('pos-voice-changed', handleVoiceChange);
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        invalidateCache(slug);
      }
      const [tData, mData, sData, oData] = await Promise.all([
        fetch(`/api/r/${slug}/tables`).then((r) => r.json()).catch(() => []),
        fetchWithCache(`menu_${slug}`, () => fetch(`/api/r/${slug}/menu`).then((r) => r.json()).catch(() => []), 60000),
        fetchWithCache(`settings_${slug}`, () => fetch(`/api/r/${slug}/settings`).then((r) => r.json()).catch(() => null), 60000),
        fetch(`/api/r/${slug}/orders`).then((r) => r.json()).catch(() => []),
      ]);
      setTables(Array.isArray(tData) ? tData : []);
      setCategories(Array.isArray(mData) ? mData : []);
      setStore(sData?.error ? null : sData);

      const safeOrders = Array.isArray(oData) ? oData : [];
      const activeDeliveries = safeOrders.filter(
        (o: any) =>
          ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(o.orderChannel) &&
          ['PENDING', 'COOKING', 'READY', 'SERVED'].includes(o.status)
      );
      setDeliveryOrders(activeDeliveries);

      if (selectedTable && Array.isArray(tData)) {
        const updated = tData.find((t: any) => t.id === selectedTable.id || t.tableNo === selectedTable.tableNo);
        if (updated) setSelectedTable(updated);
      }

      // Synchronize active service calls from DB
      if (Array.isArray(tData)) {
        tData.forEach((tableItem: any) => {
          if (tableItem.activeServiceCall) {
            const call = tableItem.activeServiceCall;
            const callKey = `${call.tableNo}_${call.timestamp}`;
            if (!dismissedCallKeysRef.current.has(callKey)) {
              setServiceCallQueue((prevQueue) => {
                const alreadyExists = prevQueue.some(
                  (q) => q.tableNo === call.tableNo && Math.abs(q.timestamp - call.timestamp) < 5000
                );
                if (!alreadyExists) {
                  const mode = serviceCallAlertModeRef.current;
                  if (mode === 'BOTH') {
                    playServiceCallChime();
                    setTimeout(() => {
                      speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                    }, 650);
                  } else if (mode === 'VOICE_ONLY') {
                    speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                  } else if (mode === 'CHIME_ONLY') {
                    playServiceCallChime();
                  }
                  setIsServiceCallModalOpen(true);
                  return [...prevQueue, call];
                }
                return prevQueue;
              });

              setActiveServiceCalls((prev) => ({
                ...prev,
                [String(call.tableNo)]: { requestType: call.requestType, timestamp: call.timestamp },
              }));
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dedicated poll for service calls
  useEffect(() => {
    let isMounted = true;
    const pollServiceCalls = async () => {
      try {
        const res = await fetch(`/api/r/${slug}/service-call`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const calls: ServiceCallItem[] = data.calls || [];
        if (!isMounted) return;

        if (calls.length > 0) {
          calls.forEach((call) => {
            const callKey = `${call.tableNo}_${call.timestamp}`;
            if (!dismissedCallKeysRef.current.has(callKey)) {
              setServiceCallQueue((prevQueue) => {
                const alreadyExists = prevQueue.some(
                  (q) => q.tableNo === call.tableNo && Math.abs(q.timestamp - call.timestamp) < 5000
                );
                if (!alreadyExists) {
                  const mode = serviceCallAlertModeRef.current;
                  if (mode === 'BOTH') {
                    playServiceCallChime();
                    setTimeout(() => {
                      speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                    }, 650);
                  } else if (mode === 'VOICE_ONLY') {
                    speakServiceCall(call.tableNo, call.requestType, call.note, 1.15);
                  } else if (mode === 'CHIME_ONLY') {
                    playServiceCallChime();
                  }
                  setIsServiceCallModalOpen(true);
                  return [...prevQueue, call];
                }
                return prevQueue;
              });

              setActiveServiceCalls((prev) => ({
                ...prev,
                [String(call.tableNo)]: { requestType: call.requestType, timestamp: call.timestamp },
              }));
            }
          });
        }
      } catch (e) {}
    };

    const intervalId = setInterval(pollServiceCalls, 12000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [slug]);

  // Realtime subscription
  useEffect(() => {
    fetchData();

    const unsubscribe = subscribeRealtime(slug, (payload) => {
      try {
        if (payload.type === 'BANK_NOTIFY_RECEIVED') {
          const d = payload.data;
          addBankAlert(d);

          if (d.action === 'AUTO_PAID') {
            playSuccessChime();
            if (voiceEnabled) {
              speakMoneyReceived(d.amount, d.tableName || (d.tableNo ? `โต๊ะ ${d.tableNo}` : ''));
            }
            showSuccess(
              `💰 รับเงิน ฿${d.amount?.toLocaleString()} จาก ${d.bankName || d.bank}`,
              `ปิดบิลและเคลียร์ ${d.tableName || `โต๊ะ ${d.tableNo}`} สำเร็จแล้ว 🎉`
            );
            fetchData();
          } else if (d.action === 'MANUAL_CONFIRM') {
            playOrderChime();
            if (voiceEnabled) {
              const rawTable = d.tableName || (d.tableNo ? `โต๊ะ ${d.tableNo}` : '');
              const target = rawTable ? (rawTable.startsWith('โต๊ะ') ? ` ${rawTable}` : ` โต๊ะ ${rawTable}`) : '';
              speakThaiVoice(`เงินเข้า ${d.amount} บาท${target} ค่ะ กรุณากดยืนยันปิดบิลค่ะ`.replace(/\s+/g, ' ').trim());
            }
            showInfo(
              `🔔 เงินเข้า ฿${d.amount?.toLocaleString()} (${d.bankName || d.bank})`,
              `ตรงกับ ${d.tableName || `โต๊ะ ${d.tableNo}`} กรุณากดยืนยันปิดบิล`
            );
          } else if (d.action === 'AMBIGUOUS_CHOICE') {
            playOrderChime();
            if (voiceEnabled) {
              speakThaiVoice(`มีเงินเข้า ${d.amount} บาท กรุณาเลือกโต๊ะค่ะ`);
            }
            showInfo(
              `🔔 เงินเข้า ฿${d.amount?.toLocaleString()} (${d.bankName || d.bank})`,
              `มียอดตรงกับ ${d.candidates?.length} โต๊ะ กรุณาเลือกโต๊ะที่ต้องการตัดยอด`
            );
          } else if (d.action === 'UNMATCHED') {
            playOrderChime();
            if (voiceEnabled) {
              speakThaiVoice(`มีเงินเข้า ${d.amount} บาท ไม่พบโต๊ะที่ตรงกันค่ะ`);
            }
            showInfo(
              `🔔 เงินเข้า ฿${d.amount?.toLocaleString()} (${d.bankName || d.bank})`,
              'ไม่พบโต๊ะที่มียอดตรงกันในขณะนี้'
            );
          }
        } else if (payload.type === 'SLIP_SUBMITTED') {
          const d = payload.data;
          playOrderChime();
          if (voiceEnabled) {
            speakSlipSubmitted(d?.tableNo, d?.amount);
          }
          addBankAlert({
            action: 'CUSTOMER_NOTIFY',
            channel: 'SLIP',
            tableId: d?.tableId || d?.tableNo,
            tableNo: d?.tableNo,
            tableName: d?.tableName || `โต๊ะ ${d?.tableNo}`,
            amount: d?.amount,
            orderIds: d?.orderIds || (d?.orderId ? [d?.orderId] : []),
            memberPhone: d?.memberPhone,
            customerName: d?.customerName,
            slipUrl: d?.slipUrl,
            timestamp: Date.now(),
          });
          showInfo(`📷 โต๊ะ ${d?.tableNo || ''} ส่งสลิปโอนเงินเข้ามา!`, 'กรุณาตรวจสอบสลิปและกดยืนยันปิดบิล');
          fetchData();
        } else if (payload.type === 'CUSTOMER_PAYMENT_NOTIFIED') {
          const d = payload.data;
          playOrderChime();
          if (voiceEnabled) {
            speakCustomerNotifyTransfer(d.tableNo, d.amount);
          }
          addBankAlert({
            action: 'CUSTOMER_NOTIFY',
            channel: 'WEB',
            tableId: d.tableId,
            tableNo: d.tableNo,
            tableName: d.tableName || `โต๊ะ ${d.tableNo}`,
            amount: d.amount,
            orderIds: d.orderIds || [],
            memberPhone: d.memberPhone,
            customerName: d.customerName,
            timestamp: d.timestamp || Date.now(),
          });
          showInfo(
            `🔔 ${d.tableName || `โต๊ะ ${d.tableNo}`} แจ้งโอนเงิน ฿${d.amount?.toLocaleString()} ผ่านเว็บ`,
            'กรุณาตรวจสอบยอดเงินและกดยืนยันปิดบิล'
          );
          fetchData();
        } else if (payload.type === 'PAYMENT_RECEIVED') {
          playSuccessChime();
          if (voiceEnabled && payload.data) {
            const orderData = payload.data;
            const tableText = orderData.tableNo ? `โต๊ะ ${orderData.tableNo}` : (orderData.tableName || '');
            const amt = orderData.netAmount || orderData.totalAmount || orderData.slipAmount;
            if (amt) {
              speakMoneyReceived(amt, tableText);
            }
          }
          fetchData();
        } else if (payload.type === 'SERVICE_CALLED') {
          const d = payload.data;
          const mode = serviceCallAlertModeRef.current;
          if (mode === 'BOTH') {
            playServiceCallChime();
            setTimeout(() => {
              speakServiceCall(d.tableNo, d.requestType, d.note, 1.15);
            }, 650);
          } else if (mode === 'VOICE_ONLY') {
            speakServiceCall(d.tableNo, d.requestType, d.note, 1.15);
          } else if (mode === 'CHIME_ONLY') {
            playServiceCallChime();
          }
          showInfo(`🔔 ${d.tableName || `โต๊ะ ${d.tableNo}`} เรียกพนักงาน!`, `${d.requestType} ${d.note ? `(${d.note})` : ''}`);
          addServiceCall({
            id: d.id,
            tableNo: Number(d.tableNo) || 1,
            tableName: d.tableName || (d.tableNo ? `โต๊ะ ${d.tableNo}` : 'โต๊ะอาหาร'),
            requestType: d.requestType || 'เรียกพนักงาน',
            note: d.note || '',
            timestamp: d.timestamp || Date.now(),
          });
        } else if (
          payload.type === 'ORDER_CREATED' ||
          payload.type === 'ORDER_UPDATED' ||
          payload.type === 'TABLE_UPDATED'
        ) {
          fetchData();
        }
      } catch (e) {}
    });

    const pollInterval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [slug]);

  // Filter Tables
  const filteredTables = useMemo(() => {
    if (statusFilter === 'ALL') return tables;
    return tables.filter((t) => t.status === statusFilter);
  }, [tables, statusFilter]);

  const totalOccupied = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING').length;
  const totalAvailable = tables.filter((t) => t.status === 'AVAILABLE').length;

  const handleOpenDeliveryModal = (channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD' = 'LINEMAN') => {
    setOrderChannel(channel);
    setSelectedTable(null);
    const prefix = channel === 'LINEMAN' ? 'LM' : channel === 'GRAB' ? 'GF' : channel === 'SHOPEE_FOOD' ? 'SF' : 'RB';
    setDeliveryOrderId(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRiderName('');
    setRiderPhone('');
    setIsCashierOrderOpen(true);
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: string) => {
    // 1. Play immediate audio feedback and toast (0ms latency)
    if (newStatus === 'COMPLETED') {
      playSuccessChime();
      showSuccess('ไรเดอร์รับอาหารแล้ว 🛵✨', 'เคลียร์ออเดอร์และบันทึกยอดขายเรียบร้อย');
    } else if (newStatus === 'SERVED') {
      playSuccessChime();
      showSuccess('เสิร์ฟอาหารแล้ว ✨', 'ออเดอร์เดลิเวอรีเสร็จสมบูรณ์');
    } else if (newStatus === 'READY') {
      playSuccessChime();
      showSuccess('ปรุงเสร็จแล้ว 🔔', 'พร้อมส่งมอบให้ไรเดอร์');
    } else if (newStatus === 'COOKING') {
      playButtonTapSound('pop');
      showInfo('เริ่มปรุงออเดอร์แล้ว 🍳');
    } else {
      playButtonTapSound('tap');
      showInfo('อัปเดตสถานะเรียบร้อย');
    }

    // 2. Optimistic local state update (0ms immediate feedback)
    const prevDeliveries = [...deliveryOrders];
    if (newStatus === 'COMPLETED') {
      // Remove immediately from active delivery list!
      setDeliveryOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      // Update status immediately!
      setDeliveryOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }

    // 3. Background asynchronous network sync
    try {
      const res = await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Rollback on server error
        setDeliveryOrders(prevDeliveries);
        showError('ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (err) {
      setDeliveryOrders(prevDeliveries);
      showError('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleClearAllDeliveries = async () => {
    if (deliveryOrders.length === 0) return;
    const prevDeliveries = [...deliveryOrders];
    const clearedCount = deliveryOrders.length;

    // 1. Play sound & toast immediately (0ms)
    playSuccessChime();
    showSuccess('ไรเดอร์รับครบทุกออเดอร์แล้ว 🛵✨', `เคลียร์ ${clearedCount} ออเดอร์และบันทึกยอดขายเรียบร้อย`);

    // 2. Optimistic local state clearance (0ms)
    setDeliveryOrders([]);

    // 3. Background asynchronous network sync
    try {
      await Promise.all(
        prevDeliveries.map((o) =>
          fetch(`/api/r/${slug}/orders/${o.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'COMPLETED' }),
          })
        )
      );
    } catch (err) {
      setDeliveryOrders(prevDeliveries);
      showError('ไม่สามารถเคลียร์ออเดอร์ได้');
    }
  };

  const handleOpenCheckoutForTable = (table: any) => {
    setSelectedTable(table);
    setIsPayModalOpen(true);
  };

  const handlePrintBillForTable = (table: any) => {
    const orders = table.activeOrders || [];
    const total = orders.reduce((sum: number, o: any) => sum + (o.netAmount ?? o.totalAmount ?? 0), 0);
    const existingPhone = orders.find((o: any) => o.memberPhone)?.memberPhone;
    const existingName = orders.find((o: any) => o.customerName)?.customerName;

    setReceiptOrder({
      storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
      promptPayName: store?.promptPayName || '',
      promptPayId: store?.promptPayId || '',
      phone: store?.phone || '',
      address: store?.address || '',
      receiptFooter: store?.receiptFooter || '',
      tableId: table.tableNo || table.id,
      tableName: table.name || `โต๊ะ ${table.tableNo || table.id}`,
      orders: orders,
      items: orders.flatMap((o: any) => o.items || []),
      totalAmount: total,
      discountAmount: 0,
      netAmount: total,
      paymentMethod: 'PENDING',
      isPreCheck: true,
      customerName: existingName && !/^\d{9,10}$/.test(existingName.replace(/\D/g, '')) ? existingName : '',
      memberPhone: existingPhone || (existingName && /^\d{9,10}$/.test(existingName.replace(/\D/g, '')) ? existingName : ''),
      pointsEarned: existingPhone ? Math.floor(total / (store?.pointsRate || 25)) : 0,
      orderId: orders[0]?.id || `BILL-${table.tableNo || table.id}-${Date.now().toString().slice(-4)}`,
      paidAt: new Date().toISOString(),
      autoPrint: true,
    });
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-3.5 sm:space-y-6">
      {/* 🔊 Browser Audio Autoplay Unlock Banner */}
      {!isAudioUnlocked && voiceEnabled && (
        <div
          className={`rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-md shadow-orange-500/20 transition-all ${
            isSplitView ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'
          }`}
        >
          <div
            onClick={() => {
              setIsAudioUnlocked(true);
              if (typeof window !== 'undefined') {
                localStorage.setItem('pos_audio_unlocked', 'true');
              }
              playSuccessChime();
              speakThaiVoice('ระบบเสียงแจ้งเตือนเงินเข้าพร้อมทำงานแล้วค่ะ');
              showSuccess('🔊 เปิดระบบเสียงแจ้งเตือนสำเร็จ', 'พร้อมรับเสียงพูดแจ้งเตือนเงินเข้าภาษาไทยอัตโนมัติ');
            }}
            className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer hover:brightness-105"
          >
            <div className={`${isSplitView ? 'w-8 h-8 text-base rounded-lg' : 'w-10 h-10 text-xl rounded-xl'} bg-white/20 flex items-center justify-center flex-shrink-0`}>
              🔊
            </div>
            <div className="min-w-0 truncate">
              <h4 className={`${isSplitView ? 'text-xs' : 'text-xs sm:text-sm'} font-black truncate`}>คลิกตรงนี้ 1 ครั้ง เพื่อเปิดระบบเสียงเตือนเงินเข้า</h4>
              {!isSplitView && (
                <p className="text-[11px] sm:text-xs text-white/90 truncate">
                  เบราว์เซอร์ต้องการให้สัมผัสหน้าจอ 1 ครั้ง เพื่อปลดล็อกให้ระบบส่งเสียงพูดภาษาไทยอัตโนมัติเมื่อมีเงินเข้า
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={() => {
                setIsAudioUnlocked(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pos_audio_unlocked', 'true');
                }
                playSuccessChime();
                speakThaiVoice('ระบบเสียงแจ้งเตือนเงินเข้าพร้อมทำงานแล้วค่ะ');
                showSuccess('🔊 เปิดระบบเสียงแจ้งเตือนสำเร็จ', 'พร้อมรับเสียงพูดแจ้งเตือนเงินเข้าภาษาไทยอัตโนมัติ');
              }}
              className={`${isSplitView ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'} rounded-xl bg-white text-orange-700 font-black shadow-sm cursor-pointer hover:bg-orange-50 active:scale-95`}
            >
              เปิดเสียง ⚡
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAudioUnlocked(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pos_audio_unlocked', 'true');
                }
              }}
              className="p-1.5 rounded-lg bg-black/10 hover:bg-black/25 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="ปิดการแจ้งเตือนนี้ (จำค่าไว้)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Table Filters */}
      <div className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full transition-all ${
        isSplitView ? 'p-2.5 sm:p-3 flex flex-col gap-2' : 'p-3.5 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4'
      }`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center space-x-2">
            <h1 className={`font-black text-slate-900 tracking-tight ${isSplitView ? 'text-base' : 'text-lg sm:text-2xl'}`}>
              ผังโต๊ะ &amp; POS
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-orange-100 text-orange-700">
              {tables.length} โต๊ะ
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • กำลังทาน{' '}
            <span className="text-orange-600 font-bold">{totalOccupied}</span> • ว่าง{' '}
            <span className="text-emerald-600 font-bold">{totalAvailable}</span>
          </div>
        </div>

        {/* Filter Pills & Action Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'OCCUPIED', label: `กำลังทาน (${totalOccupied})`, activeClass: 'bg-orange-500 text-white shadow-sm' },
              { id: 'AVAILABLE', label: `ว่าง (${totalAvailable})`, activeClass: 'bg-emerald-500 text-white shadow-sm' },
              { id: 'DELIVERY', label: `🛵 เดลิเวอรี (${deliveryOrders.length})`, activeClass: 'bg-emerald-700 text-white shadow-sm font-black' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                data-sound="tap"
                className={`min-h-[38px] sm:min-h-[34px] lg:min-h-[32px] py-1.5 sm:py-1 px-3 sm:px-2.5 rounded-xl text-xs sm:text-[11px] font-black transition-all duration-75 active:scale-95 active:translate-y-0.5 whitespace-nowrap cursor-pointer select-none ${
                  statusFilter === f.id
                    ? f.activeClass || 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <button
              type="button"
              data-sound="pop"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pos_voice_enabled', next ? 'true' : 'false');
                  localStorage.setItem('pos_audio_unlocked', 'true');
                  window.dispatchEvent(new CustomEvent('pos-voice-changed', { detail: { enabled: next } }));
                }
                if (next) {
                  speakThaiVoice('เปิดระบบเสียงอ่านแจ้งเตือนเงินเข้าแล้วค่ะ');
                  showSuccess('🔊 เปิดเสียงอ่านแจ้งเตือนเงินเข้าแล้ว');
                } else {
                  showInfo('🔇 ปิดเสียงอ่านแจ้งเตือนเงินเข้า');
                }
              }}
              className={`min-h-[38px] sm:min-h-[34px] lg:min-h-[32px] px-3 sm:px-2.5 rounded-xl text-xs sm:text-[11px] font-extrabold border flex items-center justify-center space-x-1.5 transition-all duration-75 whitespace-nowrap flex-shrink-0 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ${
                voiceEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
              title={voiceEnabled ? 'คลิกเพื่อปิดเสียงพูดเงินเข้า' : 'คลิกเพื่อเปิดเสียงพูดเงินเข้า'}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className={isSplitView ? 'hidden' : 'hidden sm:inline'}>{voiceEnabled ? 'เสียงเงินเข้า' : 'ปิดเสียง'}</span>
            </button>

            <button
              onClick={() => handleOpenDeliveryModal('LINEMAN')}
              data-sound="pop"
              className="min-h-[38px] sm:min-h-[34px] lg:min-h-[32px] px-3 sm:px-2.5 rounded-xl text-xs sm:text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs flex items-center space-x-1.5 transition-all duration-75 whitespace-nowrap flex-shrink-0 cursor-pointer active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300"
              title="รับออเดอร์เดลิเวอรี"
            >
              <span className="text-xs">🛵</span>
              <span>เดลิเวอรี</span>
            </button>

            <button
              onClick={() => setIsAddTableModalOpen(true)}
              data-sound="pop"
              className="min-h-[38px] sm:min-h-[34px] lg:min-h-[32px] px-3 sm:px-2.5 rounded-xl text-xs sm:text-[11px] font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:from-orange-700 active:to-amber-700 text-white shadow-2xs flex items-center space-x-1.5 transition-all duration-75 whitespace-nowrap flex-shrink-0 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ring-0 active:ring-2 active:ring-orange-300"
              title="เพิ่มโต๊ะใหม่"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>เพิ่มโต๊ะ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Hub View (when Delivery filter is active) */}
      {statusFilter === 'DELIVERY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🛵 รายการออเดอร์เดลิเวอรีที่กำลังดำเนินการ</span>
              <span className="text-xs font-bold text-slate-500">({deliveryOrders.length} ออเดอร์)</span>
            </h2>
            <div className="flex items-center gap-2">
              {deliveryOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDeliveries}
                  data-sound="pop"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 active:bg-emerald-100 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all duration-75 cursor-pointer active:scale-90 active:translate-y-0.5 select-none flex items-center space-x-1"
                >
                  <span>🧹 เคลียร์ทั้งหมด ({deliveryOrders.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenDeliveryModal('LINEMAN')}
                data-sound="pop"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 active:bg-emerald-800 shadow-sm whitespace-nowrap flex-shrink-0 transition-all duration-75 cursor-pointer active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300"
              >
                + คีย์ออเดอร์ LINE MAN / Grab
              </button>
            </div>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                🛵
              </div>
              <h3 className="text-base font-black text-slate-900">ไม่มีออเดอร์เดลิเวอรีค้างอยู่ 🎉</h3>
              <p className="text-xs text-slate-400">
                เมื่อมีออเดอร์เข้ามาจาก LINE MAN, GrabFood หรือคีย์หน้าร้าน จะแสดงที่นี่ทันที
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveryOrders.map((order) => {
                const isLineman = order.orderChannel === 'LINEMAN';
                const isGrab = order.orderChannel === 'GRAB';
                const isShopee = order.orderChannel === 'SHOPEE_FOOD';
                const isPending = order.status === 'PENDING';
                const isCooking = order.status === 'COOKING';
                const isReady = order.status === 'READY';
                const isServed = order.status === 'SERVED';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Card Header: 2-tier structured layout */}
                    <div
                      className={`p-3.5 sm:p-4 text-white ${
                        isLineman
                          ? 'bg-[#06C755]'
                          : isGrab
                          ? 'bg-[#00B14F]'
                          : isShopee
                          ? 'bg-[#EE4D2D]'
                          : 'bg-slate-800'
                      }`}
                    >
                      {/* Row 1: Brand badge + Time */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-xs font-black text-xs tracking-wide">
                          <span className="text-sm">🛵</span>
                          <span>{isLineman ? 'LINE MAN' : isGrab ? 'GrabFood' : isShopee ? 'ShopeeFood' : 'เดลิเวอรี'}</span>
                        </div>
                        <span className="text-[11px] font-bold text-white/90 bg-black/15 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <span>🕒</span>
                          <span>{formatTime(order.createdAt)} น.</span>
                        </span>
                      </div>

                      {/* Row 2: Order ID + Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-2xs">
                          #{order.deliveryOrderId || order.id.slice(-4)}
                        </span>
                        <div>
                          {isServed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-white/25 text-white border border-white/30 shadow-2xs backdrop-blur-xs">
                              <span>✨</span>
                              <span>เสิร์ฟแล้ว</span>
                            </span>
                          ) : isReady ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'COMPLETED')}
                              data-sound="success"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-300 hover:bg-amber-400 active:bg-amber-500 text-amber-950 shadow-xs cursor-pointer active:scale-90 transition-all duration-75"
                              title="คลิกเพื่อเคลียร์ออเดอร์เมื่อไรเดอร์รับอาหารแล้ว"
                            >
                              <span>🔔</span>
                              <span>พร้อมส่ง</span>
                            </button>
                          ) : isCooking ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'READY')}
                              data-sound="success"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 shadow-xs cursor-pointer active:scale-90 transition-all duration-75"
                              title="คลิกเพื่อเปลี่ยนสถานะเป็นพร้อมส่ง"
                            >
                              <span>🍳</span>
                              <span>กำลังปรุง</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                              data-sound="pop"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-white/20 hover:bg-white/30 active:bg-white/40 text-white cursor-pointer active:scale-90 transition-all duration-75"
                              title="คลิกเพื่อเริ่มปรุง"
                            >
                              <span>⏳</span>
                              <span>รอครัวทำ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Content & Items */}
                    <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {order.riderName && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between gap-1">
                            <span className="font-bold truncate flex items-center gap-1.5">
                              <span>👤</span>
                              <span className="truncate">{order.riderName}</span>
                            </span>
                            {order.riderPhone && (
                              <a href={`tel:${order.riderPhone}`} className="text-emerald-600 font-bold hover:underline shrink-0 text-[10px]">
                                📞 {order.riderPhone}
                              </a>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5 divide-y divide-slate-100">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="pt-1.5 first:pt-0 flex items-start justify-between text-xs gap-2">
                              <div className="flex items-start gap-1.5 min-w-0">
                                <span className="font-black text-slate-400 text-[11px] shrink-0 mt-0.5">
                                  {item.quantity}x
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 leading-snug break-words">
                                    {item.name}
                                  </p>
                                  {item.specialNote && (
                                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5">💬 {item.specialNote}</p>
                                  )}
                                </div>
                              </div>
                              <span className="text-slate-700 font-bold shrink-0 ml-1">
                                ฿{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing Summary */}
                      <div className="pt-2 mt-2 border-t border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>ยอดรวมออเดอร์ (Gross):</span>
                          <span className="font-bold text-slate-700">฿{order.totalAmount}</span>
                        </div>
                        {order.gpPercent > 0 && (
                          <div className="flex justify-between text-rose-600 text-[11px]">
                            <span>หัก GP {order.gpPercent}%:</span>
                            <span>-฿{order.gpAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100">
                          <span className="font-bold text-slate-700 text-xs">รายได้สุทธิ (Net):</span>
                          <span className="text-emerald-600 text-base font-black">฿{order.netRevenue || order.netAmount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Bottom */}
                    <div className="p-3 bg-slate-50/90 border-t border-slate-100 space-y-2">
                      {/* Secondary status buttons if not yet served/ready */}
                      {(isPending || isCooking) && (
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                              data-sound="pop"
                              className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs transition-all duration-75 cursor-pointer shadow-xs active:scale-90 active:translate-y-0.5 select-none"
                            >
                              🍳 เริ่มปรุง
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'READY')}
                            data-sound="success"
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs transition-all duration-75 cursor-pointer shadow-xs active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300"
                          >
                            🔔 ปรุงเสร็จแล้ว
                          </button>
                        </div>
                      )}

                      {/* Main Prominent Handover Button */}
                      <button
                        type="button"
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'COMPLETED')}
                        data-sound="success"
                        className="w-full h-11 px-3 rounded-2xl bg-slate-900 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-75 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ring-0 active:ring-2 active:ring-emerald-400 group"
                      >
                        <span className="text-sm group-hover:scale-110 transition-transform">🛵</span>
                        <span>ไรเดอร์รับอาหารแล้ว (เคลียร์ออเดอร์)</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tables Grid */}
      {statusFilter !== 'DELIVERY' && (
        <div className={`grid gap-2.5 sm:gap-3.5 lg:gap-4 auto-rows-fr w-full ${isSplitView ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
          {filteredTables.map((table) => {
            const isOccupied = table.status === 'OCCUPIED' || table.activeOrdersCount > 0;
            const isSelected = selectedTable?.id === table.id || selectedTable?.tableNo === table.tableNo;

            return (
              <div
                key={table.tableNo || table.id}
                onClick={() => setSelectedTable(table)}
                data-sound="tap"
                className={`relative ${isSplitView ? 'p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl' : 'p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl'} border cursor-pointer transition-all duration-75 active:scale-[0.98] select-none flex flex-col justify-between group w-full min-h-[90px] ${isSplitView ? 'sm:min-h-[120px]' : 'sm:min-h-[140px]'} ${
                  isSelected
                    ? 'ring-4 ring-orange-500/30 border-orange-500 shadow-xl bg-white scale-[1.01]'
                    : isOccupied
                    ? 'bg-gradient-to-br from-white to-orange-50/40 border-orange-200/90 shadow-sm hover:shadow-md hover:border-orange-400'
                    : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-lg flex-shrink-0 ${
                      isOccupied ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {table.tableNo || table.id}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-base sm:text-lg font-black text-slate-900 block truncate">{table.name}</span>
                        {table.hasPendingSlip && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse flex-shrink-0">
                            <Camera className="w-2.5 h-2.5" />
                            <span>สลิปเข้า 📷</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOccupied ? 'bg-orange-500 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className={`text-[11px] sm:text-xs font-bold truncate ${isOccupied ? 'text-orange-700' : 'text-emerald-600'}`}>
                          {isOccupied ? `${table.totalItems || 0} รายการ` : 'โต๊ะว่าง'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:hidden flex-shrink-0">
                    {isOccupied ? (
                      <button
                        type="button"
                        data-sound="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCheckoutForTable(table);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] shadow-sm transition-all duration-75 active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300 flex items-center space-x-1 ${
                          table.hasPendingSlip
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 ring-2 ring-amber-400/50 animate-pulse'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20'
                        }`}
                      >
                        {table.hasPendingSlip ? (
                          <>
                            <Camera className="w-3 h-3 flex-shrink-0" />
                            <span>ตรวจสลิป</span>
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3 flex-shrink-0" />
                            <span>เช็คบิล</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1">
                        <span>สั่งอาหาร</span>
                        <span>→</span>
                      </span>
                    )}
                  </div>
                </div>

                {activeServiceCalls[String(table.tableNo || table.id)] && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const key = String(table.tableNo || table.id);
                      setActiveServiceCalls((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      });
                      showSuccess('รับทราบคำขอแล้ว 👍', `โต๊ะ ${table.tableNo || table.id}`);
                    }}
                    data-sound="pop"
                    className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 text-xs font-bold flex items-center justify-between gap-1 animate-pulse hover:bg-amber-500/25 active:bg-amber-500/35 transition-all duration-75 active:scale-95 select-none w-full cursor-pointer shadow-xs"
                    title="คลิกเพื่อกดรับทราบและปิดการแจ้งเตือน"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <BellRing className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-bounce" />
                      <span className="truncate">เรียก: {activeServiceCalls[String(table.tableNo || table.id)].requestType}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-white font-black flex-shrink-0 hover:bg-amber-600 shadow-xs">
                      รับทราบ ✓
                    </span>
                  </div>
                )}

                <div className={`hidden sm:flex items-center justify-between gap-1.5 ${isSplitView ? 'pt-2 mt-2' : 'pt-3 mt-3'} border-t border-slate-100 w-full`}>
                  {isOccupied ? (
                    <>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">ยอดรอชำระ</span>
                        <span className={`${isSplitView ? 'text-sm sm:text-base' : 'text-base lg:text-lg'} font-black text-slate-900 leading-tight truncate`}>
                          ฿{(table.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-sound="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCheckoutForTable(table);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-xs shadow-sm transition-all duration-75 hover:scale-[1.02] active:scale-90 active:translate-y-0.5 select-none ring-0 active:ring-2 active:ring-emerald-300 flex items-center space-x-1 flex-shrink-0 cursor-pointer ${
                          table.hasPendingSlip
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25 ring-2 ring-amber-400/50 animate-pulse'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20'
                        }`}
                      >
                        {table.hasPendingSlip ? (
                          <>
                            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span>ตรวจสลิป</span>
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span>เช็คบิล</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-slate-400 text-xs font-bold">
                      <span>พร้อมให้บริการ</span>
                      <span className="text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px] sm:text-xs font-black">
                        <span>สั่งอาหาร</span>
                        <span>→</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Table Drawer */}
      {selectedTable && (
        <div className={`z-40 bg-slate-900 text-white shadow-2xl border-t border-slate-800 backdrop-blur-xl bg-opacity-95 ${
          isSplitView ? 'sticky bottom-0 inset-x-0 p-2.5 sm:p-3' : 'fixed inset-x-0 bottom-16 md:bottom-0 p-3.5 sm:p-5'
        }`}>
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-orange-500/30 flex-shrink-0">
                {selectedTable.tableNo || selectedTable.id}
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center space-x-1.5 truncate">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">{selectedTable.name}</h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800 text-orange-400 border border-slate-700 flex-shrink-0">
                    {selectedTable.status === 'OCCUPIED' ? 'กำลังทาน' : 'โต๊ะว่าง'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {selectedTable.activeOrdersCount > 0
                    ? `${selectedTable.totalItems} รายการ • รวม ฿${(selectedTable.totalAmount || 0).toLocaleString()}`
                    : 'ยังไม่มีออเดอร์'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsCashierOrderOpen(true)}
                data-sound="pop"
                className="min-h-[40px] sm:min-h-[36px] px-3.5 sm:px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs shadow-sm flex items-center space-x-1.5 transition-all duration-75 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ring-0 active:ring-2 active:ring-orange-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ สั่งอาหาร</span>
              </button>

              {selectedTable.activeOrdersCount > 0 && (
                <>
                  <button
                    onClick={() => setIsMoveModalOpen(true)}
                    data-sound="pop"
                    className="min-h-[40px] sm:min-h-[36px] px-3 sm:px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-bold text-xs border border-slate-700 flex items-center space-x-1 transition-all duration-75 active:scale-90 active:translate-y-0.5 cursor-pointer select-none"
                    title="ย้ายโต๊ะ"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้าย</span>
                  </button>

                  <button
                    onClick={() => handlePrintBillForTable(selectedTable)}
                    data-sound="pop"
                    className="min-h-[40px] sm:min-h-[36px] px-3 sm:px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-amber-300 hover:text-amber-200 font-bold text-xs border border-amber-500/40 hover:border-amber-500/70 flex items-center space-x-1 transition-all duration-75 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ring-0 active:ring-2 active:ring-amber-400"
                    title="พิมพ์ใบแจ้งค่าอาหาร / ใบเช็คบิล"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์บิล</span>
                  </button>

                  <button
                    onClick={() => handleOpenCheckoutForTable(selectedTable)}
                    data-sound="success"
                    className={`min-h-[40px] sm:min-h-[36px] px-4 sm:px-3.5 py-2 rounded-xl font-black text-xs shadow-md flex items-center space-x-1.5 transition-all duration-75 active:scale-90 active:translate-y-0.5 cursor-pointer select-none ring-0 active:ring-2 active:ring-emerald-300 ${
                      selectedTable.hasPendingSlip
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-400/50 animate-pulse'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {selectedTable.hasPendingSlip ? (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>ตรวจสลิป ฿{(selectedTable.totalAmount || 0).toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="w-3.5 h-3.5" />
                        <span>เช็คบิล ฿{(selectedTable.totalAmount || 0).toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedTable(null)}
                data-sound="pop"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-400 hover:text-white transition-all duration-75 active:scale-90 cursor-pointer select-none"
                title="ปิดแถบโต๊ะ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Deep Sub-modules */}
      <CashierOrderModal
        isOpen={isCashierOrderOpen}
        onClose={() => setIsCashierOrderOpen(false)}
        selectedTable={selectedTable}
        categories={categories}
        store={store}
        slug={slug}
        orderChannel={orderChannel}
        setOrderChannel={setOrderChannel}
        deliveryOrderId={deliveryOrderId}
        setDeliveryOrderId={setDeliveryOrderId}
        riderName={riderName}
        setRiderName={setRiderName}
        riderPhone={riderPhone}
        setRiderPhone={setRiderPhone}
        onOrderSuccess={() => {
          setIsCashierOrderOpen(false);
          setDeliveryOrderId('');
          setRiderName('');
          setRiderPhone('');
          setOrderChannel('DINE_IN');
          fetchData();
        }}
      />

      <TableActionModals
        isMoveModalOpen={isMoveModalOpen}
        onCloseMove={() => setIsMoveModalOpen(false)}
        isAddTableModalOpen={isAddTableModalOpen}
        onCloseAdd={() => setIsAddTableModalOpen(false)}
        selectedTable={selectedTable}
        tables={tables}
        slug={slug}
        onSuccess={() => fetchData()}
      />

      <ServiceCallModal
        isOpen={isServiceCallModalOpen}
        onClose={() => setIsServiceCallModalOpen(false)}
        onOpen={() => setIsServiceCallModalOpen(true)}
        serviceCallQueue={serviceCallQueue}
        activeServiceCallIndex={activeServiceCallIndex}
        setActiveServiceCallIndex={setActiveServiceCallIndex}
        dismissServiceCall={dismissServiceCall}
        dismissAllServiceCalls={dismissAllServiceCalls}
        tables={tables}
        onOpenCheckoutForTable={handleOpenCheckoutForTable}
        serviceCallAlertMode={serviceCallAlertMode}
        updateServiceCallAlertMode={updateServiceCallAlertMode}
      />

      <BankAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onOpen={() => setIsAlertModalOpen(true)}
        bankAlertQueue={bankAlertQueue}
        activeAlertId={activeAlertId}
        setActiveAlertId={setActiveAlertId}
        dismissCurrentAlert={dismissCurrentAlert}
        resolveAlertAndNext={resolveAlertAndNext}
        tables={tables}
        store={store}
        slug={slug}
        voiceEnabled={voiceEnabled}
        setReceiptOrder={setReceiptOrder}
        setIsReceiptModalOpen={setIsReceiptModalOpen}
        fetchData={fetchData}
      />

      <CheckoutModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        selectedTable={selectedTable}
        store={store}
        slug={slug}
        voiceEnabled={voiceEnabled}
        onPaidSuccess={() => {
          setSelectedTable(null);
          fetchData();
        }}
        onPrintReceipt={(receiptData) => {
          setReceiptOrder(receiptData);
          setIsReceiptModalOpen(true);
        }}
        onPreCheckPrint={(receiptData) => {
          setReceiptOrder(receiptData);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Receipt Print Modal */}
      {isReceiptModalOpen && receiptOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptOrder(null);
          }}
          order={receiptOrder}
          store={store}
        />
      )}
    </div>
  );
}

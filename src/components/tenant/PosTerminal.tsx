'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ReceiptPrintModal from '@/components/ReceiptPrintModal';
import { QRCodeSVG } from 'qrcode.react';
import {
  LayoutGrid,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRightLeft,
  Merge,
  Trash2,
  Plus,
  Minus,
  X,
  Printer,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Receipt,
  User,
  AlertCircle,
  Filter,
  ExternalLink,
  Award,
  Check,
  Percent,
  Tag,
  Gift,
  Phone,
  Camera,
  UploadCloud,
  ShieldCheck,
  Eye,
  FileCheck,
  CheckCircle,
  Volume2,
  VolumeX,
  MessageSquare,
  Clipboard,
  Mail,
  BellRing,
  Globe,
  Loader2,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime, formatImageUrl } from '@/lib/utils';
import {
  playOrderChime,
  playSuccessChime,
  playDeliveryChime,
  playServiceCallChime,
  speakThaiVoice,
  speakMoneyReceived,
  speakSlipVerified,
  speakSlipReadSuccess,
  speakSlipDuplicate,
  speakSlipAmountMismatch,
  speakSlipReceiverMismatch,
  speakSlipNoQr,
  speakSlipSubmitted,
  speakCustomerNotifyTransfer,
  speakServiceCall,
} from '@/lib/sound';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { scanSlipQrClient } from '@/lib/slip-scanner-client';
import { parseBankNotificationText } from '@/lib/bank-message-parser';
import { useToast } from '@/context/ToastContext';

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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'PAYMENT_PENDING' | 'DELIVERY'>('ALL');

  // Delivery Channels & Hub State
  const [orderChannel, setOrderChannel] = useState<'DINE_IN' | 'TAKEAWAY' | 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD'>('DINE_IN');
  const [deliveryOrderId, setDeliveryOrderId] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);

  // Selected Table Drawer
  const [selectedTable, setSelectedTable] = useState<any>(null);

  // Cashier Add Order Modal
  const [isCashierOrderOpen, setIsCashierOrderOpen] = useState(false);
  const [cashierCart, setCashierCart] = useState<any[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: any[] }>({});
  const [specialNote, setSpecialNote] = useState('');
  const [dishQuantity, setDishQuantity] = useState(1);
  const [searchMenu, setSearchMenu] = useState('');

  // Move / Merge Table Modal
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState<number | ''>('');

  // Payment Checkout Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PROMPTPAY'>('PROMPTPAY');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Enterprise Loyalty & Promo Checkout States
  const [discountTab, setDiscountTab] = useState<'NONE' | 'LOYALTY' | 'PROMO' | 'CUSTOM'>('NONE');
  const [customDiscountType, setCustomDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [memberPhone, setMemberPhone] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [memberData, setMemberData] = useState<any>(null);
  const [memberRewards, setMemberRewards] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isLookingUpMember, setIsLookingUpMember] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Print Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Bank Slip Reader States
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipQrPayload, setSlipQrPayload] = useState<string | null>(null);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const [slipResult, setSlipResult] = useState<any | null>(null);
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState<boolean>(false);
  const [isManualConfirming, setIsManualConfirming] = useState(false);
  const [previewSlipModalOpen, setPreviewSlipModalOpen] = useState(false);
  // Bank Alert Queue & Multi-Table Verification State
  const [bankAlertQueue, setBankAlertQueue] = useState<any[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeServiceCalls, setActiveServiceCalls] = useState<{ [tableKey: string]: { requestType: string; timestamp: number } }>({});

  // Service Call Queue & Pop-up Modal State
  interface ServiceCallItem {
    id: string;
    tableNo: number;
    tableName: string;
    requestType: string;
    note?: string;
    timestamp: number;
  }
  type ServiceCallAlertMode = 'BOTH' | 'VOICE_ONLY' | 'CHIME_ONLY' | 'MUTE';

  const [serviceCallQueue, setServiceCallQueue] = useState<ServiceCallItem[]>([]);
  const [activeServiceCallIndex, setActiveServiceCallIndex] = useState<number>(0);
  const [isServiceCallModalOpen, setIsServiceCallModalOpen] = useState<boolean>(false);

  // Service Call Alert Mode: ทั้งพูด+กริ่ง | เฉพาะพูด | เฉพาะกริ่ง | ปิดเสียง
  const [serviceCallAlertMode, setServiceCallAlertMode] = useState<ServiceCallAlertMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_service_call_alert_mode');
      if (saved === 'BOTH' || saved === 'VOICE_ONLY' || saved === 'CHIME_ONLY' || saved === 'MUTE') {
        return saved;
      }
    }
    return 'BOTH';
  });
  const serviceCallAlertModeRef = React.useRef(serviceCallAlertMode);
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

  // Derive currently active service call from queue
  const currentServiceCall = useMemo(() => {
    if (serviceCallQueue.length === 0) return null;
    return serviceCallQueue[activeServiceCallIndex] || serviceCallQueue[0];
  }, [serviceCallQueue, activeServiceCallIndex]);

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

  const dismissedCallKeysRef = React.useRef<Set<string>>(new Set());

  const dismissServiceCall = (callId: string) => {
    setServiceCallQueue((prev) => {
      const call = prev.find((c) => c.id === callId);
      if (call) {
        dismissedCallKeysRef.current.add(`${call.tableNo}_${call.timestamp}`);
        fetch(`/api/r/${slug}/service-call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'DISMISS', tableNo: call.tableNo }),
        }).catch(() => {});

        const key = String(call.tableNo);
        setActiveServiceCalls((curr) => {
          const copy = { ...curr };
          delete copy[key];
          return copy;
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
  };

  const dismissAllServiceCalls = () => {
    serviceCallQueue.forEach((c) => {
      dismissedCallKeysRef.current.add(`${c.tableNo}_${c.timestamp}`);
    });
    fetch(`/api/r/${slug}/service-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DISMISS_ALL' }),
    }).catch(() => {});

    setActiveServiceCalls({});
    setServiceCallQueue([]);
    setIsServiceCallModalOpen(false);
    setActiveServiceCallIndex(0);
  };

  // Derive currently active alert from queue
  const bankAlertModal = useMemo(() => {
    if (bankAlertQueue.length === 0) return null;
    return bankAlertQueue.find((a) => a.id === activeAlertId) || bankAlertQueue[0];
  }, [bankAlertQueue, activeAlertId]);

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

    // If modal is not currently open, point to this alert and open modal
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
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsAudioUnlocked(true);
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

  // Bank Notification Text Reader States
  const [promptPayVerifyMode, setPromptPayVerifyMode] = useState<'SLIP' | 'TEXT'>('SLIP');
  const [bankNotificationInput, setBankNotificationInput] = useState<string>('');
  const [isProcessingBankText, setIsProcessingBankText] = useState<boolean>(false);

  // Add Table Modal
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const fetchData = async () => {
    try {
      const [tablesRes, menuRes, settingsRes, ordersRes, promoRes] = await Promise.all([
        fetch(`/api/r/${slug}/tables`),
        fetch(`/api/r/${slug}/menu`),
        fetch(`/api/r/${slug}/settings`),
        fetch(`/api/r/${slug}/orders`),
        fetch(`/api/r/${slug}/promotions`),
      ]);
      const [tData, mData, sData, oData, promoData] = await Promise.all([
        tablesRes.json().catch(() => []),
        menuRes.json().catch(() => []),
        settingsRes.json().catch(() => null),
        ordersRes.json().catch(() => []),
        promoRes.json().catch(() => ({ promotions: [] })),
      ]);
      setTables(Array.isArray(tData) ? tData : []);
      setCategories(Array.isArray(mData) ? mData : []);
      setStore(sData?.error ? null : sData);
      if (promoData?.promotions) {
        setAvailablePromotions(promoData.promotions.filter((p: any) => p.isActive));
      }

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

  // Dedicated fast poll for service calls every 3 seconds (serverless resilience)
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

    const intervalId = setInterval(pollServiceCalls, 3000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [slug]);

  useEffect(() => {
    fetchData();

    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource(`/api/r/${slug}/stream`);
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'BANK_NOTIFY_RECEIVED') {
              const d = payload.data;
              // นำรายการเข้าคิวแจ้งเตือนเงินเข้าทันที
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
        };
        eventSource.onerror = () => {
          eventSource?.close();
        };
      }
    } catch (e) {}

    // Periodic polling fallback every 15s to guarantee tables & status are always fresh
    const pollInterval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      clearInterval(pollInterval);
      eventSource?.close();
    };
  }, [slug]);

  // Synchronize Slip Verification States when opening Payment Checkout
  useEffect(() => {
    if (isPayModalOpen && selectedTable) {
      setAutoCheckoutEnabled(store?.slipAutoCheckout ?? false);
      const pendingSlipOrder = selectedTable.activeOrders?.find((o: any) => o.slipUrl);
      if (pendingSlipOrder?.slipUrl) {
        setSlipPreview(pendingSlipOrder.slipUrl);
        if (pendingSlipOrder.slipRawData) {
          try {
            setSlipResult(JSON.parse(pendingSlipOrder.slipRawData));
          } catch (e) {}
        }
      } else {
        setSlipPreview(null);
        setSlipQrPayload(null);
        setSlipResult(null);
      }
    }
  }, [isPayModalOpen, selectedTable, store]);

  const allMenuItems = useMemo(() => {
    const list: any[] = [];
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (Array.isArray(cat?.items)) {
          cat.items.forEach((item: any) => {
            list.push({ ...item, categoryName: cat.name });
          });
        }
      });
    }
    return list;
  }, [categories]);

  const filteredMenuItems = useMemo(() => {
    if (!searchMenu) return allMenuItems;
    return allMenuItems.filter((i) =>
      i.name.toLowerCase().includes(searchMenu.toLowerCase()) ||
      (i.categoryName && i.categoryName.toLowerCase().includes(searchMenu.toLowerCase()))
    );
  }, [allMenuItems, searchMenu]);

  // Filter Tables
  const filteredTables = useMemo(() => {
    if (statusFilter === 'ALL') return tables;
    return tables.filter((t) => t.status === statusFilter);
  }, [tables, statusFilter]);

  // Summary counts
  const totalOccupied = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING').length;
  const totalAvailable = tables.filter((t) => t.status === 'AVAILABLE').length;

  // Handle Cashier Adding item to cart
  const handleOpenItemCustomizer = (item: any) => {
    setSelectedMenuItem(item);
    setSpecialNote('');
    setDishQuantity(1);
    const defaults: { [key: string]: any[] } = {};
    if (item.options) {
      item.options.forEach((group: any) => {
        if (group.isRequired && group.choices?.length > 0) {
          defaults[group.title] = [group.choices[0]];
        } else {
          defaults[group.title] = [];
        }
      });
    }
    setSelectedOptions(defaults);
  };

  const calculateCustomizedPrice = () => {
    if (!selectedMenuItem) return 0;
    let extra = 0;
    Object.values(selectedOptions).forEach((choices) => {
      choices.forEach((c) => {
        extra += c.extraPrice || 0;
      });
    });
    return (selectedMenuItem.basePrice + extra) * dishQuantity;
  };

  const handleAddToCart = () => {
    if (!selectedMenuItem) return;
    const extraPricePerUnit = Object.values(selectedOptions).reduce(
      (sum, choices) => sum + choices.reduce((cSum, c) => cSum + (c.extraPrice || 0), 0),
      0
    );
    const unitPrice = selectedMenuItem.basePrice + extraPricePerUnit;

    const flattenedOptions = Object.entries(selectedOptions).flatMap(([group, choices]) =>
      choices.map((c) => ({
        group,
        choice: c.name,
        extra: c.extraPrice || 0,
        extraPrice: c.extraPrice || 0,
      }))
    );

    const cartItem = {
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: unitPrice,
      quantity: dishQuantity,
      selectedOptions: flattenedOptions,
      specialNote: specialNote.trim() || undefined,
    };

    setCashierCart([...cashierCart, cartItem]);
    setSelectedMenuItem(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCashierCart(cashierCart.filter((_, idx) => idx !== index));
  };

  const handleOpenDeliveryModal = (channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD' = 'LINEMAN') => {
    setOrderChannel(channel);
    setSelectedTable(null);
    setCashierCart([]);
    const prefix = channel === 'LINEMAN' ? 'LM' : channel === 'GRAB' ? 'GF' : channel === 'SHOPEE_FOOD' ? 'SF' : 'RB';
    setDeliveryOrderId(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRiderName('');
    setRiderPhone('');
    setIsCashierOrderOpen(true);
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/r/${slug}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === 'COMPLETED' || newStatus === 'SERVED') {
          showSuccess('ไรเดอร์รับอาหารแล้ว 🛵✨', 'ออเดอร์เดลิเวอรีเสร็จสมบูรณ์');
          playSuccessChime();
        } else if (newStatus === 'READY') {
          showSuccess('ปรุงเสร็จแล้ว 🔔', 'พร้อมส่งมอบให้ไรเดอร์');
          playSuccessChime();
        } else {
          showInfo('อัปเดตสถานะเรียบร้อย');
        }
        fetchData();
      }
    } catch (err) {
      showError('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleSubmitCashierOrder = async () => {
    if (cashierCart.length === 0) return;
    const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel);
    if (!isDelivery && !selectedTable) return;

    try {
      const res = await fetch(`/api/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: isDelivery ? 0 : (selectedTable?.id || selectedTable?.tableNo),
          items: cashierCart,
          orderType: isDelivery ? 'TAKEAWAY' : (orderChannel === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN'),
          orderChannel,
          deliveryOrderId: isDelivery ? deliveryOrderId : null,
          riderName: isDelivery ? riderName : null,
          riderPhone: isDelivery ? riderPhone : null,
        }),
      });
      if (res.ok) {
        if (isDelivery) {
          const chLabel =
            orderChannel === 'LINEMAN'
              ? 'LINE MAN'
              : orderChannel === 'GRAB'
              ? 'GrabFood'
              : orderChannel === 'SHOPEE_FOOD'
              ? 'ShopeeFood'
              : 'Robinhood';
          showSuccess('รับออเดอร์เดลิเวอรีเข้าครัวแล้ว 🛵', `${chLabel} #${deliveryOrderId || 'ใหม่'} • ${cashierCart.length} รายการ`);
          playDeliveryChime();
        } else {
          showSuccess('ส่งรายการอาหารเข้าครัวแล้ว 🍳', `${selectedTable?.name || 'สั่งกลับบ้าน'} • ${cashierCart.length} รายการ`);
          playOrderChime();
        }
        setCashierCart([]);
        setIsCashierOrderOpen(false);
        setDeliveryOrderId('');
        setRiderName('');
        setRiderPhone('');
        setOrderChannel('DINE_IN');
        fetchData();
      } else {
        showError('ไม่สามารถส่งออเดอร์ได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถส่งออเดอร์ได้');
    }
  };

  // Handle Move Table
  const handleMoveTable = async () => {
    if (!selectedTable || !targetTableId) return;
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_TABLE',
          fromTableId: selectedTable.id || selectedTable.tableNo,
          toTableId: targetTableId,
        }),
      });
      if (res.ok) {
        showSuccess('ย้ายโต๊ะสำเร็จ 🪑', `ย้ายจาก ${selectedTable.name} ไป โต๊ะ ${targetTableId} เรียบร้อย`);
        setIsMoveModalOpen(false);
        setTargetTableId('');
        fetchData();
      } else {
        showError('ไม่สามารถย้ายโต๊ะได้', 'โต๊ะปลายทางอาจไม่ว่าง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถย้ายโต๊ะได้');
    }
  };

  // Handle Switching Discount Tabs (1 discount type per bill)
  const handleSwitchDiscountTab = (tab: 'NONE' | 'LOYALTY' | 'PROMO' | 'CUSTOM') => {
    setDiscountTab(tab);
    if (tab === 'NONE') {
      setSelectedReward(null);
      setPointsToRedeem(0);
      setAppliedPromo(null);
      setCustomDiscountValue('');
      setDiscountAmount(0);
    } else if (tab === 'LOYALTY') {
      setAppliedPromo(null);
      setCustomDiscountValue('');
      setDiscountAmount(0);
    } else if (tab === 'PROMO') {
      setSelectedReward(null);
      setPointsToRedeem(0);
      setCustomDiscountValue('');
      setDiscountAmount(0);
    } else if (tab === 'CUSTOM') {
      setSelectedReward(null);
      setPointsToRedeem(0);
      setAppliedPromo(null);
      setDiscountAmount(0);
    }
  };

  // Handle Member Lookup
  const handleLookupMember = async (phone: string) => {
    setMemberPhone(phone);
    setSelectedReward(null);
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 9) {
      setIsLookingUpMember(true);
      try {
        const res = await fetch(`/api/r/${slug}/members?phone=${clean}`);
        const data = await res.json();
        if (data.member) {
          setMemberData(data.member);
          setMemberRewards(data.rewards || []);
          setIsNewCustomer(false);
          if (data.member.name) {
            setCustomerNameInput(data.member.name);
          }
          showInfo(`พบข้อมูลสมาชิก ⭐`, `คุณ ${data.member.name || phone} (แต้มคงเหลือ: ${data.member.points} แต้ม)`);
        } else {
          setMemberData(null);
          setMemberRewards(data.rewards || []);
          setIsNewCustomer(true);
          setCustomerNameInput('');
        }
      } catch (e) {
        setMemberData(null);
        setMemberRewards([]);
        setIsNewCustomer(true);
      } finally {
        setIsLookingUpMember(false);
      }
    } else {
      setMemberData(null);
      setMemberRewards([]);
      setPointsToRedeem(0);
      setSelectedReward(null);
      setIsNewCustomer(false);
      setIsLookingUpMember(false);
    }
  };

  // Handle direct checkout modal opening for a table
  const handleOpenCheckoutForTable = (table: any) => {
    setSelectedTable(table);
    if (table.hasPendingSlip && table.latestSlipUrl) {
      setSlipPreview(table.latestSlipUrl);
      const slipOrder = table.activeOrders?.find((o: any) => o.slipUrl);
      if (slipOrder?.slipRawData) {
        try {
          const parsed = JSON.parse(slipOrder.slipRawData);
          setSlipResult({ parsed, success: true });
        } catch (e) {}
      }
      setPaymentMethod('PROMPTPAY');
    }

    // Pre-fill existing member phone & customer name if any active order on table has it
    const existingPhone = table.activeOrders?.find((o: any) => o.memberPhone)?.memberPhone;
    const existingName = table.activeOrders?.find((o: any) => o.customerName)?.customerName;

    // Check if existingName is actually a phone number (e.g. '0925470359' or 9-10 digits)
    const isNameActuallyPhone = existingName && /^\d{9,10}$/.test(existingName.replace(/\D/g, ''));

    if (existingPhone) {
      handleLookupMember(existingPhone);
      if (existingName && !/^\d{9,10}$/.test(existingName.replace(/\D/g, ''))) {
        setCustomerNameInput(existingName);
      }
    } else if (isNameActuallyPhone) {
      // Auto-detect phone number that was stored in customerName field
      const detectedPhone = existingName.trim();
      setMemberPhone(detectedPhone);
      setCustomerNameInput('');
      handleLookupMember(detectedPhone);
    } else {
      setMemberPhone('');
      setMemberData(null);
      setMemberRewards([]);
      setIsNewCustomer(false);
      setIsLookingUpMember(false);
      if (existingName) {
        setCustomerNameInput(existingName);
      } else {
        setCustomerNameInput('');
      }
    }
    setIsPayModalOpen(true);
  };

  // Handle Promo Code Apply (supports quick chips and input)
  const handleApplyPromo = async (codeOverride?: string) => {
    const code = codeOverride || promoCodeInput;
    if (!code) return;
    try {
      const res = await fetch(`/api/r/${slug}/promotions?code=${code}&amount=${rawTotalAmount}`);
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo(data.promo);
        setPromoCodeInput(code.toUpperCase());
        showSuccess('ใช้คูปองส่วนลดแล้ว 🎉', `รับส่วนลด ฿${data.promo.calculatedDiscount}`);
      } else {
        showError('โค้ดส่วนลดไม่ถูกต้อง', data.error || 'กรุณาตรวจสอบเงื่อนไข');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถตรวจสอบโค้ดได้');
    }
  };

  // Handle Payment Calculations
  const activeOrders = selectedTable?.activeOrders || [];
  const rawTotalAmount = activeOrders.reduce((sum: number, o: any) => sum + o.netAmount, 0);
  
  let calculatedDiscount = 0;
  if (discountTab === 'LOYALTY') {
    if (selectedReward && selectedReward.rewardType === 'DISCOUNT') {
      calculatedDiscount = selectedReward.discountAmount;
    } else if (pointsToRedeem > 0) {
      calculatedDiscount = pointsToRedeem * (store?.pointValue || 1);
    }
  } else if (discountTab === 'PROMO') {
    calculatedDiscount = appliedPromo?.calculatedDiscount || 0;
  } else if (discountTab === 'CUSTOM') {
    const val = parseFloat(customDiscountValue) || 0;
    if (customDiscountType === 'PERCENT') {
      calculatedDiscount = Math.round((rawTotalAmount * Math.min(100, val)) / 100);
    } else {
      calculatedDiscount = Math.min(rawTotalAmount, val);
    }
  }

  const totalCombinedDiscount = Math.min(rawTotalAmount, calculatedDiscount);
  const finalNetAmount = Math.max(0, rawTotalAmount - totalCombinedDiscount);

  const change =
    paymentMethod === 'CASH' && cashReceived
      ? parseFloat(cashReceived) - finalNetAmount
      : 0;

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
    });
    setIsReceiptModalOpen(true);
  };

  const handlePrintBillFromCheckout = () => {
    if (!selectedTable) return;
    setReceiptOrder({
      storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
      promptPayName: store?.promptPayName || '',
      promptPayId: store?.promptPayId || '',
      phone: store?.phone || '',
      address: store?.address || '',
      receiptFooter: store?.receiptFooter || '',
      tableId: selectedTable.tableNo || selectedTable.id,
      tableName: selectedTable.name,
      orders: activeOrders,
      items: activeOrders.flatMap((o: any) => o.items || []),
      totalAmount: rawTotalAmount,
      discountAmount: totalCombinedDiscount,
      netAmount: finalNetAmount,
      paymentMethod: paymentMethod,
      cashReceived: paymentMethod === 'CASH' && cashReceived ? parseFloat(cashReceived) || null : null,
      changeAmount: paymentMethod === 'CASH' ? Math.max(0, change) : 0,
      isPreCheck: true,
      customerName: customerNameInput.trim() || memberData?.name || '',
      memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : '',
      memberPoints: memberData?.points,
      pointsEarned: memberPhone ? Math.floor(finalNetAmount / (store?.pointsRate || 25)) : 0,
      orderId: activeOrders[0]?.id || `BILL-${selectedTable.tableNo || selectedTable.id}-${Date.now().toString().slice(-4)}`,
      paidAt: new Date().toISOString(),
    });
    setIsReceiptModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedTable || activeOrders.length === 0) return;
    setIsProcessingPay(true);
    try {
      let remainingDiscount = totalCombinedDiscount;
      for (let i = 0; i < activeOrders.length; i++) {
        const order = activeOrders[i];
        const isFirst = i === 0;
        const currentOrderAmount = order.netAmount ?? order.totalAmount ?? 0;
        const orderDiscount = Math.min(currentOrderAmount, remainingDiscount);
        remainingDiscount -= orderDiscount;

        await fetch(`/api/r/${slug}/orders/${order.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod,
            cashReceived: paymentMethod === 'CASH' && isFirst ? parseFloat(cashReceived) : null,
            changeAmount: paymentMethod === 'CASH' && isFirst ? Math.max(0, change) : 0,
            memberPhone: memberPhone || null,
            customerName: customerNameInput.trim() || undefined,
            pointsRedeemed: isFirst && discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
            promoCode: isFirst && discountTab === 'PROMO' ? appliedPromo?.code || null : null,
            discountAmount: orderDiscount,
            skipVisitIncrement: !isFirst,
          }),
        });
      }

      playSuccessChime();
      if (voiceEnabled) {
        speakMoneyReceived(finalNetAmount, selectedTable.name);
      }
      showSuccess('ชำระเงินสำเร็จ 💰', `${selectedTable.name} • ยอดรับเงิน ฿${finalNetAmount}`);

      setReceiptOrder({
        storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
        promptPayName: store?.promptPayName || '',
        promptPayId: store?.promptPayId || '',
        phone: store?.phone || '',
        address: store?.address || '',
        receiptFooter: store?.receiptFooter || '',
        tableId: selectedTable.id || selectedTable.tableNo,
        tableName: selectedTable.name,
        orders: activeOrders,
        items: activeOrders.flatMap((o: any) => o.items || []),
        totalAmount: rawTotalAmount,
        discountAmount: totalCombinedDiscount,
        netAmount: finalNetAmount,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : null,
        changeAmount: paymentMethod === 'CASH' ? Math.max(0, change) : 0,
        paidAt: new Date().toISOString(),
        customerName: customerNameInput.trim() || memberData?.name || '',
        memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : '',
        memberPoints: memberData?.points,
        pointsEarned: memberPhone ? Math.floor(finalNetAmount / (store?.pointsRate || 25)) : 0,
        orderId: activeOrders[0]?.id || `REC-${selectedTable.tableNo || selectedTable.id}-${Date.now().toString().slice(-4)}`,
        isPreCheck: false,
      });

      setIsPayModalOpen(false);
      setIsReceiptModalOpen(true);
      setSelectedTable(null);
      setCashReceived('');
      setDiscountAmount(0);
      setMemberPhone('');
      setCustomerNameInput('');
      setMemberData(null);
      setIsNewCustomer(false);
      setIsLookingUpMember(false);
      setPointsToRedeem(0);
      setPromoCodeInput('');
      setAppliedPromo(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showError('เกิดข้อผิดพลาดในการชำระเงิน', err.message);
    } finally {
      setIsProcessingPay(false);
    }
  };

  // Generate PromptPay QR Payload for Checkout
  const promptPayQrPayload = useMemo(() => {
    if (!store?.promptPayId || finalNetAmount <= 0) return '';
    return generatePromptPayPayload(store.promptPayId, finalNetAmount);
  }, [store?.promptPayId, finalNetAmount]);

  // Handle Bank Slip Selection & Verification
  const handleSelectSlipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsVerifyingSlip(true);
    setSlipResult(null);
    try {
      const scan = await scanSlipQrClient(file);
      setSlipPreview(scan.compressedBase64);
      setSlipQrPayload(scan.qrText);

      const activeOrder = activeOrders[0];
      if (!activeOrder) {
        showError('ไม่พบออเดอร์สำหรับตรวจสอบสลิป');
        return;
      }

      // ส่งไปตรวจสอบที่ API หลังบ้าน
      const res = await fetch(`/api/r/${slug}/orders/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.id,
          qrPayload: scan.qrText,
          slipImage: scan.compressedBase64,
          manualConfirm: false,
          autoCheckout: autoCheckoutEnabled, // ถ้าเปิดโหมดบันทึกอัตโนมัติ ให้ปิดบิลทันทีเมื่อสลิปตรวจผ่านยอดตรง
          discountAmount: totalCombinedDiscount,
          memberPhone: memberPhone || null,
          customerName: customerNameInput.trim() || undefined,
          pointsRedeemed: discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
          promoCode: discountTab === 'PROMO' ? appliedPromo?.code || null : null,
        }),
      });
      const data = await res.json();
      setSlipResult(data);

      if (data.isPaid) {
        playSuccessChime();
        if (voiceEnabled) {
          speakSlipVerified(finalNetAmount, selectedTable.name);
        }
        showSuccess('สลิปถูกต้อง และปิดบิลสำเร็จเรียบร้อย! 🎉', `${selectedTable.name} • ฿${finalNetAmount}`);

        // เปิด Modal ใบเสร็จเพื่อให้พิมพ์สลิป/ใบเสร็จได้
        setReceiptOrder({
          storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
          promptPayName: store?.promptPayName || '',
          phone: store?.phone || '',
          address: store?.address || '',
          receiptFooter: store?.receiptFooter || '',
          tableId: selectedTable.id || selectedTable.tableNo,
          tableName: selectedTable.name,
          orders: activeOrders,
          totalAmount: rawTotalAmount,
          discountAmount: totalCombinedDiscount,
          netAmount: finalNetAmount,
          paymentMethod: 'PROMPTPAY',
          cashReceived: null,
          changeAmount: 0,
          paidAt: new Date().toISOString(),
        });

        setIsPayModalOpen(false);
        setIsReceiptModalOpen(true);
        setSlipPreview(null);
        setSlipResult(null);
        setSelectedTable(null);
        setCashReceived('');
        setDiscountAmount(0);
        setMemberPhone('');
        setCustomerNameInput('');
        setMemberData(null);
        setPointsToRedeem(0);
        setPromoCodeInput('');
        setAppliedPromo(null);
        fetchData();
      } else if (data.isDuplicate) {
        if (voiceEnabled) {
          speakSlipDuplicate();
        }
        showError('สลิปนี้เคยถูกใช้งานแล้ว ⚠️', data.error);
      } else if (data.isAmountMismatch) {
        if (voiceEnabled) {
          speakSlipAmountMismatch(data.slipAmount, data.netAmount || finalNetAmount);
        }
        showError('ยอดเงินในสลิปไม่ตรงกับยอดบิล ⚠️', data.error);
      } else if (data.isReceiverMismatch) {
        if (voiceEnabled) {
          speakSlipReceiverMismatch();
        }
        showError('บัญชีผู้รับเงินไม่ตรง ⚠️', data.error);
      } else if (data.parsed?.isValid) {
        if (voiceEnabled) {
          speakSlipReadSuccess(data.parsed.amount || finalNetAmount, selectedTable.name);
        }
        showSuccess('อ่านสลิปสำเร็จ ตรวจสอบยอดเงินตรง ✅', 'สามารถกดปุ่ม "บันทึกมือ" เพื่อยืนยันปิดบิล');
      } else {
        if (voiceEnabled) {
          speakSlipNoQr();
        }
        showInfo('แนบรูปสลิปแล้ว (ไม่พบ Mini-QR บนรูป)', 'กรุณาตรวจทานด้วยสายตา แล้วกดปุ่ม "บันทึกมือ"');
      }
    } catch (err: any) {
      console.error(err);
      showError('ไม่สามารถตรวจสอบสลิปได้', err.message);
    } finally {
      setIsVerifyingSlip(false);
    }
  };

  // Handle Manual Confirm with Slip
  const handleManualConfirmSlip = async () => {
    const activeOrder = activeOrders[0];
    if (!activeOrder) return;
    setIsManualConfirming(true);
    try {
      const res = await fetch(`/api/r/${slug}/orders/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.id,
          qrPayload: slipQrPayload,
          slipImage: slipPreview,
          manualConfirm: true,
          discountAmount: totalCombinedDiscount,
          memberPhone: memberPhone || null,
          customerName: customerNameInput.trim() || undefined,
          pointsRedeemed: discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
          promoCode: discountTab === 'PROMO' ? appliedPromo?.code || null : null,
        }),
      });
      const data = await res.json();
      if (data.isPaid) {
        playSuccessChime();
        if (voiceEnabled) {
          speakSlipVerified(finalNetAmount, selectedTable.name);
        }
        showSuccess('บันทึกปิดบิลด้วยสลิปสำเร็จแล้ว ✅', `${selectedTable.name} • ยอด ฿${finalNetAmount}`);

        // เปิด Modal ใบเสร็จเพื่อให้พิมพ์สลิป/ใบเสร็จได้
        setReceiptOrder({
          storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
          promptPayName: store?.promptPayName || '',
          phone: store?.phone || '',
          address: store?.address || '',
          receiptFooter: store?.receiptFooter || '',
          tableId: selectedTable.id || selectedTable.tableNo,
          tableName: selectedTable.name,
          orders: activeOrders,
          totalAmount: rawTotalAmount,
          discountAmount: totalCombinedDiscount,
          netAmount: finalNetAmount,
          paymentMethod: 'PROMPTPAY',
          cashReceived: null,
          changeAmount: 0,
          paidAt: new Date().toISOString(),
        });

        setIsPayModalOpen(false);
        setIsReceiptModalOpen(true);
        setSlipPreview(null);
        setSlipQrPayload(null);
        setSlipResult(null);
        setSelectedTable(null);
        setCashReceived('');
        setDiscountAmount(0);
        setMemberPhone('');
        setCustomerNameInput('');
        setMemberData(null);
        setPointsToRedeem(0);
        setPromoCodeInput('');
        setAppliedPromo(null);
        fetchData();
      } else {
        showError('ไม่สามารถปิดบิลได้', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsManualConfirming(false);
    }
  };

  // Live Parsed Result of Bank Notification Text (LINE / SMS)
  const parsedBankText = useMemo(() => {
    return parseBankNotificationText(bankNotificationInput);
  }, [bankNotificationInput]);

  // Handle Process Payment from Bank Text Notification
  const handleProcessBankTextMessage = async () => {
    if (!selectedTable || activeOrders.length === 0) return;
    if (!parsedBankText.isValid || !parsedBankText.amount) {
      showError('ไม่พบยอดเงินเข้าที่ถูกต้องในข้อความ', parsedBankText.message);
      return;
    }

    if (Math.abs(parsedBankText.amount - finalNetAmount) >= 0.01) {
      const ok = window.confirm(
        `⚠️ ยอดเงินในข้อความ (฿${parsedBankText.amount.toLocaleString()}) ไม่ตรงกับยอดบิล (฿${finalNetAmount.toLocaleString()})\n\nคุณต้องการยืนยันปิดบิลด้วยยอดนี้หรือไม่?`
      );
      if (!ok) return;
    }

    setIsProcessingBankText(true);
    try {
      let remainingDiscount = totalCombinedDiscount;
      for (let i = 0; i < activeOrders.length; i++) {
        const order = activeOrders[i];
        const isFirst = i === 0;
        const currentOrderAmount = order.netAmount ?? order.totalAmount ?? 0;
        const orderDiscount = Math.min(currentOrderAmount, remainingDiscount);
        remainingDiscount -= orderDiscount;

        await fetch(`/api/r/${slug}/orders/${order.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: 'PROMPTPAY',
            memberPhone: memberPhone || null,
            pointsRedeemed: isFirst && discountTab === 'LOYALTY' ? pointsToRedeem || 0 : 0,
            promoCode: isFirst && discountTab === 'PROMO' ? appliedPromo?.code || null : null,
            discountAmount: orderDiscount,
            skipVisitIncrement: !isFirst,
            note: `${selectedTable.name} (ชำระผ่าน ${parsedBankText.bankName || parsedBankText.bank || 'ธนาคาร'})`,
          }),
        });
      }

      playSuccessChime();
      if (voiceEnabled) {
        speakMoneyReceived(parsedBankText.amount, selectedTable.name);
      }
      showSuccess(
        `ตัดยอดเงินเข้า ฿${parsedBankText.amount.toLocaleString()} สำเร็จ! 🎉`,
        `${selectedTable.name} • (${parsedBankText.bankName || parsedBankText.bank || 'ธนาคาร'})`
      );

      setReceiptOrder({
        storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
        promptPayName: store?.promptPayName || '',
        phone: store?.phone || '',
        address: store?.address || '',
        receiptFooter: store?.receiptFooter || '',
        tableId: selectedTable.id || selectedTable.tableNo,
        tableName: selectedTable.name,
        orders: activeOrders,
        totalAmount: rawTotalAmount,
        discountAmount: totalCombinedDiscount,
        netAmount: finalNetAmount,
        paymentMethod: 'PROMPTPAY',
        cashReceived: null,
        changeAmount: 0,
        paidAt: new Date().toISOString(),
      });

      setIsPayModalOpen(false);
      setIsReceiptModalOpen(true);
      setSlipPreview(null);
      setSlipQrPayload(null);
      setSlipResult(null);
      setSelectedTable(null);
      setCashReceived('');
      setDiscountAmount(0);
      setMemberPhone('');
      setMemberData(null);
      setPointsToRedeem(0);
      setPromoCodeInput('');
      setAppliedPromo(null);
      setBankNotificationInput('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showError('ไม่สามารถปิดบิลได้', err.message);
    } finally {
      setIsProcessingBankText(false);
    }
  };

  // Handle Quick Create Single Table
  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTable(true);
    try {
      const res = await fetch(`/api/r/${slug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_TABLE',
          id: newTableId ? parseInt(newTableId) : undefined,
          name: newTableName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddTableModalOpen(false);
        setNewTableId('');
        setNewTableName('');
        fetchData();
      } else {
        alert(data.error || 'ไม่สามารถเพิ่มโต๊ะได้');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingTable(false);
    }
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* 🔊 Browser Audio Autoplay Unlock Banner */}
      {!isAudioUnlocked && voiceEnabled && (
        <div
          onClick={() => {
            setIsAudioUnlocked(true);
            playSuccessChime();
            speakThaiVoice('ระบบเสียงแจ้งเตือนเงินเข้าพร้อมทำงานแล้วค่ะ');
            showSuccess('🔊 เปิดระบบเสียงแจ้งเตือนสำเร็จ', 'พร้อมรับเสียงพูดแจ้งเตือนเงินเข้าภาษาไทยอัตโนมัติ');
          }}
          className={`rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-md shadow-orange-500/20 cursor-pointer animate-pulse hover:brightness-105 transition-all ${
            isSplitView ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
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
          <button
            type="button"
            className={`${isSplitView ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'} rounded-xl bg-white text-orange-700 font-black shadow-sm flex-shrink-0 ml-2 cursor-pointer`}
          >
            เปิดเสียง ⚡
          </button>
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
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'OCCUPIED', label: `กำลังทาน (${totalOccupied})`, activeClass: 'bg-orange-500 text-white shadow-sm' },
              { id: 'AVAILABLE', label: `ว่าง (${totalAvailable})`, activeClass: 'bg-emerald-500 text-white shadow-sm' },
              { id: 'DELIVERY', label: `🛵 เดลิเวอรี (${deliveryOrders.length})`, activeClass: 'bg-emerald-700 text-white shadow-sm font-black' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`py-1.5 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === f.id
                    ? f.activeClass || 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {/* Voice Announcement for Money Received */}
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pos_voice_enabled', next ? 'true' : 'false');
                }
                if (next) {
                  speakThaiVoice('เปิดระบบเสียงอ่านแจ้งเตือนเงินเข้าแล้วค่ะ');
                  showSuccess('🔊 เปิดเสียงอ่านแจ้งเตือนเงินเข้าแล้ว');
                } else {
                  showInfo('🔇 ปิดเสียงอ่านแจ้งเตือนเงินเข้า');
                }
              }}
              className={`h-8 px-2.5 rounded-xl text-[11px] font-extrabold border flex items-center justify-center space-x-1 transition-all whitespace-nowrap flex-shrink-0 active:scale-95 cursor-pointer ${
                voiceEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
              title={voiceEnabled ? 'คลิกเพื่อปิดเสียงพูดเงินเข้า' : 'คลิกเพื่อเปิดเสียงพูดเงินเข้า'}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className={isSplitView ? 'hidden' : 'hidden sm:inline'}>{voiceEnabled ? 'เสียงเงินเข้า' : 'ปิดเสียง'}</span>
            </button>

            {/* Delivery Quick Button */}
            <button
              onClick={() => handleOpenDeliveryModal('LINEMAN')}
              className="h-8 px-2.5 rounded-xl text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center space-x-1 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer active:scale-95"
              title="รับออเดอร์เดลิเวอรี"
            >
              <span className="text-xs">🛵</span>
              <span>เดลิเวอรี</span>
            </button>

            {/* Add Table Quick Button */}
            <button
              onClick={() => {
                const highestNo = tables.reduce((max, t) => Math.max(max, t.tableNo || t.id || 0), 0);
                setNewTableId(String(highestNo + 1));
                setNewTableName(`โต๊ะ ${highestNo + 1}`);
                setIsAddTableModalOpen(true);
              }}
              className="h-8 px-2.5 rounded-xl text-[11px] font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-2xs flex items-center space-x-1 transition-all whitespace-nowrap flex-shrink-0 active:scale-95 cursor-pointer"
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
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🛵 รายการออเดอร์เดลิเวอรีที่กำลังดำเนินการ</span>
              <span className="text-xs font-bold text-slate-500">({deliveryOrders.length} ออเดอร์)</span>
            </h2>
            <button
              onClick={() => handleOpenDeliveryModal('LINEMAN')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 shadow-sm whitespace-nowrap flex-shrink-0 transition-all cursor-pointer active:scale-95"
            >
              + คีย์ออเดอร์ LINE MAN / Grab
            </button>
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
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header Banner */}
                    <div
                      className={`p-4 text-white flex items-center justify-between ${
                        isLineman
                          ? 'bg-[#06C755]'
                          : isGrab
                          ? 'bg-[#00B14F]'
                          : isShopee
                          ? 'bg-[#EE4D2D]'
                          : 'bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black">
                          {isLineman ? '🛵 LINE MAN' : isGrab ? '🛵 GrabFood' : isShopee ? '🛵 ShopeeFood' : '🛵 เดลิเวอรี'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-black/20">
                          #{order.deliveryOrderId || order.id.slice(-4)}
                        </span>
                      </div>
                      <span className="text-xs font-bold">{formatTime(order.createdAt)}</span>
                    </div>

                    {/* Order Body */}
                    <div className="p-4 space-y-3 flex-1">
                      {order.riderName && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span>👤 ไรเดอร์: <strong className="text-slate-900">{order.riderName}</strong></span>
                          {order.riderPhone && <span className="text-[11px] text-slate-500">📞 {order.riderPhone}</span>}
                        </div>
                      )}

                      <div className="space-y-1.5 divide-y divide-slate-100">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 truncate">
                              {item.name} x {item.quantity}
                            </span>
                            <span className="text-slate-600 font-semibold flex-shrink-0 ml-2">
                              ฿{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Financials & GP */}
                      <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>ยอดรวมออเดอร์ (Gross):</span>
                          <span className="font-bold text-slate-800">฿{order.totalAmount}</span>
                        </div>
                        {order.gpPercent > 0 && (
                          <div className="flex justify-between text-rose-600 text-[11px]">
                            <span>หัก GP {order.gpPercent}%:</span>
                            <span>-฿{order.gpAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-100">
                          <span>รายได้สุทธิ (Net):</span>
                          <span className="text-emerald-600 text-sm">฿{order.netRevenue || order.netAmount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all"
                        >
                          🍳 เริ่มปรุง
                        </button>
                      )}
                      {(isPending || isCooking) && (
                        <button
                          onClick={() => handleUpdateDeliveryStatus(order.id, 'READY')}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all"
                        >
                          🔔 ปรุงเสร็จแล้ว
                        </button>
                      )}
                      {isReady && (
                        <button
                          onClick={() => handleUpdateDeliveryStatus(order.id, 'COMPLETED')}
                          className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-sm"
                        >
                          🛵 ไรเดอร์รับอาหารแล้ว (เสร็จสิ้น)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tables Grid - Full Width matching Header on Mobile (when not on Delivery filter) */}
      {statusFilter !== 'DELIVERY' && (
      <div className={`grid gap-3 sm:gap-4 auto-rows-fr w-full ${isSplitView ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'OCCUPIED' || table.activeOrdersCount > 0;
          const isSelected = selectedTable?.id === table.id || selectedTable?.tableNo === table.tableNo;

          return (
            <div
              key={table.tableNo || table.id}
              onClick={() => setSelectedTable(table)}
              className={`relative ${isSplitView ? 'p-3 sm:p-3.5 rounded-xl sm:rounded-2xl' : 'p-4 sm:p-5 rounded-2xl sm:rounded-3xl'} border cursor-pointer transition-all duration-200 flex flex-col justify-between group w-full min-h-[90px] ${isSplitView ? 'sm:min-h-[120px]' : 'sm:min-h-[150px]'} ${
                isSelected
                  ? 'ring-4 ring-orange-500/30 border-orange-500 shadow-xl bg-white scale-[1.01]'
                  : isOccupied
                  ? 'bg-gradient-to-br from-white to-orange-50/40 border-orange-200/90 shadow-sm hover:shadow-md hover:border-orange-400'
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300'
              }`}
            >
              {/* Card Header / Top Content */}
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

                {/* Mobile Right Action */}
                <div className="sm:hidden flex-shrink-0">
                  {isOccupied ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCheckoutForTable(table);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] shadow-sm transition-all active:scale-95 flex items-center space-x-1 ${
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

              {/* Active Service Call Indicator on Table Card */}
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
                  className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 text-xs font-bold flex items-center justify-between gap-1 animate-pulse hover:bg-amber-500/25 transition-all w-full cursor-pointer shadow-xs"
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

              {/* Desktop Bottom Action Area */}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCheckoutForTable(table);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-1 flex-shrink-0 cursor-pointer ${
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

      {/* Selected Table Drawer / Action Bar */}
      {selectedTable && (
        <div className={`z-40 bg-slate-900 text-white shadow-2xl border-t border-slate-800 backdrop-blur-xl bg-opacity-95 ${
          isSplitView ? 'sticky bottom-0 inset-x-0 p-2.5 sm:p-3' : 'fixed inset-x-0 bottom-14 xl:bottom-0 p-3.5 sm:p-5'
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

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setIsCashierOrderOpen(true)}
                className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-sm flex items-center space-x-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ สั่งอาหาร</span>
              </button>

              {selectedTable.activeOrdersCount > 0 && (
                <>
                  <button
                    onClick={() => setIsMoveModalOpen(true)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center space-x-1 transition-all cursor-pointer"
                    title="ย้ายโต๊ะ"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้าย</span>
                  </button>

                  <button
                    onClick={() => handlePrintBillForTable(selectedTable)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs border border-amber-500/40 hover:border-amber-500/70 flex items-center space-x-1 transition-all cursor-pointer"
                    title="พิมพ์ใบแจ้งค่าอาหาร / ใบเช็คบิล"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์บิล</span>
                  </button>

                  <button
                    onClick={() => handleOpenCheckoutForTable(selectedTable)}
                    className={`px-3.5 py-2 rounded-xl font-black text-xs shadow-md flex items-center space-x-1 transition-all cursor-pointer ${
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
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="ปิดแถบโต๊ะ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Add Order Modal */}
      {isCashierOrderOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-black">
                    {orderChannel === 'LINEMAN'
                      ? '🛵 สั่งอาหาร LINE MAN Delivery'
                      : orderChannel === 'GRAB'
                      ? '🛵 สั่งอาหาร GrabFood Delivery'
                      : orderChannel === 'SHOPEE_FOOD'
                      ? '🛵 สั่งอาหาร ShopeeFood Delivery'
                      : orderChannel === 'TAKEAWAY'
                      ? '🛍️ สั่งอาหารกลับบ้าน (Takeaway)'
                      : `สั่งอาหารหน้าร้าน — ${selectedTable?.name || 'โต๊ะอาหาร'}`}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">เลือกเมนูและกดส่งเข้าห้องครัว ตัดสต็อกวัตถุดิบอัตโนมัติ</p>
              </div>

              {/* Channel Switcher Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                {[
                  { id: 'DINE_IN', label: '🍽️ ทานที่ร้าน' },
                  { id: 'TAKEAWAY', label: '🛍️ กลับบ้าน' },
                  { id: 'LINEMAN', label: '🟢 LINE MAN' },
                  { id: 'GRAB', label: '🟢 Grab' },
                  { id: 'SHOPEE_FOOD', label: '🟠 Shopee' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setOrderChannel(ch.id as any);
                      if (['LINEMAN', 'GRAB', 'SHOPEE_FOOD'].includes(ch.id) && !deliveryOrderId) {
                        const prefix = ch.id === 'LINEMAN' ? 'LM' : ch.id === 'GRAB' ? 'GF' : 'SF';
                        setDeliveryOrderId(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                      orderChannel === ch.id
                        ? ch.id === 'LINEMAN'
                          ? 'bg-[#06C755] text-white'
                          : ch.id === 'GRAB'
                          ? 'bg-[#00B14F] text-white'
                          : ch.id === 'SHOPEE_FOOD'
                          ? 'bg-[#EE4D2D] text-white'
                          : 'bg-orange-500 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsCashierOrderOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white self-end sm:self-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Delivery Details Bar if Delivery Channel is active */}
            {['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel) && (
              <div className="bg-slate-800/95 border-b border-slate-700 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs text-white">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-300">รหัสบิล/ออเดอร์:</span>
                  <input
                    type="text"
                    placeholder="เช่น LM-4892"
                    value={deliveryOrderId}
                    onChange={(e) => setDeliveryOrderId(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold w-28 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-300">ชื่อไรเดอร์:</span>
                  <input
                    type="text"
                    placeholder="ชื่อคนขับ / ทะเบียน"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-32 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-300">เบอร์โทร:</span>
                  <input
                    type="text"
                    placeholder="081xxxxxxx"
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-28 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Menu Selection Area */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาเมนูอาหาร..."
                    value={searchMenu}
                    onChange={(e) => setSearchMenu(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenItemCustomizer(item)}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between bg-white"
                    >
                      {item.imageUrl && (
                        <div className="w-full h-20 rounded-xl overflow-hidden mb-2 bg-slate-100 flex-shrink-0">
                          <img
                            src={formatImageUrl(item.imageUrl)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block truncate">{item.name}</span>
                        <span className="text-[11px] text-slate-400">{item.categoryName}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-black text-orange-600">฿{item.basePrice}</span>
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                          +
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Drawer in Modal */}
              <div className="w-full md:w-80 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-4 sm:p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                    รายการที่เลือก ({cashierCart.length})
                  </h4>

                  <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                    {cashierCart.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">ยังไม่มีรายการในตะกร้า</p>
                    ) : (
                      cashierCart.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{item.name} x {item.quantity}</span>
                            <span className="text-[10px] text-slate-400">฿{item.price * item.quantity}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-3">
                  {(() => {
                    const rawTotal = cashierCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
                    const isDeliv = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel);
                    const gpRate = isDeliv
                      ? orderChannel === 'LINEMAN'
                        ? store?.linemanGp ?? 30
                        : orderChannel === 'GRAB'
                        ? store?.grabGp ?? 30
                        : orderChannel === 'SHOPEE_FOOD'
                        ? store?.shopeeGp ?? 30
                        : 20
                      : 0;
                    const gpVal = (rawTotal * gpRate) / 100;
                    const netVal = rawTotal - gpVal;

                    return (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between font-black text-sm text-slate-900">
                            <span>ยอดรวมทั้งหมด:</span>
                            <span className="text-orange-600">฿{rawTotal.toLocaleString()}</span>
                          </div>
                          {isDeliv && rawTotal > 0 && (
                            <div className="text-[11px] bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-800 space-y-0.5">
                              <div className="flex justify-between">
                                <span>หัก GP {gpRate}%:</span>
                                <span className="text-rose-600 font-bold">-฿{gpVal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between font-black text-emerald-900 pt-1 border-t border-emerald-200">
                                <span>รายได้สุทธิร้าน:</span>
                                <span>฿{netVal.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          disabled={cashierCart.length === 0}
                          onClick={handleSubmitCashierOrder}
                          className={`w-full py-3 rounded-2xl text-white font-extrabold text-xs shadow-lg transition-all disabled:opacity-50 ${
                            isDeliv
                              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                              : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
                          }`}
                        >
                          {isDeliv ? '🛵 ส่งออเดอร์เดลิเวอรีเข้าครัวทันที' : 'ส่งออเดอร์เข้าครัวทันที 🍳'}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Customizer Pop-up (when clicking item) */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-base text-slate-900">{selectedMenuItem.name}</h4>
              <button onClick={() => setSelectedMenuItem(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {selectedMenuItem.options?.map((group: any) => (
              <div key={group.id} className="space-y-1.5">
                <span className="text-xs font-extrabold text-slate-700">{group.title}</span>
                <div className="flex flex-wrap gap-1.5">
                  {group.choices?.map((choice: any) => {
                    const isSelected = selectedOptions[group.title]?.some((c) => c.name === choice.name);
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => {
                          if (group.isMulti) {
                            const current = selectedOptions[group.title] || [];
                            if (isSelected) {
                              setSelectedOptions({
                                ...selectedOptions,
                                [group.title]: current.filter((c) => c.name !== choice.name),
                              });
                            } else {
                              setSelectedOptions({
                                ...selectedOptions,
                                [group.title]: [...current, choice],
                              });
                            }
                          } else {
                            setSelectedOptions({
                              ...selectedOptions,
                              [group.title]: [choice],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {choice.name} {choice.extraPrice > 0 && `(+฿${choice.extraPrice})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">หมายเหตุพิเศษ</label>
              <input
                type="text"
                placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDishQuantity(Math.max(1, dishQuantity - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold"
                >
                  -
                </button>
                <span className="font-extrabold text-sm">{dishQuantity}</span>
                <button
                  type="button"
                  onClick={() => setDishQuantity(dishQuantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 font-bold"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
              >
                เพิ่มลงตะกร้า (฿{calculateCustomizedPrice()})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout / Pay Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">เช็คบิล {selectedTable?.name}</h3>
                <p className="text-xs text-slate-400">เลือกวิธีชำระเงินและพิมพ์ใบเสร็จ</p>
              </div>
              <button
                onClick={() => {
                  setIsPayModalOpen(false);
                  setMemberPhone('');
                  setCustomerNameInput('');
                  setMemberData(null);
                  setIsNewCustomer(false);
                  setIsLookingUpMember(false);
                  setMemberRewards([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Member Phone & Customer Name for Points Accumulation */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 mb-1.5 flex items-center justify-between h-5">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>เบอร์โทรสะสมแต้ม</span>
                    </span>
                    {isLookingUpMember && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-600 font-bold shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                        <span>ค้นหา...</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    placeholder="เช่น 0899998888"
                    value={memberPhone}
                    onChange={(e) => handleLookupMember(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 mb-1.5 flex items-center justify-between h-5">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>ชื่อลูกค้า</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={isNewCustomer ? "พิมพ์ชื่อลูกค้าใหม่" : "ชื่อลูกค้า (เช่น คุณสมศรี)"}
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    className={`w-full h-9 px-3 py-1.5 rounded-xl border text-xs font-bold bg-white focus:outline-none focus:ring-2 transition-all ${
                      isNewCustomer
                        ? 'border-blue-300 ring-2 ring-blue-500/20 focus:ring-blue-500'
                        : memberData
                        ? 'border-emerald-300 focus:ring-emerald-500'
                        : 'border-slate-200 focus:ring-orange-500'
                    }`}
                  />
                </div>
              </div>

              {/* Member Status Card */}
              {memberData ? (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/60 border border-orange-200 shadow-sm text-xs flex items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        สมาชิกเดิม
                      </span>
                      <span className="font-black text-slate-900 text-xs truncate">
                        {memberData.name || 'คุณลูกค้า'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        ({memberData.phone})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <span>บิลนี้ได้รับเพิ่ม:</span>
                      <strong className="text-emerald-700 font-black bg-emerald-100/90 px-2 py-0.5 rounded-md text-[11px]">
                        +{Math.floor(finalNetAmount / (store?.pointsRate || 25))} แต้ม
                      </strong>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">คะแนนสะสมคงเหลือ</span>
                    <span className="text-xs font-black text-orange-600 bg-white border border-orange-200 px-2.5 py-1 rounded-xl shadow-sm inline-block">
                      ⭐ {memberData.points?.toLocaleString() || 0} แต้ม
                    </span>
                  </div>
                </div>
              ) : isNewCustomer || (memberPhone.replace(/\D/g, '').length >= 9 && !isLookingUpMember) ? (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200 text-xs flex items-center justify-between gap-2 text-blue-900 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-blue-800 font-extrabold bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-300 flex items-center gap-1 shadow-xs shrink-0">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        ลูกค้าใหม่
                      </span>
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {customerNameInput.trim() ? `คุณ${customerNameInput.trim()}` : '(ยังไม่ระบุชื่อ)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      กรอกชื่อลูกค้าเพื่อเริ่มสะสมแต้ม • บิลนี้จะได้รับสะสมทันที
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">แต้มที่จะได้รับ</span>
                    <span className="text-xs font-black text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-xl shadow-sm inline-block">
                      +{Math.floor(finalNetAmount / (store?.pointsRate || 25))} แต้ม
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Segmented Discount / Promo / Loyalty Tabs */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  เลือกใช้สิทธิ์ส่วนลด / โปรโมชั่น:
                </span>
                {discountTab !== 'NONE' && (
                  <button
                    type="button"
                    onClick={() => handleSwitchDiscountTab('NONE')}
                    className="text-[11px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    ไม่ใช้ส่วนลด
                  </button>
                )}
              </div>

              {/* 3 Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSwitchDiscountTab('LOYALTY')}
                  className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                    discountTab === 'LOYALTY'
                      ? 'bg-white text-orange-600 shadow-sm border border-orange-200 ring-1 ring-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>⭐ แต้มสะสม</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchDiscountTab('PROMO')}
                  className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                    discountTab === 'PROMO'
                      ? 'bg-white text-orange-600 shadow-sm border border-orange-200 ring-1 ring-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>🏷️ คูปองโปร</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchDiscountTab('CUSTOM')}
                  className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                    discountTab === 'CUSTOM'
                      ? 'bg-white text-orange-600 shadow-sm border border-orange-200 ring-1 ring-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>💵 ลดเอง</span>
                </button>
              </div>

              {/* TAB 1: LOYALTY */}
              {discountTab === 'LOYALTY' && (
                <div className="space-y-2.5 pt-1 border-t border-slate-200/60 animate-fade-in">
                  {!memberData ? (
                    <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-100 text-xs text-orange-800">
                      กรุณากรอกเบอร์โทรศัพท์ลูกค้าด้านบน เพื่อดึงแต้มและของรางวัลที่สามารถแลกได้
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Milestone Rewards */}
                      {memberRewards.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">ของรางวัลเป้าหมาย (Milestones):</span>
                          <div className="flex flex-wrap gap-1.5">
                            {memberRewards.map((r) => {
                              const isEnough = memberData.points >= r.pointsRequired;
                              const isSelected = selectedReward?.id === r.id;
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  disabled={!isEnough}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedReward(null);
                                      setPointsToRedeem(0);
                                    } else {
                                      setSelectedReward(r);
                                      setPointsToRedeem(r.pointsRequired);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-500/50'
                                      : isEnough
                                      ? 'bg-orange-100/70 text-orange-700 hover:bg-orange-200/70 border border-orange-200'
                                      : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
                                  }`}
                                >
                                  <span>🎁 {r.title} ({r.pointsRequired} แต้ม)</span>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Direct Point Discount Button */}
                      {memberData.points > 0 && !selectedReward && (
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-xs text-slate-500">หรือแลกแต้มส่วนลดทั่วไป:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (pointsToRedeem > 0) {
                                setPointsToRedeem(0);
                              } else {
                                const maxPoints = Math.min(memberData.points, Math.floor(rawTotalAmount / (store?.pointValue || 1)));
                                setPointsToRedeem(maxPoints);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                              pointsToRedeem > 0
                                ? 'bg-orange-600 text-white shadow-sm'
                                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                            }`}
                          >
                            {pointsToRedeem > 0 ? `แลก ฿${pointsToRedeem * (store?.pointValue || 1)} ✓` : 'แลกแต้มส่วนลดสูงสุด'}
                          </button>
                        </div>
                      )}

                      {selectedReward && (
                        <div className="p-2.5 bg-orange-100/70 text-orange-800 text-xs font-bold rounded-xl border border-orange-200 flex items-center justify-between">
                          <span>✓ แลกรับ: {selectedReward.title}</span>
                          <span>(หัก {selectedReward.pointsRequired} แต้ม)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PROMO / COUPONS */}
              {discountTab === 'PROMO' && (
                <div className="space-y-2.5 pt-1 border-t border-slate-200/60 animate-fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="เช่น WELCOME50, DISC10"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPromo()}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm"
                    >
                      ใช้โค้ด
                    </button>
                  </div>

                  {/* Quick Promo Chips from Store */}
                  {availablePromotions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">คูปองโปรโมชั่นของร้าน (คลิกเพื่อใช้):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {availablePromotions.map((p) => {
                          const isSelected = appliedPromo?.code === p.code;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleApplyPromo(p.code)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-500/50'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              <span>🏷️ {p.code} ({p.discountType === 'PERCENT' ? `${p.discountValue}%` : `฿${p.discountValue}`})</span>
                              {isSelected && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {appliedPromo && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-extrabold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span>✓ {appliedPromo.title} ({appliedPromo.code})</span>
                      <span>-฿{appliedPromo.calculatedDiscount}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CUSTOM DISCOUNT */}
              {discountTab === 'CUSTOM' && (
                <div className="space-y-2.5 pt-1 border-t border-slate-200/60 animate-fade-in">
                  <div className="flex items-center gap-2">
                    {/* Fixed / Percent Selector */}
                    <div className="flex p-0.5 bg-slate-200 rounded-lg border border-slate-300/80">
                      <button
                        type="button"
                        onClick={() => setCustomDiscountType('FIXED')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${
                          customDiscountType === 'FIXED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        ฿ (บาท)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomDiscountType('PERCENT')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all ${
                          customDiscountType === 'PERCENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        % (เปอร์เซ็นต์)
                      </button>
                    </div>

                    <input
                      type="number"
                      min="0"
                      placeholder={customDiscountType === 'PERCENT' ? 'เช่น 10 (ลด 10%)' : 'เช่น 30 (ลด 30 บ.)'}
                      value={customDiscountValue}
                      onChange={(e) => setCustomDiscountValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-500">ปุ่มลัด:</span>
                    {customDiscountType === 'PERCENT' ? (
                      [5, 10, 15, 20, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCustomDiscountValue(pct.toString())}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                            customDiscountValue === pct.toString()
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))
                    ) : (
                      [10, 20, 30, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomDiscountValue(amt.toString())}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                            customDiscountValue === amt.toString()
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          ฿{amt}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-orange-900 block">ยอดสุทธิที่ต้องชำระ:</span>
                {totalCombinedDiscount > 0 && (
                  <span className="text-[11px] text-emerald-600 font-bold">
                    (ประหยัดไป ฿{totalCombinedDiscount})
                  </span>
                )}
              </div>
              <span className="text-2xl font-black text-orange-600">฿{finalNetAmount.toLocaleString()}</span>
            </div>

            {/* Payment Method Switch */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('PROMPTPAY')}
                className={`py-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center space-x-2 transition-all ${
                  paymentMethod === 'PROMPTPAY'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4 text-orange-400" />
                <span>PromptPay QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center space-x-2 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>เงินสด (Cash)</span>
              </button>
            </div>

            {/* PromptPay QR & Bank Slip Reader View */}
            {paymentMethod === 'PROMPTPAY' && (
              <div className="space-y-3">
                {/* PromptPay QR */}
                <div className="text-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  {promptPayQrPayload ? (
                    <div className="flex flex-col items-center">
                      <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <QRCodeSVG value={promptPayQrPayload} size={145} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 mt-1.5">
                        พร้อมเพย์: {store?.promptPayId} ({store?.promptPayName})
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500 font-semibold">ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์ในหน้าตั้งค่าร้าน</p>
                  )}
                </div>

                {/* Mode Selector: Slip Photo vs Bank Text Message */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setPromptPayVerifyMode('SLIP')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      promptPayVerifyMode === 'SLIP'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>📷 แนบรูปสลิป / Mini-QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptPayVerifyMode('TEXT')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      promptPayVerifyMode === 'TEXT'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>💬 อ่านข้อความเงินเข้า (LINE/SMS)</span>
                  </button>
                </div>

                {/* Sub-mode 1: Slip Upload & Verification Section */}
                {promptPayVerifyMode === 'SLIP' && (
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-slate-800">ระบบอ่านสลิปโอนเงิน (Slip Reader)</span>
                      </div>
                      {/* Auto Checkout Checkbox */}
                      <label className="flex items-center space-x-1.5 cursor-pointer select-none text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          checked={autoCheckoutEnabled}
                          onChange={(e) => setAutoCheckoutEnabled(e.target.checked)}
                          className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                        />
                        <span>⚡ บันทึกอัตโนมัติ</span>
                      </label>
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      accept="image/*"
                      id="cashier-slip-input"
                      className="hidden"
                      onChange={handleSelectSlipFile}
                    />

                    {/* Upload / Re-upload Button */}
                    {!slipPreview ? (
                      <label
                        htmlFor="cashier-slip-input"
                        className={`w-full py-3 px-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 text-orange-700 font-extrabold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          isVerifyingSlip ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {isVerifyingSlip ? (
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                            <span>กำลังอ่าน Mini-QR และตรวจสอบสลิป...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center space-x-1.5">
                              <Camera className="w-4 h-4 text-orange-600" />
                              <span>📷 สแกนสลิป / แนบรูปภาพสลิปโอนเงิน</span>
                            </div>
                            <span className="text-[10px] text-orange-500 font-normal">
                              รองรับไฟล์ภาพจากมือถือ, แคปหน้าจอ, หรือถ่ายจากกล้อง
                            </span>
                          </>
                        )}
                      </label>
                    ) : (
                      /* Attached Slip Preview & Verification Card */
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div
                              onClick={() => setPreviewSlipModalOpen(true)}
                              className="relative w-12 h-14 rounded-lg overflow-hidden border border-slate-300 flex-shrink-0 cursor-pointer group bg-black/5"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={slipPreview} alt="Slip" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            <div className="truncate text-left text-xs">
                              <span className="font-extrabold text-slate-800 block truncate">
                                {slipResult?.parsed?.bankName || 'สลิปโอนเงินธนาคาร'}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {slipResult?.parsed?.amount !== undefined ? `ยอดในสลิป: ฿${slipResult.parsed.amount.toLocaleString()}` : 'แนบรูปภาพแล้ว'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setPreviewSlipModalOpen(true)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                              title="ดูรูปใหญ่"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <label
                              htmlFor="cashier-slip-input"
                              className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 cursor-pointer text-xs font-bold"
                              title="เปลี่ยนรูปสลิป"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setSlipPreview(null);
                                setSlipQrPayload(null);
                                setSlipResult(null);
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                              title="ลบสลิป"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Verification Status Feedback Badge */}
                        {isVerifyingSlip ? (
                          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                            <span>กำลังตรวจสอบสลิปกับระบบ...</span>
                          </div>
                        ) : slipResult?.isDuplicate ? (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            <span>⚠️ สลิปนี้เคยถูกใช้งานและปิดบิลไปแล้วในระบบ!</span>
                          </div>
                        ) : slipResult?.isAmountMismatch ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span>⚠️ ยอดในสลิป (฿${slipResult.slipAmount}) ไม่ตรงกับยอดบิล (฿${finalNetAmount})</span>
                          </div>
                        ) : slipResult?.parsed?.isValid ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>ตรวจสลิปผ่านแล้ว ✅ (ยอด ฿${slipResult.parsed.amount || finalNetAmount})</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">สลิปแท้ ไม่ซ้ำ</span>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold">
                            ℹ️ รูปสลิปพร้อมใช้งาน สามารถกด "บันทึกมือ" เพื่อยืนยันปิดบิล
                          </div>
                        )}

                        {/* Audio Replay Button for Slip */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (slipResult?.isDuplicate) {
                                speakSlipDuplicate();
                              } else if (slipResult?.isAmountMismatch) {
                                speakSlipAmountMismatch(slipResult.slipAmount, finalNetAmount);
                              } else if (slipResult?.isReceiverMismatch) {
                                speakSlipReceiverMismatch();
                              } else if (slipResult?.parsed?.isValid) {
                                speakSlipReadSuccess(slipResult.parsed.amount || finalNetAmount, selectedTable?.name);
                              } else if (slipResult?.isPaid) {
                                speakSlipVerified(finalNetAmount, selectedTable?.name);
                              } else {
                                speakThaiVoice(`สลิปโต๊ะ ${selectedTable?.name || ''} ยอดบิล ${finalNetAmount} บาทค่ะ`);
                              }
                            }}
                            className="flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>🔊 ฟังเสียงอ่านสลิป</span>
                          </button>
                        </div>

                        {/* BUTTON: MANUAL SAVE / CONFIRM (ปุ่มบันทึกมือ) */}
                        <button
                          type="button"
                          disabled={isManualConfirming}
                          onClick={handleManualConfirmSlip}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isManualConfirming ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <FileCheck className="w-4 h-4" />
                              <span>💾 บันทึกมือ (ยืนยันปิดบิลด้วยสลิปนี้)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-mode 2: Bank Notification Text Reader (LINE / SMS) */}
                {promptPayVerifyMode === 'TEXT' && (
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <MessageSquare className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-black text-slate-800">ระบบอ่านข้อความเงินเข้าธนาคาร</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (voiceEnabled) {
                            if (parsedBankText?.isValid && parsedBankText?.amount) {
                              speakMoneyReceived(parsedBankText.amount, selectedTable?.name);
                            } else {
                              speakThaiVoice(`ยอดบิลนี้คือ ${finalNetAmount} บาทค่ะ`);
                            }
                          } else {
                            showInfo('กรุณาเปิดเสียงที่แถบด้านบนเพื่อฟังเสียงอ่าน');
                          }
                        }}
                        className="flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>🔊 ฟังเสียงอ่าน</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-tight">
                      คัดลอกข้อความแจ้งเตือนเงินเข้าจาก LINE (SCB Connect, KBank Live, Krungthai Connext, เป๋าตัง ฯลฯ) หรือ SMS มาวางที่นี่ ระบบจะอ่านเฉพาะยอดเงินเข้าและตัดยอดปิดบิลให้อัตโนมัติ
                    </p>

                    <div className="relative">
                      <textarea
                        value={bankNotificationInput}
                        onChange={(e) => setBankNotificationInput(e.target.value)}
                        rows={3}
                        placeholder="ตัวอย่าง: เงินเข้า ฿150.00 จาก นาย ก เข้าบัญชี SCB xxx-1234 เวลา 12:30 น."
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-800 placeholder:text-slate-400 resize-none"
                      />
                      {bankNotificationInput && (
                        <button
                          type="button"
                          onClick={() => setBankNotificationInput('')}
                          className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="ล้างข้อความ"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action Tools: Paste Clipboard & Clear */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
                              const text = await navigator.clipboard.readText();
                              if (text && text.trim()) {
                                setBankNotificationInput(text);
                                showSuccess('วางข้อความจากคลิปบอร์ดแล้ว 📋');
                              } else {
                                showInfo('คลิปบอร์ดว่างเปล่า ไม่พบข้อความ');
                              }
                            } else {
                              showInfo('คลิกในช่องข้อความแล้วกด Ctrl+V เพื่อวาง');
                            }
                          } catch {
                            showInfo('คลิกในช่องข้อความแล้วกด Ctrl+V เพื่อวาง');
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                        <span>📋 วางข้อความจากคลิปบอร์ด</span>
                      </button>

                      {bankNotificationInput && (
                        <button
                          type="button"
                          onClick={() => setBankNotificationInput('')}
                          className="py-1.5 px-2.5 rounded-lg text-slate-500 hover:bg-slate-100 font-bold text-[11px] cursor-pointer"
                        >
                          ล้างค่า
                        </button>
                      )}
                    </div>

                    {/* Parsed Result & Amount Check */}
                    {bankNotificationInput.trim() && (
                      <div className="space-y-2.5 pt-1">
                        {parsedBankText.isValid && parsedBankText.amount !== undefined ? (
                          <div
                            className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                              Math.abs(parsedBankText.amount - finalNetAmount) < 0.01
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}
                          >
                            <div className="flex items-center justify-between font-black">
                              <span className="flex items-center gap-1.5">
                                {Math.abs(parsedBankText.amount - finalNetAmount) < 0.01 ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                )}
                                <span>{parsedBankText.bankName || parsedBankText.bank || 'ธนาคาร'}</span>
                              </span>
                              <span className="text-sm font-extrabold">
                                ยอดเงินเข้า: ฿{parsedBankText.amount.toLocaleString()}
                              </span>
                            </div>

                            <div className="text-[11px] font-semibold flex items-center justify-between">
                              {Math.abs(parsedBankText.amount - finalNetAmount) < 0.01 ? (
                                <span className="text-emerald-700 font-bold">
                                  ✅ ยอดเงินเข้าตรงกับยอดบิลเป๊ะ (฿{finalNetAmount})
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold">
                                  ⚠️ ยอดในข้อความ (฿{parsedBankText.amount}) ไม่ตรงกับยอดบิล (฿{finalNetAmount})
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-slate-600">
                                ไม่อ่านยอดคงเหลือ
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                            <span>{parsedBankText.message || 'ไม่พบยอดเงินเข้าในข้อความนี้ กรุณาตรวจทาน'}</span>
                          </div>
                        )}

                        {/* Pay Confirm Button with Bank Text */}
                        <button
                          type="button"
                          disabled={isProcessingBankText || !parsedBankText.isValid || !parsedBankText.amount}
                          onClick={handleProcessBankTextMessage}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isProcessingBankText ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                ⚡ ตัดยอดเงินเข้า &amp; ปิดบิลทันที (฿{parsedBankText.amount || finalNetAmount})
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cash Input */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">รับเงินสดมา (บาท):</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="เช่น 100, 500, 1000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-lg text-slate-900"
                  />
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100 text-xs">
                  <span className="font-bold text-slate-600">เงินทอน:</span>
                  <span className={`font-black text-base ${change < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    ฿{change.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrintBillFromCheckout}
                className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs border border-slate-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
                title="พิมพ์ใบแจ้งค่าอาหาร / ใบเช็คบิลพร้อม QR Code ก่อนชำระเงิน"
              >
                <Printer className="w-4 h-4 text-orange-500" />
                <span>พิมพ์บิล</span>
              </button>

              <button
                type="button"
                disabled={isProcessingPay || (paymentMethod === 'CASH' && change < 0)}
                onClick={handleProcessPayment}
                className="sm:col-span-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ยืนยันชำระเงิน &amp; ปิดบิล</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Table Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="font-black text-base text-slate-900">ย้ายจาก {selectedTable?.name} ไปโต๊ะอื่น</h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">เลือกโต๊ะปลายทาง:</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(parseInt(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="">-- เลือกโต๊ะปลายทาง --</option>
                {tables
                  .filter((t) => t.id !== selectedTable?.id && t.tableNo !== selectedTable?.tableNo)
                  .map((t) => (
                    <option key={t.id || t.tableNo} value={t.tableNo || t.id}>
                      {t.name} ({t.status === 'AVAILABLE' ? 'ว่าง' : 'มีลูกค้า'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!targetTableId}
                onClick={handleMoveTable}
                className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-extrabold disabled:opacity-50"
              >
                ยืนยันย้ายโต๊ะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Table Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="font-black text-base text-slate-900">+ เพิ่มโต๊ะใหม่</h4>
            <form onSubmit={handleCreateNewTable} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมายเลขโต๊ะ (ตัวเลข) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อโต๊ะที่แสดง</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTable}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold shadow-md"
                >
                  {isCreatingTable ? 'กำลังเพิ่ม...' : 'ยืนยันเพิ่มโต๊ะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Resolution Slip Preview Lightbox Modal */}
      {previewSlipModalOpen && slipPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-sm sm:max-w-md w-full bg-slate-900 rounded-3xl p-5 space-y-4 text-white border border-slate-800 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-black">รูปภาพสลิปโอนเงิน</span>
              </div>
              <button
                onClick={() => setPreviewSlipModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-2xl bg-black flex justify-center p-2 border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slipPreview}
                alt="Full Slip Preview"
                className="rounded-xl max-w-full h-auto object-contain shadow-md"
              />
            </div>

            {slipResult?.parsed && (
              <div className="p-3 bg-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>ธนาคาร:</span>
                  <span className="font-bold text-white">{slipResult.parsed.bankName || '-'}</span>
                </div>
                {slipResult.parsed.amount !== undefined && (
                  <div className="flex justify-between">
                    <span>ยอดเงินในสลิป:</span>
                    <span className="font-bold text-emerald-400">฿{slipResult.parsed.amount.toLocaleString()}</span>
                  </div>
                )}
                {slipResult.parsed.slipRef && (
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>เลขอ้างอิงสลิป:</span>
                    <span className="font-mono">{slipResult.parsed.slipRef}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setPreviewSlipModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* 💰 Bank Notification Popup Modal: แจ้งเตือนเงินเข้าผ่าน Email / Bank Webhook / Direct Web */}
      {isAlertModalOpen && bankAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-scale-up flex flex-col">
            {/* Multi-table Queue Tabs / Pills Bar */}
            {bankAlertQueue.length > 1 && (
              <div className="bg-slate-900 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin flex-1 min-w-0">
                  <span className="text-[11px] font-black text-amber-400 flex-shrink-0 flex items-center gap-1 mr-1">
                    <BellRing className="w-3.5 h-3.5 animate-bounce" />
                    <span>รอตรวจ ({bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id) + 1}/{bankAlertQueue.length}):</span>
                  </span>
                  {bankAlertQueue.map((item) => {
                    const isSelected = item.id === bankAlertModal.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveAlertId(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white ring-2 ring-white/70 shadow-md scale-105'
                            : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        <span>{item.tableName || `โต๊ะ ${item.tableNo}`}</span>
                        <span className={isSelected ? 'text-white' : 'text-amber-300 font-extrabold'}>
                          ฿{item.amount?.toLocaleString()}
                        </span>
                        {item.channel === 'SLIP' && <span title="มีสลิปแนบมา">📷</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 pl-1 border-l border-white/10">
                  <button
                    type="button"
                    disabled={bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id) <= 0}
                    onClick={() => {
                      const idx = bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id);
                      if (idx > 0) setActiveAlertId(bankAlertQueue[idx - 1].id);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:cursor-not-allowed text-white text-xs font-black transition-all cursor-pointer"
                    title="โต๊ะก่อนหน้า"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    disabled={bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id) >= bankAlertQueue.length - 1}
                    onClick={() => {
                      const idx = bankAlertQueue.findIndex((a) => a.id === bankAlertModal.id);
                      if (idx < bankAlertQueue.length - 1) setActiveAlertId(bankAlertQueue[idx + 1].id);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:cursor-not-allowed text-white text-xs font-black transition-all cursor-pointer"
                    title="โต๊ะถัดไป"
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}

            {/* Modal Header with Bank & Channel Badge */}
            <div
              className={`p-5 text-white ${
                bankAlertModal.action === 'AUTO_PAID'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
                  : bankAlertModal.action === 'CUSTOMER_NOTIFY'
                  ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700'
                  : bankAlertModal.action === 'UNMATCHED'
                  ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm">
                    {bankAlertModal.channel === 'SLIP' ? (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>ลูกค้าส่งสลิปโอนเงิน (แนบสลิป)</span>
                      </>
                    ) : bankAlertModal.channel === 'WEB' ? (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>แจ้งเตือนผ่านเว็บตรง (ลูกค้าแจ้งโอน)</span>
                      </>
                    ) : bankAlertModal.channel === 'EMAIL' ? (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>แจ้งเตือนผ่าน Email (Gmail)</span>
                      </>
                    ) : (
                      <>
                        <BellRing className="w-3.5 h-3.5" />
                        <span>แจ้งเตือนเงินเข้าธนาคาร</span>
                      </>
                    )}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/20 text-white/90">
                    {bankAlertModal.channel === 'SLIP' ? 'สลิปโอนเงิน' : bankAlertModal.channel === 'WEB' ? 'พร้อมเพย์ / โอนตรง' : (bankAlertModal.bankName || bankAlertModal.bank || 'ธนาคาร')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={dismissCurrentAlert}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight">
                    {bankAlertModal.action === 'CUSTOMER_NOTIFY' && (bankAlertModal.channel === 'SLIP' ? 'ลูกค้าส่งสลิปโอนเงิน 📷' : 'ลูกค้าแจ้งโอนเงินผ่านเว็บ 🔔')}
                    {bankAlertModal.action === 'AUTO_PAID' && 'ตรวจพบเงินเข้า & ปิดบิลสำเร็จ! 🎉'}
                    {bankAlertModal.action === 'MANUAL_CONFIRM' && 'ตรวจพบเงินเข้า ตรงกับโต๊ะอาหาร 🔔'}
                    {bankAlertModal.action === 'AMBIGUOUS_CHOICE' && 'ตรวจพบเงินเข้า ตรงกับหลายโต๊ะ 🔔'}
                    {bankAlertModal.action === 'UNMATCHED' && 'ตรวจพบเงินเข้าบัญชีเรียบร้อย 💵'}
                  </h3>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    {bankAlertModal.action === 'CUSTOMER_NOTIFY' && (bankAlertModal.channel === 'SLIP' ? 'ลูกค้าแนบสลิปโอนเงินจากที่โต๊ะ กรุณาตรวจสอบยอดและกดยืนยันปิดบิล' : 'ลูกค้ากดแจ้งโอนเงินจากที่โต๊ะ กรุณาตรวจสอบยอดและกดยืนยันปิดบิล')}
                    {bankAlertModal.action === 'AUTO_PAID' && 'ระบบตรวจสอบยอดและเคลียร์โต๊ะให้อัตโนมัติแล้ว'}
                    {bankAlertModal.action === 'MANUAL_CONFIRM' && 'กรุณาตรวจสอบและกดยืนยันตัดยอดเพื่อปิดบิล'}
                    {bankAlertModal.action === 'AMBIGUOUS_CHOICE' && 'มียอดตรงกันหลายโต๊ะ กรุณาเลือกโต๊ะที่ต้องการตัดยอด'}
                    {bankAlertModal.action === 'UNMATCHED' && 'ไม่พบโต๊ะที่มียอดค้างชำระตรงกัน (อาจเป็นเงินโอนนอก)'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                  {bankAlertModal.action === 'AUTO_PAID' ? '💰' : bankAlertModal.channel === 'SLIP' ? '📷' : bankAlertModal.action === 'CUSTOMER_NOTIFY' ? '📱' : '🔔'}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-left">
              {/* Amount Highlight Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">ยอดเงินที่ได้รับ</span>
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">
                    ฿{bankAlertModal.amount?.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (bankAlertModal.action === 'CUSTOMER_NOTIFY') {
                      speakCustomerNotifyTransfer(bankAlertModal.tableNo, bankAlertModal.amount);
                    } else if (bankAlertModal.action === 'AUTO_PAID') {
                      speakMoneyReceived(bankAlertModal.amount, bankAlertModal.tableName);
                    } else if (bankAlertModal.tableName) {
                      const rawTable = String(bankAlertModal.tableName);
                      const target = rawTable.startsWith('โต๊ะ') ? ` ${rawTable}` : ` โต๊ะ ${rawTable}`;
                      speakThaiVoice(`เงินเข้า ${bankAlertModal.amount} บาท${target} ค่ะ`.replace(/\s+/g, ' ').trim());
                    } else {
                      speakThaiVoice(`เงินเข้า ${bankAlertModal.amount} บาท ค่ะ`.replace(/\s+/g, ' ').trim());
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>🔊 ฟังเสียง</span>
                </button>
              </div>

              {/* Case 0: CUSTOMER_NOTIFY (ลูกค้าแจ้งโอนผ่านเว็บตรง หรือ แนบสลิป) */}
              {bankAlertModal.action === 'CUSTOMER_NOTIFY' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">โต๊ะที่แจ้งโอน:</span>
                      <span className="font-black text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-sm">
                        {bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">ยอดที่แจ้งโอน:</span>
                      <span className="font-black text-emerald-700 text-base">
                        ฿{bankAlertModal.amount?.toLocaleString()}
                      </span>
                    </div>

                    {(bankAlertModal.customerName || bankAlertModal.memberPhone) && (
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                        <span className="font-bold text-slate-600">ลูกค้า / สมาชิก:</span>
                        <span className="font-bold text-slate-800 text-right">
                          {bankAlertModal.customerName || 'ลูกค้าทั่วไป'}
                          {bankAlertModal.memberPhone && (
                            <span className="text-slate-500 font-mono text-[11px] ml-1.5">
                              ({bankAlertModal.memberPhone})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {bankAlertModal.slipUrl && (
                      <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>สลิปโอนเงินที่แนบมา:</span>
                          </span>
                          <a
                            href={bankAlertModal.slipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
                          >
                            <span>เปิดดูรูปใหญ่</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-emerald-200 bg-black/5 max-h-48 flex items-center justify-center">
                          <img
                            src={bankAlertModal.slipUrl}
                            alt="สลิปโอนเงิน"
                            className="max-h-48 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(bankAlertModal.slipUrl, '_blank')}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-100 leading-normal">
                      💡 เมื่อตรวจสอบยอดเงินในแอปธนาคารหรือสลิปเรียบร้อยแล้ว กดปุ่มยืนยันด้านล่างเพื่อปิดบิลและเคลียร์โต๊ะทันที
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        let orderIds = bankAlertModal.orderIds || [];
                        if (orderIds.length === 0) {
                          const tableRes = await fetch(`/api/r/${slug}/tables/${bankAlertModal.tableNo}`);
                          const tableData = await tableRes.json();
                          if (tableData?.orders) {
                            orderIds = tableData.orders.map((o: any) => o.id);
                          }
                        }

                        for (const oId of orderIds) {
                          await fetch(`/api/r/${slug}/orders/${oId}/pay`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              paymentMethod: 'PROMPTPAY',
                              slipUrl: bankAlertModal.slipUrl || undefined,
                              memberPhone: bankAlertModal.memberPhone || undefined,
                              customerName: bankAlertModal.customerName || undefined,
                              note: `${bankAlertModal.tableName} (${bankAlertModal.channel === 'SLIP' ? 'ลูกค้าส่งสลิป' : 'ลูกค้าแจ้งโอนผ่านเว็บ'})`,
                            }),
                          });
                        }

                        playSuccessChime();
                        if (voiceEnabled) {
                          speakMoneyReceived(bankAlertModal.amount, bankAlertModal.tableName);
                        }
                        showSuccess(`ปิดบิล ${bankAlertModal.tableName} สำเร็จแล้ว ✅`, `ยอดรับ ฿${bankAlertModal.amount?.toLocaleString()}`);
                        resolveAlertAndNext(bankAlertModal.id);
                        fetchData();
                      } catch (e: any) {
                        showError('ไม่สามารถปิดบิลได้', e.message);
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>✅ ยืนยันรับเงิน & ปิดบิล (1 คลิก)</span>
                  </button>

                  <button
                    type="button"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                  >
                    ปิดหน้าต่าง / รอตรวจสอบก่อน
                  </button>
                </div>
              )}

              {/* Case 1: AUTO_PAID */}
              {bankAlertModal.action === 'AUTO_PAID' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">โต๊ะที่ปิดบิล:</span>
                      <span className="font-black text-sm text-emerald-700">
                        {bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`}
                      </span>
                    </div>
                    {bankAlertModal.orderCount && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>จำนวนออเดอร์:</span>
                        <span className="font-bold">{bankAlertModal.orderCount} บิล</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>สถานะโต๊ะ:</span>
                      <span className="font-bold text-emerald-600">ว่าง (AVAILABLE) เคลียร์เรียบร้อย</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {bankAlertModal.orders && bankAlertModal.orders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptOrder({
                            storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
                            promptPayName: store?.promptPayName || '',
                            phone: store?.phone || '',
                            address: store?.address || '',
                            receiptFooter: store?.receiptFooter || '',
                            tableId: bankAlertModal.tableNo,
                            tableName: bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`,
                            orders: bankAlertModal.orders,
                            totalAmount: bankAlertModal.amount,
                            discountAmount: 0,
                            netAmount: bankAlertModal.amount,
                            paymentMethod: 'PROMPTPAY',
                            cashReceived: null,
                            changeAmount: 0,
                            paidAt: new Date().toISOString(),
                          });
                          setIsReceiptModalOpen(true);
                          resolveAlertAndNext(bankAlertModal.id);
                        }}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>🖨️ พิมพ์ใบเสร็จ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => resolveAlertAndNext(bankAlertModal.id)}
                      className={`py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all ${
                        !bankAlertModal.orders || bankAlertModal.orders.length === 0 ? 'col-span-2' : ''
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>รับทราบ & ปิดหน้าต่าง</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: MANUAL_CONFIRM */}
              {bankAlertModal.action === 'MANUAL_CONFIRM' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <p className="font-bold leading-relaxed">
                      พบยอดค้างชำระของ <span className="font-black text-amber-800 underline">{bankAlertModal.tableName || `โต๊ะ ${bankAlertModal.tableNo}`}</span> ตรงกับยอดเงิน ฿{bankAlertModal.amount?.toLocaleString()} พอดี
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      คลิกปุ่มด้านล่างเพื่อยืนยันการรับเงินและปิดบิลโต๊ะนี้:
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const candidate = bankAlertModal.candidates?.[0];
                        const orderIds = candidate?.orderIds || [];
                        for (const oId of orderIds) {
                          await fetch(`/api/r/${slug}/orders/${oId}/pay`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              paymentMethod: 'PROMPTPAY',
                              note: `${bankAlertModal.tableName} (โอนผ่าน ${bankAlertModal.bankName || 'Email ธนาคาร'})`,
                            }),
                          });
                        }
                        playSuccessChime();
                        if (voiceEnabled) {
                          speakMoneyReceived(bankAlertModal.amount, bankAlertModal.tableName);
                        }
                        showSuccess(`ปิดบิล ${bankAlertModal.tableName} สำเร็จแล้ว ✅`, `ยอดรับ ฿${bankAlertModal.amount}`);
                        resolveAlertAndNext(bankAlertModal.id);
                        fetchData();
                      } catch (e: any) {
                        showError('ไม่สามารถปิดบิลได้', e.message);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/25 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✅ ยืนยันตัดยอดปิดบิล ({bankAlertModal.tableName})</span>
                  </button>

                  <button
                    type="button"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                  >
                    ไม่ใช่โต๊ะนี้ / ปิดหน้าต่าง
                  </button>
                </div>
              )}

              {/* Case 3: AMBIGUOUS_CHOICE */}
              {bankAlertModal.action === 'AMBIGUOUS_CHOICE' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    มียอดค้างชำระ ฿{bankAlertModal.amount?.toLocaleString()} ตรงกัน {bankAlertModal.candidates?.length} โต๊ะ กรุณาเลือกโต๊ะที่ต้องการตัดยอดปิดบิล:
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {bankAlertModal.candidates?.map((c: any) => (
                      <button
                        key={c.tableId || c.tableNo}
                        type="button"
                        onClick={async () => {
                          try {
                            for (const orderId of c.orderIds) {
                              await fetch(`/api/r/${slug}/orders/${orderId}/pay`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  paymentMethod: 'PROMPTPAY',
                                  note: `${c.tableName} (โอนผ่าน ${bankAlertModal.bankName || 'Email ธนาคาร'})`,
                                }),
                              });
                            }
                            playSuccessChime();
                            if (voiceEnabled) {
                              speakMoneyReceived(c.totalAmount, c.tableName);
                            }
                            showSuccess(`ปิดบิล ${c.tableName} สำเร็จแล้ว ✅`, `ยอดรับ ฿${c.totalAmount}`);
                            resolveAlertAndNext(bankAlertModal.id);
                            fetchData();
                          } catch (e: any) {
                            showError('ไม่สามารถปิดบิลได้', e.message);
                          }
                        }}
                        className="w-full p-3 rounded-2xl bg-orange-50/80 hover:bg-orange-100/90 border border-orange-200/90 text-left flex items-center justify-between group transition-all cursor-pointer"
                      >
                        <div>
                          <span className="font-black text-sm text-slate-900 block">{c.tableName}</span>
                          <span className="text-xs text-slate-500 font-medium">ยอดบิล: ฿{c.totalAmount?.toLocaleString()}</span>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-sm group-hover:scale-105 transition-transform">
                          ตัดยอดโต๊ะนี้ →
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                  >
                    ปิดหน้าต่าง / ไม่ใช่โต๊ะเหล่านี้
                  </button>
                </div>
              )}

              {/* Case 4: UNMATCHED */}
              {bankAlertModal.action === 'UNMATCHED' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1">
                    <p className="font-bold leading-relaxed">
                      ได้รับเงิน ฿{bankAlertModal.amount?.toLocaleString()} เข้าบัญชีเรียบร้อยแล้ว
                    </p>
                    <p className="text-[11px] text-sky-700 leading-normal">
                      ไม่พบโต๊ะที่มียอดค้างชำระตรงกับยอดนี้ (อาจเป็นเงินโอนนอก, ลูกค้าโอนรวมหลายโต๊ะ หรือเงินทิป)
                    </p>
                  </div>

                  {/* Option to settle an existing occupied table if any */}
                  {tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING').length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-500 font-bold block">
                        หรือเลือกโต๊ะที่ต้องการนำยอดนี้ไปตัด:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {tables
                          .filter((t) => t.status === 'OCCUPIED' || t.status === 'PAYMENT_PENDING')
                          .map((t) => {
                            const tableOrders = t.orders || [];
                            const tableTotal = tableOrders.reduce((sum: number, o: any) => sum + (o.netAmount || 0), 0);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={async () => {
                                  try {
                                    for (const o of tableOrders) {
                                      await fetch(`/api/r/${slug}/orders/${o.id}/pay`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          paymentMethod: 'PROMPTPAY',
                                          note: `${t.name} (ตัดยอดจากเงินโอน ฿${bankAlertModal.amount})`,
                                        }),
                                      });
                                    }
                                    playSuccessChime();
                                    if (voiceEnabled) {
                                      speakMoneyReceived(bankAlertModal.amount, t.name);
                                    }
                                    showSuccess(`ตัดยอดปิดบิล ${t.name} สำเร็จแล้ว ✅`);
                                    resolveAlertAndNext(bankAlertModal.id);
                                    fetchData();
                                  } catch (e: any) {
                                    showError('ไม่สามารถปิดบิลได้', e.message);
                                  }
                                }}
                                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between text-xs cursor-pointer transition-colors"
                              >
                                <span className="font-bold text-slate-800">{t.name}</span>
                                <span className="font-bold text-amber-700">บิล ฿{tableTotal?.toLocaleString()} (กดตัดยอด)</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={dismissCurrentAlert}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition-all cursor-pointer"
                  >
                    รับทราบ & ปิดหน้าต่าง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Floating Action Button: รอตรวจเงินเข้า (เมื่อปิดป๊อปอัพชั่วคราวแต่ยังมีคิวค้างอยู่) */}
      {!isAlertModalOpen && bankAlertQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-bounce">
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-black text-sm shadow-2xl shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all border-2 border-white/40 cursor-pointer"
          >
            <div className="relative">
              <BellRing className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-extrabold border border-white">
                {bankAlertQueue.length}
              </span>
            </div>
            <span>รอตรวจเงินเข้า ({bankAlertQueue.length} โต๊ะ)</span>
          </button>
        </div>
      )}

      {/* 🔔 Service Call Alert Modal (ป๊อปอัพเด้งแจ้งเตือนลูกค้าเรียกพนักงาน) */}
      {isServiceCallModalOpen && currentServiceCall && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-amber-500/60 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                    <BellRing className="w-6 h-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-100 block">
                      ลูกค้ากดเรียกพนักงาน 🔔
                    </span>
                    <h3 className="text-xl font-black leading-tight">
                      {currentServiceCall.tableName || `โต๊ะ ${currentServiceCall.tableNo}`}
                    </h3>
                  </div>
                </div>

                {/* Queue count indicator */}
                <div className="flex items-center space-x-1.5">
                  {serviceCallQueue.length > 1 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/25 border border-white/40 text-white shadow-sm">
                      {activeServiceCallIndex + 1} / {serviceCallQueue.length} โต๊ะ
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsServiceCallModalOpen(false)}
                    className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    title="ปิดหน้าต่างชั่วคราว"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Highlight Service Request Box */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <span>สิ่งที่ลูกค้าต้องการ:</span>
                  </span>
                  <div className="text-lg font-black text-slate-900 leading-snug break-words">
                    {currentServiceCall.requestType}
                  </div>
                  {currentServiceCall.note && (
                    <div className="text-xs font-semibold text-slate-600 bg-white/90 p-2 rounded-xl border border-amber-200/80 mt-1">
                      💬 "{currentServiceCall.note}"
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => speakServiceCall(currentServiceCall.tableNo, currentServiceCall.requestType, currentServiceCall.note, 1.15)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer transition-colors flex-shrink-0"
                  title="ฟังเสียงพูดซ้ำ"
                >
                  <Volume2 className="w-4 h-4 text-amber-700" />
                  <span>ฟังเสียง</span>
                </button>
              </div>

              {/* Timing info */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>เวลาที่เรียก: {formatTime(new Date(currentServiceCall.timestamp).toISOString())}</span>
                </span>
                <span className="text-[11px] text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-md">
                  กำลังรอพนักงานไปบริการ
                </span>
              </div>

              {/* Navigation buttons if multiple calls */}
              {serviceCallQueue.length > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={activeServiceCallIndex <= 0}
                    onClick={() => setActiveServiceCallIndex((i) => Math.max(0, i - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    ← ดูโต๊ะก่อนหน้า
                  </button>
                  <button
                    type="button"
                    disabled={activeServiceCallIndex >= serviceCallQueue.length - 1}
                    onClick={() => setActiveServiceCallIndex((i) => Math.min(serviceCallQueue.length - 1, i + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    ดูโต๊ะถัดไป →
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* 💵 Quick Checkout button if customer called for bill */}
                {currentServiceCall.requestType.includes('เช็คบิล') && (() => {
                  const targetTable = tables.find(
                    (t: any) =>
                      t.id === currentServiceCall.tableNo ||
                      t.id === Number(currentServiceCall.tableNo) ||
                      t.tableNo === currentServiceCall.tableNo ||
                      t.tableNo === Number(currentServiceCall.tableNo) ||
                      t.name === currentServiceCall.tableName ||
                      t.name === `โต๊ะ ${currentServiceCall.tableNo}`
                  );
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        dismissServiceCall(currentServiceCall.id);
                        setIsServiceCallModalOpen(false);
                        if (targetTable) {
                          handleOpenCheckoutForTable(targetTable);
                        } else {
                          showSuccess('รับทราบการเรียกเช็คบิลแล้ว 👍', currentServiceCall.tableName);
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:to-green-700 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95 animate-pulse"
                    >
                      <Receipt className="w-5 h-5" />
                      <span>
                        💵 เปิดคิดเงิน / ปิดบิล {currentServiceCall.tableName || `โต๊ะ ${currentServiceCall.tableNo}`}
                        {targetTable?.totalAmount ? ` (฿${targetTable.totalAmount.toLocaleString()})` : ''}
                      </span>
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    const cId = currentServiceCall.id;
                    const tName = currentServiceCall.tableName;
                    dismissServiceCall(cId);
                    playSuccessChime();
                    showSuccess('รับทราบการเรียกพนักงานแล้ว 👍', tName);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>✅ รับทราบ / ไปบริการแล้ว</span>
                </button>

                {serviceCallQueue.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      dismissAllServiceCalls();
                      playSuccessChime();
                      showSuccess('รับทราบทุกโต๊ะเรียบร้อยแล้ว 👍');
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    รับทราบทั้งหมด ({serviceCallQueue.length} โต๊ะ)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsServiceCallModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  ปิดหน้าต่างชั่วคราว (ป้ายเตือนยังคงแสดงบนโต๊ะ)
                </button>

                {/* Sound Mode Quick Switcher inside Modal */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5 px-0.5">
                    <span>โหมดเสียงเตือนเรียกพนักงาน:</span>
                    <span className="text-[10px] text-amber-600 font-semibold">เตือนซ้ำทุก 20 วิ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'BOTH', label: 'พูด+กริ่ง', icon: '🔔🗣️' },
                      { id: 'VOICE_ONLY', label: 'เฉพาะพูด', icon: '🗣️' },
                      { id: 'CHIME_ONLY', label: 'เฉพาะกริ่ง', icon: '🔔' },
                      { id: 'MUTE', label: 'ปิดเสียง', icon: '🔇' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          updateServiceCallAlertMode(m.id as ServiceCallAlertMode);
                          if (m.id === 'BOTH') {
                            playServiceCallChime();
                            setTimeout(() => speakServiceCall(currentServiceCall.tableNo, currentServiceCall.requestType, '', 1.15), 650);
                          } else if (m.id === 'VOICE_ONLY') {
                            speakServiceCall(currentServiceCall.tableNo, currentServiceCall.requestType, '', 1.15);
                          } else if (m.id === 'CHIME_ONLY') {
                            playServiceCallChime();
                          }
                        }}
                        className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-[11px] font-extrabold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                          serviceCallAlertMode === m.id
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="text-xs">{m.icon}</span>
                        <span className="whitespace-nowrap leading-tight">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Floating Action Button: ลูกค้าเรียกพนักงาน (เมื่อปิดป๊อปอัพชั่วคราวแต่ยังมีค้างอยู่) */}
      {!isServiceCallModalOpen && serviceCallQueue.length > 0 && (
        <div className="fixed bottom-20 right-6 z-40 animate-bounce">
          <button
            type="button"
            onClick={() => setIsServiceCallModalOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-sm shadow-2xl shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all border-2 border-white/50 cursor-pointer"
          >
            <div className="relative">
              <BellRing className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-extrabold border border-white">
                {serviceCallQueue.length}
              </span>
            </div>
            <span>ลูกค้าเรียกพนักงาน ({serviceCallQueue.length} โต๊ะ)</span>
          </button>
        </div>
      )}

      {/* Receipt Print Modal */}
      {isReceiptModalOpen && receiptOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={receiptOrder}
          store={store}
        />
      )}
    </div>
  );
}

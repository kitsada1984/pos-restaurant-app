'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
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
  BellRing,
  Volume2,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';
import { playOrderChime, playSuccessChime, playServiceCallChime, speakServiceCall } from '@/lib/sound';
import { generatePromptPayPayload } from '@/lib/promptpay';

export default function PosPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'PAYMENT_PENDING'>('ALL');

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

  // Print Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Add Table Modal
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  // Service Call Queue & Alert States
  interface ServiceCallItem {
    id: string;
    tableNo: number;
    tableName: string;
    requestType: string;
    note?: string;
    timestamp: number;
  }
  const [serviceCallQueue, setServiceCallQueue] = useState<ServiceCallItem[]>([]);
  const [activeServiceCallIndex, setActiveServiceCallIndex] = useState<number>(0);
  const [isServiceCallModalOpen, setIsServiceCallModalOpen] = useState<boolean>(false);
  const [activeServiceCalls, setActiveServiceCalls] = useState<{ [tableKey: string]: { requestType: string; timestamp: number } }>({});

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

  const dismissServiceCall = (callId: string) => {
    setServiceCallQueue((prev) => {
      const call = prev.find((c) => c.id === callId);
      if (call) {
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
    setActiveServiceCalls({});
    setServiceCallQueue([]);
    setIsServiceCallModalOpen(false);
    setActiveServiceCallIndex(0);
  };

  const fetchData = async () => {
    try {
      const [tablesRes, menuRes, settingsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/menu'),
        fetch('/api/settings'),
      ]);
      const [tData, mData, sData] = await Promise.all([
        tablesRes.json().catch(() => []),
        menuRes.json().catch(() => []),
        settingsRes.json().catch(() => null),
      ]);
      setTables(Array.isArray(tData) ? tData : []);
      setCategories(Array.isArray(mData) ? mData : []);
      setStore(sData?.error ? null : sData);

      if (selectedTable && Array.isArray(tData)) {
        const updated = tData.find((t: any) => t.id === selectedTable.id);
        if (updated) setSelectedTable(updated);
      }
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Redirect to tenant responsive route if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split('; ').reduce((acc: any, c) => {
        const [k, v] = c.split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});
      const targetSlug = cookies['last_store_slug'];
      if (targetSlug) {
        window.location.replace(`/r/${targetSlug}/pos`);
        return;
      }
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((d) => {
          if (d?.user?.storeSlug) {
            window.location.replace(`/r/${d.user.storeSlug}/pos`);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchData();

    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource('/api/realtime/stream');
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'SERVICE_CALLED') {
              const d = payload.data;
              playServiceCallChime();
              speakServiceCall(d.tableNo, d.requestType, d.note);
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
              payload.type === 'TABLE_UPDATED' ||
              payload.type === 'PAYMENT_RECEIVED'
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

    return () => {
      eventSource?.close();
    };
  }, [selectedTable?.id]);

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
    if (!searchMenu.trim()) return allMenuItems;
    return allMenuItems.filter((i) =>
      i?.name?.toLowerCase().includes(searchMenu.toLowerCase())
    );
  }, [allMenuItems, searchMenu]);

  const filteredTables = useMemo(() => {
    const safeT = Array.isArray(tables) ? tables : [];
    if (statusFilter === 'ALL') return safeT;
    return safeT.filter((t) => t?.status === statusFilter);
  }, [tables, statusFilter]);

  const handleOpenDish = (item: any) => {
    if (!item.isAvailable) return;
    setSelectedMenuItem(item);
    setDishQuantity(1);
    setSpecialNote('');
    const initialOptions: { [key: string]: any[] } = {};
    if (item.options) {
      item.options.forEach((g: any) => {
        if (g.isRequired && g.choices?.length > 0) {
          initialOptions[g.title] = [{ name: g.choices[0].name, extraPrice: g.choices[0].extraPrice }];
        } else {
          initialOptions[g.title] = [];
        }
      });
    }
    setSelectedOptions(initialOptions);
  };

  const handleAddToCashierCart = () => {
    if (!selectedMenuItem) return;
    let extra = 0;
    const formattedOptionsList: any[] = [];
    Object.entries(selectedOptions).forEach(([groupTitle, choices]) => {
      choices.forEach((c) => {
        extra += c.extraPrice;
        formattedOptionsList.push({ group: groupTitle, choice: c.name, extraPrice: c.extraPrice });
      });
    });

    const item = {
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: selectedMenuItem.basePrice + extra,
      quantity: dishQuantity,
      selectedOptions: formattedOptionsList,
      specialNote: specialNote.trim(),
    };

    setCashierCart((prev) => [...prev, item]);
    setSelectedMenuItem(null);
  };

  const handleSubmitCashierOrder = async () => {
    if (cashierCart.length === 0 || !selectedTable) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTable.id,
          orderType: 'DINE_IN',
          items: cashierCart,
        }),
      });

      if (res.ok) {
        setCashierCart([]);
        setIsCashierOrderOpen(false);
        playOrderChime();
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveTable = async () => {
    if (!selectedTable || !targetTableId) return;
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_TABLE',
          fromTableId: selectedTable.id,
          toTableId: targetTableId,
        }),
      });
      if (res.ok) {
        setIsMoveModalOpen(false);
        setTargetTableId('');
        fetchData();
        setSelectedTable(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMergeTable = async () => {
    if (!selectedTable || !targetTableId) return;
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MERGE_TABLES',
          sourceTableId: selectedTable.id,
          targetTableId: targetTableId,
        }),
      });
      if (res.ok) {
        setIsMergeModalOpen(false);
        setTargetTableId('');
        fetchData();
        setSelectedTable(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim()) return;
    setIsCreatingTable(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_TABLE',
          id: newTableId ? parseInt(newTableId, 10) : undefined,
          name: newTableName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างโต๊ะ');
      } else {
        setNewTableName('');
        setNewTableId('');
        setIsAddTableModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsCreatingTable(false);
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm(`ต้องการลบโต๊ะ ${tableId} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_TABLE',
          tableId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ไม่สามารถลบโต๊ะได้');
      } else {
        setSelectedTable(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleClearTable = async (tableId: number) => {
    if (!confirm(`ต้องการเคลียร์โต๊ะ ${tableId} ให้เป็นสถานะว่างใช่หรือไม่?`)) return;
    try {
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_TABLE', tableId, cancelUnpaid: true }),
      });
      setSelectedTable(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedTable || selectedTable.activeOrders.length === 0) return;
    setIsProcessingPay(true);
    try {
      const firstOrder = selectedTable.activeOrders[0];
      const netTotal = Math.max(0, selectedTable.totalAmount - discountAmount);

      const res = await fetch(`/api/orders/${firstOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) || netTotal : null,
          discountAmount,
          payAllTableOrders: true,
        }),
      });

      if (res.ok) {
        playSuccessChime();

        const allItems: any[] = [];
        selectedTable.activeOrders.forEach((o: any) => {
          allItems.push(...o.items);
        });

        const receiptObj = {
          id: firstOrder.id,
          tableId: selectedTable.id,
          table: { name: selectedTable.name },
          totalAmount: selectedTable.totalAmount,
          discountAmount: discountAmount,
          netAmount: netTotal,
          paymentMethod,
          cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) || netTotal : null,
          changeAmount: paymentMethod === 'CASH' ? Math.max(0, (parseFloat(cashReceived) || netTotal) - netTotal) : 0,
          paidAt: new Date().toISOString(),
          items: allItems,
        };

        setReceiptOrder(receiptObj);
        setIsPayModalOpen(false);
        setIsReceiptModalOpen(true);
        setSelectedTable(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingPay(false);
    }
  };

  const posPromptPayPayload = useMemo(() => {
    if (!selectedTable || !store?.promptPayId) return '';
    const net = Math.max(0, selectedTable.totalAmount - discountAmount);
    return generatePromptPayPayload(store.promptPayId, net);
  }, [selectedTable, store, discountAmount]);

  const netPayAmount = selectedTable ? Math.max(0, selectedTable.totalAmount - discountAmount) : 0;
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, numCashReceived - netPayAmount);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* POS Top Control Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 sticky top-16 sm:top-20 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Title & Stats */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 leading-tight">
                ผังโต๊ะอาหาร & แคชเชียร์
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                แตะที่โต๊ะเพื่อดูบิล สั่งอาหาร ย้ายโต๊ะ หรือรับชำระเงิน
              </p>
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({tables.length})
              </button>
              <button
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                โต๊ะว่าง ({tables.filter((t) => t.status === 'AVAILABLE').length})
              </button>
              <button
                onClick={() => setStatusFilter('OCCUPIED')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'OCCUPIED'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                กำลังทาน ({tables.filter((t) => t.status === 'OCCUPIED').length})
              </button>
              <button
                onClick={() => setStatusFilter('PAYMENT_PENDING')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'PAYMENT_PENDING'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                รอเช็คบิล ({tables.filter((t) => t.status === 'PAYMENT_PENDING').length})
              </button>
            </div>

            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
              title="รีเฟรชสถานะ"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const existingIds = new Set(tables.map((t) => t.id));
                let nextId = 1;
                while (existingIds.has(nextId)) {
                  nextId++;
                }
                setNewTableId(String(nextId));
                setNewTableName(`โต๊ะ ${nextId}`);
                setIsAddTableModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-sm transition-all whitespace-nowrap active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มโต๊ะ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 10 Tables Grid */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs text-slate-400 font-semibold">กำลังโหลดผังโต๊ะ...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
              <LayoutGrid className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">ยังไม่มีข้อมูลผังโต๊ะ</h3>
              <p className="text-xs text-slate-500 mt-1">กดปุ่มด้านล่างเพื่อสร้างผังโต๊ะ 1-10 และเมนูอาหารเริ่มต้นทันที</p>
            </div>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await fetch('/api/tables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'SEED_DEFAULTS' }),
                  });
                } catch (e) {}
                await fetchData();
              }}
              className="px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            >
              + สร้างโต๊ะ 1-10 & เมนูอาหารเริ่มต้นทันที
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredTables.map((table) => {
              const isAvailable = table.status === 'AVAILABLE';
              const isPendingPayment = table.status === 'PAYMENT_PENDING';
              const isOccupied = table.status === 'OCCUPIED';

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`relative rounded-3xl p-5 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between h-52 group ${
                    isAvailable
                      ? 'bg-white border-emerald-200/80 hover:border-emerald-500 shadow-sm hover:shadow-lg'
                      : isPendingPayment
                      ? 'bg-amber-50 border-amber-400 shadow-md ring-4 ring-amber-400/20 animate-pulse'
                      : 'bg-orange-50/70 border-orange-300 hover:border-orange-500 shadow-sm hover:shadow-lg'
                  }`}
                >
                  {/* Table Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPendingPayment
                            ? 'bg-amber-500 text-white'
                            : 'bg-orange-500 text-white'
                        }`}
                      >
                        {table.id}
                      </span>
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                          {table.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {table.activeOrdersCount > 0 ? `${table.activeOrdersCount} รอบสั่ง` : 'โต๊ะว่าง'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPendingPayment
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-orange-200 text-orange-950'
                      }`}
                    >
                      {isAvailable && 'ว่าง'}
                      {isPendingPayment && 'รอเช็คบิล'}
                      {isOccupied && 'มีลูกค้า'}
                    </span>
                  </div>

                  {/* Active Service Call Badge on Table Card */}
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
                      }}
                      className="my-1.5 p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-950 text-[11px] font-bold flex items-center justify-between gap-1 animate-pulse hover:bg-amber-500/30 transition-all cursor-pointer shadow-xs"
                      title="กดเพื่อรับทราบและปิดการแจ้งเตือน"
                    >
                      <span className="flex items-center gap-1 truncate">
                        <BellRing className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-bounce" />
                        <span className="truncate">เรียก: {activeServiceCalls[String(table.tableNo || table.id)].requestType}</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-black flex-shrink-0 hover:bg-amber-600">
                        รับทราบ ✓
                      </span>
                    </div>
                  )}

                  {/* Middle Content */}
                  <div className="my-2">
                    {!isAvailable ? (
                      <div className="space-y-1 bg-white/70 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-200/60 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">จำนวนอาหาร:</span>
                          <span className="font-extrabold text-slate-900">{table.totalItems} จาน</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>เริ่มนั่ง:</span>
                          <span>{table.firstOrderAt ? formatTime(table.firstOrderAt) : '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                        พร้อมเปิดโต๊ะ
                      </div>
                    )}
                  </div>

                  {/* Footer Amount */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">ยอดบิล</span>
                    <span
                      className={`font-black text-base ${
                        isAvailable ? 'text-slate-400' : 'text-orange-600'
                      }`}
                    >
                      {formatPrice(table.totalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* SELECTED TABLE DRAWER (Modern Sliding Sheet) */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md sm:max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20">
                  {selectedTable.id}
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-900">{selectedTable.name}</h2>
                  <span className="text-xs text-slate-500 font-semibold">
                    สถานะปัจจุบัน:{' '}
                    <strong className="text-orange-600">
                      {selectedTable.status === 'AVAILABLE'
                        ? 'ว่าง'
                        : selectedTable.status === 'PAYMENT_PENDING'
                        ? 'รอเช็คบิล'
                        : 'กำลังทาน'}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-3 gap-2 bg-white">
              <button
                onClick={() => {
                  setCashierCart([]);
                  setIsCashierOrderOpen(true);
                }}
                className="p-3 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 hover:bg-orange-100 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                <span>สั่งอาหารเพิ่ม</span>
              </button>

              <button
                disabled={selectedTable.activeOrdersCount === 0}
                onClick={() => setIsMoveModalOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 hover:bg-slate-100 transition-all disabled:opacity-30 active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                <span>ย้ายโต๊ะ</span>
              </button>

              <button
                disabled={selectedTable.activeOrdersCount === 0}
                onClick={() => setIsMergeModalOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 hover:bg-slate-100 transition-all disabled:opacity-30 active:scale-95"
              >
                <Merge className="w-4 h-4 text-slate-600" />
                <span>รวมโต๊ะ</span>
              </button>
            </div>

            {/* Orders List Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {selectedTable.activeOrders?.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">ยังไม่มีรายการสั่งอาหารที่โต๊ะนี้</p>
                  <button
                    onClick={() => {
                      setCashierCart([]);
                      setIsCashierOrderOpen(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow"
                  >
                    เปิดออเดอร์หน้าร้าน
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTable.activeOrders?.map((order: any, oIdx: number) => (
                    <div key={order.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                        <span className="font-extrabold text-slate-800">
                          รอบที่ #{oIdx + 1} ({formatTime(order.createdAt)})
                        </span>
                        <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                          {order.status}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {order.items?.map((item: any, iIdx: number) => {
                          let opts: any[] = [];
                          try {
                            if (item.selectedOptions) {
                              opts = typeof item.selectedOptions === 'string'
                                ? JSON.parse(item.selectedOptions)
                                : item.selectedOptions;
                            }
                          } catch {}

                          return (
                            <div key={iIdx} className="py-2 flex items-start justify-between text-xs">
                              <div className="flex-1 pr-2">
                                <span className="font-bold text-slate-900">
                                  {item.name} <span className="text-orange-600">x{item.quantity}</span>
                                </span>
                                {opts && opts.length > 0 && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {opts.map((o: any, idx: number) => (
                                      <span key={idx} className="mr-1.5">
                                        • {o.choice || o.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.specialNote && (
                                  <div className="text-[11px] text-orange-600 italic mt-0.5">
                                    *{item.specialNote}
                                  </div>
                                )}
                              </div>
                              <span className="font-black text-slate-900">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer & Checkout Button */}
            <div className="p-5 border-t border-slate-100 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">ยอดรวมสุทธิ</span>
                  <span className="text-2xl font-black text-orange-600">
                    {formatPrice(selectedTable.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {selectedTable.activeOrdersCount === 0 && (
                    <button
                      onClick={() => handleDeleteTable(selectedTable.id)}
                      className="px-3 py-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold flex items-center space-x-1 transition-colors"
                      title="ลบโต๊ะนี้ออกจากผัง"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>ลบโต๊ะ</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleClearTable(selectedTable.id)}
                    className="px-3 py-2 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <span>เคลียร์โต๊ะ</span>
                  </button>
                </div>
              </div>

              <button
                disabled={selectedTable.activeOrdersCount === 0}
                onClick={() => {
                  setPaymentMethod('PROMPTPAY');
                  setCashReceived('');
                  setDiscountAmount(0);
                  setIsPayModalOpen(true);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
              >
                <CreditCard className="w-5 h-5" />
                <span>เช็คบิล / รับชำระเงิน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASHIER QUICK ORDER MODAL */}
      {isCashierOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="font-extrabold text-base text-slate-900">
                  สั่งอาหารหน้าร้าน (โต๊ะ {selectedTable?.id})
                </h3>
              </div>
              <button onClick={() => setIsCashierOrderOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Menu list */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchMenu}
                    onChange={(e) => setSearchMenu(e.target.value)}
                    placeholder="ค้นหาเมนู..."
                    className="w-full bg-slate-50 pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDish(item)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        item.isAvailable
                          ? 'border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 shadow-sm'
                          : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{item.name}</span>
                        <span className="text-[11px] text-orange-600 font-extrabold">{formatPrice(item.basePrice)}</span>
                      </div>
                      <Plus className="w-4 h-4 text-orange-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Basket */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-700 mb-2">
                    รายการที่จะส่งเข้าครัว ({cashierCart.length})
                  </h4>
                  {cashierCart.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-12">ยังไม่มีเมนูในรายการ</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cashierCart.map((cItem, cIdx) => (
                        <div key={cIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{cItem.name} x {cItem.quantity}</span>
                            {cItem.selectedOptions?.map((o: any, oIdx: number) => (
                              <span key={oIdx} className="text-[10px] text-slate-500 block">• {o.choice}</span>
                            ))}
                            <span className="text-orange-600 font-bold block mt-0.5">{formatPrice(cItem.price * cItem.quantity)}</span>
                          </div>
                          <button
                            onClick={() => setCashierCart((prev) => prev.filter((_, i) => i !== cIdx))}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 mt-2 space-y-2">
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-600">ยอดรวม:</span>
                    <span className="text-orange-600 text-base">
                      {formatPrice(cashierCart.reduce((s, i) => s + i.price * i.quantity, 0))}
                    </span>
                  </div>
                  <button
                    disabled={cashierCart.length === 0}
                    onClick={handleSubmitCashierOrder}
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md disabled:opacity-40"
                  >
                    ยืนยันส่งครัว
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISH CUSTOMIZE MODAL FOR CASHIER */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">{selectedMenuItem.name}</h3>
              <button onClick={() => setSelectedMenuItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {selectedMenuItem.options?.map((group: any) => (
                <div key={group.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 block mb-1.5">{group.title}</span>
                  <div className="space-y-1">
                    {group.choices?.map((choice: any) => {
                      const isSelected = selectedOptions[group.title]?.some((c) => c.name === choice.name);
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => {
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [group.title]: [{ name: choice.name, extraPrice: choice.extraPrice }],
                            }));
                          }}
                          className={`w-full p-2 rounded-lg flex items-center justify-between text-left text-xs font-semibold ${
                            isSelected ? 'bg-orange-500 text-white font-bold' : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span>{choice.name}</span>
                          <span>{choice.extraPrice > 0 ? `+${choice.extraPrice}` : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ:</label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold">จำนวน:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDishQuantity(Math.max(1, dishQuantity - 1))}
                    className="w-8 h-8 bg-slate-100 rounded-lg font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{dishQuantity}</span>
                  <button
                    onClick={() => setDishQuantity(dishQuantity + 1)}
                    className="w-8 h-8 bg-slate-100 rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddToCashierCart}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs shadow hover:bg-orange-600"
            >
              เพิ่มลงรายการ
            </button>
          </div>
        </div>
      )}

      {/* MOVE TABLE MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">ย้ายโต๊ะ</h3>
              <button onClick={() => setIsMoveModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              ย้ายรายการทั้งหมดจาก <strong>{selectedTable?.name}</strong> ไปยังโต๊ะว่าง:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {tables
                .filter((t) => t.id !== selectedTable?.id && t.status === 'AVAILABLE')
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTargetTableId(t.id)}
                    className={`py-3 rounded-2xl font-black text-sm border ${
                      targetTableId === t.id
                        ? 'bg-orange-500 text-white border-orange-500 shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
            </div>
            <button
              disabled={!targetTableId}
              onClick={handleMoveTable}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs disabled:opacity-40 shadow"
            >
              ยืนยันการย้ายโต๊ะ
            </button>
          </div>
        </div>
      )}

      {/* MERGE TABLE MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">รวมโต๊ะ</h3>
              <button onClick={() => setIsMergeModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              รวมบิลจาก <strong>{selectedTable?.name}</strong> เข้ากับโต๊ะอื่น:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {tables
                .filter((t) => t.id !== selectedTable?.id && t.status !== 'AVAILABLE')
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTargetTableId(t.id)}
                    className={`py-3 rounded-2xl font-black text-sm border ${
                      targetTableId === t.id
                        ? 'bg-orange-500 text-white border-orange-500 shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
            </div>
            <button
              disabled={!targetTableId}
              onClick={handleMergeTable}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs disabled:opacity-40 shadow"
            >
              ยืนยันการรวมโต๊ะ
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT & PAYMENT MODAL */}
      {isPayModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">เช็คบิลและรับชำระเงิน</h3>
                <p className="text-xs text-slate-500">{selectedTable.name} • {selectedTable.totalItems} รายการ</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setPaymentMethod('PROMPTPAY')}
                className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMethod === 'PROMPTPAY'
                    ? 'bg-white text-[#113566] shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#113566]" />
                <span>สแกน PromptPay</span>
              </button>

              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>เงินสด (Cash)</span>
              </button>
            </div>

            {/* PromptPay View */}
            {paymentMethod === 'PROMPTPAY' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center space-y-2">
                <div className="w-full bg-[#113566] text-white py-1 px-3 rounded-lg text-xs font-extrabold mb-1 flex items-center justify-center">
                  <span>พร้อมเพย์ • PromptPay QR</span>
                </div>
                {posPromptPayPayload ? (
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <QRCodeSVG value={posPromptPayPayload} size={160} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-10">ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์</p>
                )}
                <span className="text-xs text-slate-600 font-semibold">
                  {store?.promptPayName} ({store?.promptPayId})
                </span>
              </div>
            )}

            {/* Cash View */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนเงินสดที่รับมา (บาท):
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={`ยอดที่ต้องจ่าย ${netPayAmount}`}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-base font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex space-x-2">
                  {[netPayAmount, 100, 500, 1000].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashReceived(amt.toString())}
                      className="flex-1 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {amt}฿
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
                  <span className="text-xs font-bold">เงินทอน (Change):</span>
                  <span className="text-lg font-black">{formatPrice(changeDue)}</span>
                </div>
              </div>
            )}

            {/* Special Discount */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-600">ส่วนลดพิเศษ (บาท):</span>
              <input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs text-right font-bold"
              />
            </div>

            {/* Total Pay */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">ยอดชำระสุทธิ:</span>
              <span className="text-2xl font-black text-orange-600">{formatPrice(netPayAmount)}</span>
            </div>

            <button
              disabled={isProcessingPay}
              onClick={handleProcessPayment}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>ยืนยันการรับเงิน & ปิดบิล</span>
            </button>
          </div>
        </div>
      )}

      {/* ADD NEW TABLE MODAL */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <LayoutGrid className="w-5 h-5 text-orange-500" />
                <span>เพิ่มโต๊ะอาหารใหม่</span>
              </h3>
              <button onClick={() => setIsAddTableModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเลขโต๊ะ (ID):
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={newTableId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTableId(val);
                    if (newTableName.startsWith('โต๊ะ ') || !newTableName.trim()) {
                      setNewTableName(`โต๊ะ ${val}`);
                    }
                  }}
                  placeholder="เช่น 11, 12, 20"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโต๊ะ:
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="เช่น โต๊ะ 11, VIP 1, หน้าร้าน 2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>

              <div className="text-right">
                <a
                  href="/admin/tables"
                  className="text-[11px] font-bold text-orange-600 hover:underline"
                >
                  ⚙️ จัดการผังโต๊ะ & เพิ่มทีเดียวหลายโต๊ะ
                </a>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isCreatingTable || !newTableName.trim()}
                onClick={handleCreateTable}
                className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
              >
                {isCreatingTable ? 'กำลังสร้าง...' : '+ ยืนยันเพิ่มโต๊ะ'}
              </button>
            </div>
          </div>
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
                  onClick={() => speakServiceCall(currentServiceCall.tableNo, currentServiceCall.requestType, currentServiceCall.note)}
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
                <button
                  type="button"
                  onClick={() => {
                    dismissServiceCall(currentServiceCall.id);
                    playSuccessChime();
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Floating Action Button: ลูกค้าเรียกพนักงาน (เมื่อปิดป๊อปอัพชั่วคราวแต่ยังมีค้างอยู่) */}
      {!isServiceCallModalOpen && serviceCallQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-bounce">
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

      {/* RECEIPT MODAL */}
      <ReceiptPrintModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        order={receiptOrder}
        store={store}
      />
    </div>
  );
}

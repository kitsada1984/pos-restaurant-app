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
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';
import { playOrderChime, playSuccessChime } from '@/lib/sound';
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

  const fetchData = async () => {
    try {
      const [tablesRes, menuRes, settingsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/menu'),
        fetch('/api/settings'),
      ]);
      const [tData, mData, sData] = await Promise.all([
        tablesRes.json(),
        menuRes.json(),
        settingsRes.json(),
      ]);
      setTables(tData || []);
      setCategories(mData || []);
      setStore(sData);

      if (selectedTable) {
        const updated = tData.find((t: any) => t.id === selectedTable.id);
        if (updated) setSelectedTable(updated);
      }
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const eventSource = new EventSource('/api/realtime/stream');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'ORDER_CREATED' ||
          payload.type === 'ORDER_UPDATED' ||
          payload.type === 'TABLE_UPDATED' ||
          payload.type === 'PAYMENT_RECEIVED'
        ) {
          fetchData();
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, [selectedTable?.id]);

  const allMenuItems = useMemo(() => {
    const list: any[] = [];
    categories.forEach((cat) => {
      cat.items?.forEach((item: any) => {
        list.push({ ...item, categoryName: cat.name });
      });
    });
    return list;
  }, [categories]);

  const filteredMenuItems = useMemo(() => {
    if (!searchMenu.trim()) return allMenuItems;
    return allMenuItems.filter((i) =>
      i.name.toLowerCase().includes(searchMenu.toLowerCase())
    );
  }, [allMenuItems, searchMenu]);

  const filteredTables = useMemo(() => {
    if (statusFilter === 'ALL') return tables;
    return tables.filter((t) => t.status === statusFilter);
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

                <button
                  onClick={() => handleClearTable(selectedTable.id)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center space-x-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>เคลียร์โต๊ะ</span>
                </button>
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

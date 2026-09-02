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
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';
import { playOrderChime, playSuccessChime } from '@/lib/sound';
import { generatePromptPayPayload } from '@/lib/promptpay';

export default function PosTerminal({ slug = 'lung-pa' }: { slug?: string }) {
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

  // Enterprise Loyalty & Promo Checkout States
  const [memberPhone, setMemberPhone] = useState('');
  const [memberData, setMemberData] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  // Print Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Add Table Modal
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const fetchData = async () => {
    try {
      const [tablesRes, menuRes, settingsRes] = await Promise.all([
        fetch(`/api/r/${slug}/tables`),
        fetch(`/api/r/${slug}/menu`),
        fetch(`/api/r/${slug}/settings`),
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
        const updated = tData.find((t: any) => t.id === selectedTable.id || t.tableNo === selectedTable.tableNo);
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

    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource(`/api/r/${slug}/stream`);
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
        eventSource.onerror = () => {
          eventSource?.close();
        };
      }
    } catch (e) {}

    return () => {
      eventSource?.close();
    };
  }, [slug, selectedTable?.id]);

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

  const handleSubmitCashierOrder = async () => {
    if (!selectedTable || cashierCart.length === 0) return;
    try {
      const res = await fetch(`/api/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTable.id || selectedTable.tableNo,
          items: cashierCart,
          orderType: 'DINE_IN',
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
        setIsMoveModalOpen(false);
        setTargetTableId('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Member Lookup
  const handleLookupMember = async (phone: string) => {
    setMemberPhone(phone);
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 9) {
      try {
        const res = await fetch(`/api/r/${slug}/members?phone=${clean}`);
        const data = await res.json();
        if (data.member) {
          setMemberData(data.member);
        } else {
          setMemberData(null);
        }
      } catch (e) {
        setMemberData(null);
      }
    } else {
      setMemberData(null);
      setPointsToRedeem(0);
    }
  };

  // Handle Promo Code Apply
  const handleApplyPromo = async () => {
    if (!promoCodeInput) return;
    try {
      const res = await fetch(`/api/r/${slug}/promotions?code=${promoCodeInput}&amount=${rawTotalAmount}`);
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo(data.promo);
      } else {
        alert(data.error || 'โค้ดส่วนลดไม่ถูกต้อง');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการตรวจสอบโค้ด');
    }
  };

  // Handle Payment Calculations
  const activeOrders = selectedTable?.activeOrders || [];
  const rawTotalAmount = activeOrders.reduce((sum: number, o: any) => sum + o.netAmount, 0);
  
  const promoDiscount = appliedPromo?.calculatedDiscount || 0;
  const pointDiscount = pointsToRedeem * (store?.pointValue || 1);
  const totalCombinedDiscount = (discountAmount || 0) + promoDiscount + pointDiscount;
  const finalNetAmount = Math.max(0, rawTotalAmount - totalCombinedDiscount);

  const change =
    paymentMethod === 'CASH' && cashReceived
      ? parseFloat(cashReceived) - finalNetAmount
      : 0;

  const handleProcessPayment = async () => {
    if (!selectedTable || activeOrders.length === 0) return;
    setIsProcessingPay(true);
    try {
      for (const order of activeOrders) {
        await fetch(`/api/r/${slug}/orders/${order.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod,
            cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : null,
            changeAmount: paymentMethod === 'CASH' ? Math.max(0, change) : 0,
            memberPhone: memberPhone || null,
            pointsRedeemed: pointsToRedeem || 0,
            promoCode: appliedPromo?.code || null,
            discountAmount: totalCombinedDiscount,
          }),
        });
      }

      playSuccessChime();

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
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : null,
        changeAmount: paymentMethod === 'CASH' ? Math.max(0, change) : 0,
        paidAt: new Date().toISOString(),
      });

      setIsPayModalOpen(false);
      setIsReceiptModalOpen(true);
      setSelectedTable(null);
      setCashReceived('');
      setDiscountAmount(0);
      setMemberPhone('');
      setMemberData(null);
      setPointsToRedeem(0);
      setPromoCodeInput('');
      setAppliedPromo(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingPay(false);
    }
  };

  // Generate PromptPay QR Payload for Checkout
  const promptPayQrPayload = useMemo(() => {
    if (!store?.promptPayId || finalNetAmount <= 0) return '';
    return generatePromptPayPayload(store.promptPayId, finalNetAmount);
  }, [store?.promptPayId, finalNetAmount]);

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
      {/* Top Header & Table Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              ผังโต๊ะ &amp; แคชเชียร์ (POS)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-black bg-orange-100 text-orange-700">
              {tables.length} โต๊ะ
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • กำลังทาน{' '}
            <span className="text-orange-600 font-bold">{totalOccupied} โต๊ะ</span> • ว่าง{' '}
            <span className="text-emerald-600 font-bold">{totalAvailable} โต๊ะ</span>
          </p>
        </div>

        {/* Filter Pills & Add Table Button - Full Width on Mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'OCCUPIED', label: `กำลังทาน (${totalOccupied})`, activeClass: 'bg-orange-500 text-white shadow-sm' },
              { id: 'AVAILABLE', label: `ว่าง (${totalAvailable})`, activeClass: 'bg-emerald-500 text-white shadow-sm' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`py-2 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center truncate ${
                  statusFilter === f.id
                    ? f.activeClass || 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const highestNo = tables.reduce((max, t) => Math.max(max, t.tableNo || t.id || 0), 0);
              setNewTableId(String(highestNo + 1));
              setNewTableName(`โต๊ะ ${highestNo + 1}`);
              setIsAddTableModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 flex items-center justify-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มโต๊ะ</span>
          </button>
        </div>
      </div>

      {/* Tables Grid - Full Width matching Header on Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 auto-rows-fr w-full">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'OCCUPIED' || table.activeOrdersCount > 0;
          const isSelected = selectedTable?.id === table.id || selectedTable?.tableNo === table.tableNo;

          return (
            <div
              key={table.tableNo || table.id}
              onClick={() => setSelectedTable(table)}
              className={`relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group w-full min-h-[90px] sm:min-h-[150px] ${
                isSelected
                  ? 'ring-4 ring-orange-500/30 border-orange-500 shadow-xl bg-white scale-[1.01]'
                  : isOccupied
                  ? 'bg-gradient-to-br from-white to-orange-50/40 border-orange-200/90 shadow-sm hover:shadow-md hover:border-orange-400'
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300'
              }`}
            >
              {/* Card Content (Responsive for 1 col on mobile & grid on desktop) */}
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-lg flex-shrink-0 ${
                    isOccupied ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {table.tableNo || table.id}
                  </div>
                  <div className="truncate">
                    <span className="text-base sm:text-lg font-black text-slate-900 block truncate">{table.name}</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOccupied ? 'bg-orange-500 animate-pulse' : 'bg-emerald-400'}`} />
                      <span className={`text-[11px] sm:text-xs font-bold truncate ${isOccupied ? 'text-orange-700' : 'text-emerald-600'}`}>
                        {isOccupied ? `${table.totalItems || 0} รายการ` : 'โต๊ะว่าง'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end flex-shrink-0">
                  {isOccupied ? (
                    <div className="text-base sm:text-lg font-black text-slate-900">
                      ฿{(table.totalAmount || 0).toLocaleString()}
                    </div>
                  ) : null}
                  <span className="text-[11px] sm:text-xs font-bold text-orange-600 group-hover:underline flex items-center gap-1 mt-0.5">
                    <span>{isOccupied ? 'เปิดดู / คิดเงิน' : 'สั่งอาหาร'}</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Table Drawer / Action Bar */}
      {selectedTable && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-slate-900 text-white p-4 sm:p-6 shadow-2xl border-t border-slate-800 backdrop-blur-xl bg-opacity-95">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/30">
                {selectedTable.tableNo || selectedTable.id}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-white">{selectedTable.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-orange-400 border border-slate-700">
                    {selectedTable.status === 'OCCUPIED' ? 'กำลังทาน' : 'โต๊ะว่าง'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTable.activeOrdersCount > 0
                    ? `${selectedTable.totalItems} รายการ • รวม ฿${(selectedTable.totalAmount || 0).toLocaleString()}`
                    : 'ยังไม่มีออเดอร์ สามารถกด + เพิ่มออเดอร์หน้าร้านได้'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsCashierOrderOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center space-x-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ สั่งอาหารหน้าร้าน</span>
              </button>

              {selectedTable.activeOrdersCount > 0 && (
                <>
                  <button
                    onClick={() => setIsMoveModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center space-x-1.5 transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้ายโต๊ะ</span>
                  </button>

                  <button
                    onClick={() => setIsPayModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 transition-all"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>เช็คบิล (฿{(selectedTable.totalAmount || 0).toLocaleString()})</span>
                  </button>
                </>
              )}

              <Link
                href={`/r/${slug}/table/${selectedTable.tableNo || selectedTable.id}`}
                target="_blank"
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center space-x-1 transition-all"
              >
                <span>หน้าลูกค้า</span>
                <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
              </Link>

              <button
                onClick={() => setSelectedTable(null)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Add Order Modal */}
      {isCashierOrderOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black">สั่งอาหารหน้าร้าน — {selectedTable?.name}</h3>
                <p className="text-xs text-slate-400">เลือกเมนูและกดเพิ่มลงตะกร้าเพื่อส่งเข้าห้องครัวทันที</p>
              </div>
              <button
                onClick={() => setIsCashierOrderOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block">{item.name}</span>
                        <span className="text-[11px] text-slate-400">{item.categoryName}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
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

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
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
                  <div className="flex justify-between font-black text-sm text-slate-900">
                    <span>รวมทั้งหมด:</span>
                    <span className="text-orange-600">
                      ฿{cashierCart.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()}
                    </span>
                  </div>

                  <button
                    disabled={cashierCart.length === 0}
                    onClick={handleSubmitCashierOrder}
                    className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
                  >
                    ส่งออเดอร์เข้าครัวทันที 🍳
                  </button>
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
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Enterprise Loyalty Member Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  สมาชิกสะสมแต้ม (เบอร์โทร)
                </span>
                {memberData && (
                  <span className="text-[11px] font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md">
                    มี {memberData.points} แต้ม (฿{memberData.points * (store?.pointValue || 1)})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="เช่น 0899998888"
                  value={memberPhone}
                  onChange={(e) => handleLookupMember(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
                {memberData && memberData.points > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (pointsToRedeem > 0) {
                        setPointsToRedeem(0);
                      } else {
                        // Max redeemable
                        const maxPoints = Math.min(memberData.points, Math.floor(rawTotalAmount / (store?.pointValue || 1)));
                        setPointsToRedeem(maxPoints);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      pointsToRedeem > 0
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    {pointsToRedeem > 0 ? `แลก ฿${pointsToRedeem * (store?.pointValue || 1)} ✓` : 'แลกแต้มส่วนลด'}
                  </button>
                )}
              </div>
              {memberData && (
                <div className="text-[11px] text-slate-500">
                  ลูกค้า: <strong>{memberData.name || 'สมาชิก'}</strong> • จะได้รับแต้มเพิ่ม{' '}
                  <strong className="text-emerald-600">+{Math.floor(finalNetAmount / (store?.pointsRate || 25))} แต้ม</strong>
                </div>
              )}
            </div>

            {/* Enterprise Promo / Coupon Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                คูปองส่วนลด (Coupon Promo)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เช่น WELCOME50, DISC10"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold"
                >
                  ใช้โค้ด
                </button>
              </div>
              {appliedPromo && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-extrabold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                  <span>{appliedPromo.title} ({appliedPromo.code})</span>
                  <span>-฿{appliedPromo.calculatedDiscount}</span>
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

            {/* PromptPay QR View */}
            {paymentMethod === 'PROMPTPAY' && (
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                {promptPayQrPayload ? (
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                      <QRCodeSVG value={promptPayQrPayload} size={160} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 mt-2">
                      พร้อมเพย์: {store?.promptPayId} ({store?.promptPayName})
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-rose-500 font-semibold">ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์ในหน้าตั้งค่าร้าน</p>
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

            <button
              type="button"
              disabled={isProcessingPay || (paymentMethod === 'CASH' && change < 0)}
              onClick={handleProcessPayment}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>ยืนยันชำระเงิน &amp; ปิดบิล</span>
            </button>
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

      {/* Receipt Print Modal */}
      {isReceiptModalOpen && receiptOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={receiptOrder}
        />
      )}
    </div>
  );
}

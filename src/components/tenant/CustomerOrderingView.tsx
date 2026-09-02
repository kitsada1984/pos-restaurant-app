'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Utensils,
  ShoppingBag,
  Clock,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  X,
  ChevronRight,
  Flame,
  Sparkles,
  RefreshCw,
  Search,
  BellRing,
  ChefHat,
  Check,
  Receipt,
  Banknote,
  Volume2,
} from 'lucide-react';
import { formatPrice, formatTime } from '@/lib/utils';
import { playSuccessChime, playOrderChime } from '@/lib/sound';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { useToast } from '@/context/ToastContext';

const QUICK_NOTES = [
  'ไม่ใส่ผงชูรส',
  'เผ็ดน้อย',
  'ข้าวน้อย',
  'ไม่ใส่กระเทียม',
  'ไม่ใส่ผัก',
  'แยกน้ำปลาพริก',
  'ขอช้อนส้อมเพิ่ม',
];

export default function CustomerOrderingView({
  slug = 'lung-pa',
  tableId = 1,
}: {
  slug?: string;
  tableId?: number;
}) {
  const { showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'menu' | 'status'>('menu');

  // Customization Modal State
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [dishQuantity, setDishQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{ [groupTitle: string]: { name: string; extraPrice: number }[] }>({});
  const [specialNote, setSpecialNote] = useState('');

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [customerName, setCustomerName] = useState('');

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');
  const [isCashCalled, setIsCashCalled] = useState(false);

  const fetchData = async () => {
    try {
      const [menuRes, tableRes, settingsRes] = await Promise.all([
        fetch(`/api/r/${slug}/menu`),
        fetch(`/api/r/${slug}/tables/${tableId}`),
        fetch(`/api/r/${slug}/settings`),
      ]);

      const [m, t, s] = await Promise.all([
        menuRes.json().catch(() => []),
        tableRes.json().catch(() => null),
        settingsRes.json().catch(() => null),
      ]);

      setCategories(Array.isArray(m) ? m : []);
      setTableData(t?.error ? null : t);
      setStore(s?.error ? null : s);
    } catch (err) {
      console.error('Error fetching table order data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

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
            if (
              payload.type === 'ORDER_CREATED' ||
              payload.type === 'ORDER_UPDATED' ||
              payload.type === 'TABLE_UPDATED' ||
              payload.type === 'PAYMENT_RECEIVED' ||
              payload.type === 'MENU_UPDATED'
            ) {
              if (payload.type === 'ORDER_UPDATED') {
                playOrderChime();
              }
              if (payload.type === 'PAYMENT_RECEIVED') {
                setIsPayModalOpen(false);
                setIsCashCalled(false);
                playSuccessChime();
                confetti({
                  particleCount: 120,
                  spread: 90,
                  origin: { y: 0.5 },
                });
              }
              fetchData();
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
  }, [slug, tableId]);

  // Flattened active orders
  const activeOrders = useMemo(() => {
    return tableData?.orders || [];
  }, [tableData]);

  // Device-to-Table Session Binding (Anti-Tampering)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `pos_active_table_${slug}`;
      if (activeOrders.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, tableId.toString());
      }
    }
  }, [slug, tableId, activeOrders.length]);

  const totalAmountToPay = useMemo(() => {
    return activeOrders.reduce((sum: number, o: any) => sum + (o.netAmount || 0), 0);
  }, [activeOrders]);

  // Overall primary stage of table orders: 1 (Received), 2 (Cooking), 3 (Ready), 4 (Served)
  const currentStep = useMemo(() => {
    if (activeOrders.length === 0) return 0;
    const allStatuses = activeOrders.map((o: any) => o.status);
    if (allStatuses.some((s: string) => s === 'COOKING')) return 2;
    if (allStatuses.some((s: string) => s === 'READY')) return 3;
    if (allStatuses.every((s: string) => s === 'SERVED')) return 4;
    return 1; // PENDING
  }, [activeOrders]);

  // PromptPay QR Payload for Customer Bill Pay
  const promptPayQr = useMemo(() => {
    if (!store?.promptPayId || totalAmountToPay <= 0) return '';
    return generatePromptPayPayload(store.promptPayId, totalAmountToPay);
  }, [store?.promptPayId, totalAmountToPay]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    let items: any[] = [];
    if (selectedCategory === 'ALL') {
      categories.forEach((cat) => {
        if (Array.isArray(cat.items)) {
          items.push(...cat.items);
        }
      });
    } else {
      const cat = categories.find((c) => c.id === selectedCategory);
      if (cat && Array.isArray(cat.items)) {
        items = cat.items;
      }
    }

    if (searchQuery.trim()) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return items;
  }, [categories, selectedCategory, searchQuery]);

  // Open item customizer modal
  const handleOpenItem = (item: any) => {
    if (!item.isAvailable) return;
    setSelectedMenuItem(item);
    setDishQuantity(1);
    setSpecialNote('');

    const initialOpts: { [key: string]: any[] } = {};
    if (Array.isArray(item.options)) {
      item.options.forEach((group: any) => {
        if (group.isRequired && group.choices?.length > 0) {
          initialOpts[group.title] = [group.choices[0]];
        } else {
          initialOpts[group.title] = [];
        }
      });
    }
    setSelectedOptions(initialOpts);
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

    let extraPerUnit = 0;
    const flattenedOpts: any[] = [];
    Object.entries(selectedOptions).forEach(([group, choices]) => {
      choices.forEach((c) => {
        extraPerUnit += c.extraPrice || 0;
        flattenedOpts.push({
          group,
          choice: c.name,
          extra: c.extraPrice || 0,
        });
      });
    });

    const itemPrice = selectedMenuItem.basePrice + extraPerUnit;

    const cartItem = {
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: itemPrice,
      quantity: dishQuantity,
      selectedOptions: flattenedOpts,
      specialNote: specialNote.trim() || undefined,
    };

    setCart([...cart, cartItem]);
    showSuccess('เพิ่มลงตะกร้าแล้ว 🛒', `${dishQuantity}x ${selectedMenuItem.name}`);
    setSelectedMenuItem(null);
  };

  const handleRemoveCartItem = (idx: number) => {
    const item = cart[idx];
    setCart(cart.filter((_, i) => i !== idx));
    if (item) showInfo('นำออกจากตะกร้าแล้ว', item.name);
  };

  const handleSendOrderToKitchen = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch(`/api/r/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          customerName: customerName.trim() || undefined,
          orderType: 'DINE_IN',
          items: cart,
        }),
      });

      if (res.ok) {
        showSuccess('ส่งรายการอาหารเข้าครัวแล้ว! 🍳', `โต๊ะ ${tableId} • ส่งรายการเรียบร้อย`);
        setCart([]);
        setIsCartOpen(false);
        setActiveTab('status');
        playSuccessChime();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
        fetchData();
      } else {
        showError('ไม่สามารถส่งรายการได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถส่งรายการอาหารได้');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const cartTotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const toggleQuickNote = (tag: string) => {
    if (specialNote.includes(tag)) {
      setSpecialNote(
        specialNote
          .replace(tag, '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*|,\s*$/g, '')
          .trim()
      );
    } else {
      setSpecialNote(specialNote ? `${specialNote}, ${tag}` : tag);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center pb-24 text-slate-100 selection:bg-orange-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-950 min-h-screen shadow-2xl flex flex-col relative border-x border-slate-800">
        
        {/* Customer Header - Isolated Branding with NO Admin links */}
        <header className="bg-slate-950/90 backdrop-blur-xl text-white p-4 sticky top-0 z-30 border-b border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/25">
                {tableId}
              </div>
              <div>
                <h1 className="font-extrabold text-base text-white leading-tight truncate max-w-[180px]">
                  {store?.storeName || store?.name || 'ร้านอาหารตามสั่ง'}
                </h1>
                <div className="flex items-center space-x-1.5 text-xs text-orange-400 font-bold mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>โต๊ะ {tableId} • สั่งอาหารออนไลน์</span>
                </div>
              </div>
            </div>

            {/* Tab switch */}
            <div className="flex items-center space-x-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'menu'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                เมนูอาหาร
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all relative ${
                  activeTab === 'status'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>สถานะ</span>
                {activeOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
                )}
              </button>
            </div>
          </div>

          {/* Search bar */}
          {activeTab === 'menu' && (
            <div className="mt-3.5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเมนูอาหาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
        </header>

        {/* Category Filter Pills */}
        {activeTab === 'menu' && (
          <div className="p-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center space-x-2 overflow-x-auto scrollbar-none sticky top-[120px] z-20">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 space-y-4">
          {activeTab === 'menu' ? (
            /* Menu Items View */
            filteredMenuItems.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs font-semibold">
                ไม่พบรายการอาหารในหมวดหมู่นี้
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item)}
                    className={`p-3.5 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                      item.isAvailable
                        ? 'bg-slate-900/90 border-slate-800 hover:border-orange-500/50 hover:shadow-lg cursor-pointer'
                        : 'bg-slate-900/30 border-slate-800/40 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-sm text-white truncate">{item.name}</h4>
                        {!item.isAvailable && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            หมด
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                      )}
                      <span className="text-sm font-black text-orange-400 block mt-1.5">
                        ฿{item.basePrice}
                      </span>
                    </div>

                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-800 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
                        +
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Order Tracking & Animated Cooking Stages Pipeline */
            <div className="space-y-5">
              
              {/* Animated Progress Card */}
              {activeOrders.length > 0 && (
                <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-orange-500/30 shadow-2xl space-y-5 relative overflow-hidden">
                  
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <ChefHat className="w-5 h-5 text-orange-400" />
                      <span className="font-black text-sm text-white">ขั้นตอนการเตรียมอาหาร</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse">
                      {currentStep === 1 && '⏳ รับตั๋วเข้าครัวแล้ว'}
                      {currentStep === 2 && '🔥 กำลังปรุงอาหารสดๆ'}
                      {currentStep === 3 && '🍽️ ปรุงเสร็จ พร้อมเสิร์ฟ'}
                      {currentStep === 4 && '✅ เสิร์ฟครบเรียบร้อย'}
                    </span>
                  </div>

                  {/* 4-Stage Animated Stepper Bar */}
                  <div className="relative pt-2 pb-1">
                    {/* Background line */}
                    <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-800 rounded-full z-0" />
                    
                    {/* Active Progress line */}
                    <div
                      className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full z-0 transition-all duration-700"
                      style={{
                        width: currentStep === 1 ? '10%' : currentStep === 2 ? '45%' : currentStep === 3 ? '75%' : '90%',
                      }}
                    />

                    {/* Step Icons */}
                    <div className="flex justify-between relative z-10">
                      
                      {/* Step 1: Received */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 1
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 scale-105'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Receipt className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 1 ? 'text-orange-400' : 'text-slate-600'}`}>
                          รับออเดอร์
                        </span>
                      </div>

                      {/* Step 2: Cooking */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 2
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 scale-105 animate-pulse'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Flame className={`w-5 h-5 ${currentStep === 2 ? 'text-amber-200 animate-bounce' : ''}`} />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                          กำลังปรุง
                        </span>
                      </div>

                      {/* Step 3: Ready */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 3
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30 scale-105 animate-bounce'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <BellRing className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 3 ? 'text-orange-400' : 'text-slate-600'}`}>
                          พร้อมเสิร์ฟ
                        </span>
                      </div>

                      {/* Step 4: Served */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            currentStep >= 4
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30 scale-105'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Check className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold ${currentStep >= 4 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          เสิร์ฟแล้ว
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage description message */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                    <p className="text-xs text-slate-300 font-medium">
                      {currentStep === 1 && '🍳 พ่อครัวได้รับรายการอาหารของโต๊ะคุณแล้ว กำลังจัดคิวปรุง'}
                      {currentStep === 2 && '🔥 กำลังผัด/ปรุงสดๆ ด้วยไฟแรง หอมกรุ่นจากเตา'}
                      {currentStep === 3 && '🍽️ อาหารปรุงเสร็จเรียบร้อยแล้ว พนักงานกำลังนำมาเสิร์ฟที่โต๊ะ'}
                      {currentStep === 4 && '😋 เสิร์ฟครบถ้วนแล้ว ทานให้อร่อยนะครับ!'}
                    </p>
                  </div>
                </div>
              )}

              {/* Total & PromptPay Checkout Box */}
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ยอดรวมทั้งโต๊ะ:</span>
                  <span className="text-2xl font-black text-orange-400">
                    ฿{totalAmountToPay.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-400" />
                    <span>สั่งเพิ่ม</span>
                  </button>

                  {totalAmountToPay > 0 && (
                    <button
                      onClick={() => {
                        setIsCashCalled(false);
                        setIsPayModalOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 transition-all"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>เช็คบิล</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Orders List */}
              {activeOrders.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 p-8 space-y-3">
                  <Utensils className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="font-extrabold text-base text-white">ยังไม่มีรายการสั่งอาหาร</h4>
                  <p className="text-xs text-slate-400">กดแท็บ "เมนูอาหาร" เพื่อเลือกสั่งเมนูอร่อยๆ ได้เลยครับ</p>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-5 py-2.5 rounded-2xl bg-orange-500 text-white font-black text-xs shadow-lg shadow-orange-500/25"
                  >
                    เปิดดูเมนูอาหาร 🍳
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order: any, idx: number) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <span className="font-extrabold text-xs text-white block">ออเดอร์ชุดที่ #{idx + 1}</span>
                          <span className="text-[10px] text-slate-400">{formatTime(order.createdAt)}</span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                            order.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : order.status === 'COOKING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                              : order.status === 'SERVED'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {order.status === 'READY'
                            ? '🍽️ พร้อมเสิร์ฟ'
                            : order.status === 'COOKING'
                            ? '🔥 กำลังปรุง'
                            : order.status === 'SERVED'
                            ? '✓ เสิร์ฟแล้ว'
                            : '⏳ รอคิวเข้าครัว'}
                        </span>
                      </div>

                      <div className="space-y-2.5 divide-y divide-slate-800/60">
                        {order.items?.map((item: any) => {
                          let parsedOptions: any[] = [];
                          if (item.selectedOptions) {
                            try {
                              parsedOptions = typeof item.selectedOptions === 'string' ? JSON.parse(item.selectedOptions) : item.selectedOptions;
                            } catch (e) {}
                          }

                          return (
                            <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-white">
                                    {item.name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-orange-400 font-black text-[10px]">
                                    x{item.quantity}
                                  </span>
                                </div>

                                {parsedOptions.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {parsedOptions.map((opt: any, oIdx: number) => (
                                      <span
                                        key={oIdx}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800/80 text-slate-300"
                                      >
                                        {opt.choice || opt.name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {item.specialNote && (
                                  <span className="text-[11px] text-amber-400 block mt-0.5">💬 {item.specialNote}</span>
                                )}
                              </div>
                              <span className="font-black text-orange-400">฿{item.price * item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Floating Cart Button */}
        {cart.length > 0 && activeTab === 'menu' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full p-4 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 text-white font-black text-sm shadow-2xl shadow-orange-500/40 flex items-center justify-between transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xs shadow-md">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </div>
                <span>ดูตะกร้าสั่งอาหาร</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>฿{cartTotalAmount.toLocaleString()}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        {/* Item Customizer Pop-up */}
        {selectedMenuItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-800 text-white max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-base text-white">{selectedMenuItem.name}</h3>
                <button onClick={() => setSelectedMenuItem(null)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {selectedMenuItem.options?.map((group: any) => (
                <div key={group.id} className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">{group.title}</span>
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
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {choice.name} {choice.extraPrice > 0 && `(+฿${choice.extraPrice})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quick Note Tags */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">หมายเหตุยอดนิยม (แตะเพื่อเลือก):</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map((tag) => {
                    const active = specialNote.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleQuickNote(tag)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                          active
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tag} {active && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความ เช่น เผ็ดน้อย, ไม่ใส่กระเทียม"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDishQuantity(Math.max(1, dishQuantity - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 font-black text-sm text-white"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-sm px-2 text-white">{dishQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setDishQuantity(dishQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 font-black text-sm text-white"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all"
                >
                  เพิ่มลงตะกร้า (฿{calculateCustomizedPrice()})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart Drawer */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center">
            <div className="bg-slate-900 rounded-t-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t border-slate-800 max-h-[85vh] flex flex-col text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-base text-white">ตะกร้าอาหาร (โต๊ะ {tableId})</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-slate-800">
                {cart.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{item.name} x {item.quantity}</span>
                      <span className="text-[11px] text-orange-400 font-bold">฿{item.price * item.quantity}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCartItem(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1 text-xs font-bold"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex justify-between font-black text-base text-white">
                  <span>รวมทั้งหมด:</span>
                  <span className="text-orange-400">฿{cartTotalAmount.toLocaleString()}</span>
                </div>

                <button
                  disabled={isSubmittingOrder}
                  onClick={handleSendOrderToKitchen}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 text-white font-black text-sm shadow-xl shadow-orange-500/30 transition-all disabled:opacity-50"
                >
                  {isSubmittingOrder ? 'กำลังส่งเข้าครัว...' : 'ยืนยันส่งออเดอร์เข้าครัว 🍳'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment & Bill Checkout Modal (PromptPay & Cash options) */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-800 text-center text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-black text-base text-white">เช็คบิลชำระเงิน (โต๊ะ {tableId})</h3>
                <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <span className="text-xs font-bold text-orange-300 block">ยอดสุทธิที่ต้องชำระ:</span>
                <span className="text-3xl font-black text-orange-400">฿{totalAmountToPay.toLocaleString()}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayMethod('PROMPTPAY')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                    payMethod === 'PROMPTPAY'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>สแกนพร้อมเพย์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod('CASH')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                    payMethod === 'CASH'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>จ่ายเงินสด</span>
                </button>
              </div>

              {payMethod === 'PROMPTPAY' ? (
                /* PromptPay Option */
                promptPayQr ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center space-y-2">
                    <div className="p-3 bg-white rounded-2xl shadow-md">
                      <QRCodeSVG value={promptPayQr} size={170} />
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      พร้อมเพย์: {store?.promptPayId} ({store?.promptPayName})
                    </span>
                    <p className="text-[11px] text-slate-400">
                      สแกนจ่ายผ่านแอปธนาคารใดก็ได้ แล้วแจ้งพนักงานที่หน้าร้านได้เลยครับ
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-rose-400">ร้านยังไม่ได้ตั้งค่าพร้อมเพย์</p>
                )
              ) : (
                /* Cash Option */
                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <Banknote className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white">ชำระด้วยเงินสด</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      กรุณาเรียกพนักงาน หรือนำยอด <strong className="text-orange-400 font-bold">฿{totalAmountToPay}</strong> ไปชำระที่เคาน์เตอร์แคชเชียร์
                    </p>
                  </div>

                  {!isCashCalled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCashCalled(true);
                        playSuccessChime();
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 transition-all"
                    >
                      🔔 กดเรียกพนักงานมาเก็บเงินสดที่โต๊ะ
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center justify-center space-x-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>แจ้งพนักงานแล้ว พนักงานกำลังเดินไปที่โต๊ะครับ</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

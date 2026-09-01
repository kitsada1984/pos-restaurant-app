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
  Egg,
  Sparkles,
  RefreshCw,
  Upload,
  Receipt,
  Search,
  ChevronDown,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import { formatPrice, formatTime } from '@/lib/utils';
import { playSuccessChime, playOrderChime } from '@/lib/sound';
import { generatePromptPayPayload } from '@/lib/promptpay';

export default function CustomerOrderingView({
  slug = 'lung-pa',
  tableId = 1,
}: {
  slug?: string;
  tableId?: number;
}) {
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
  const [isCallingBill, setIsCallingBill] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);
  const [simulatedSlipUrl, setSimulatedSlipUrl] = useState('');

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
              payload.type === 'PAYMENT_RECEIVED' ||
              payload.type === 'MENU_UPDATED'
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
  }, [slug, tableId]);

  // Flattened active orders
  const activeOrders = useMemo(() => {
    return tableData?.orders || [];
  }, [tableData]);

  const totalAmountToPay = useMemo(() => {
    return activeOrders.reduce((sum: number, o: any) => sum + (o.netAmount || 0), 0);
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
    setSelectedMenuItem(null);
  };

  const handleRemoveCartItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
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
        setCart([]);
        setIsCartOpen(false);
        setActiveTab('status');
        playSuccessChime();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const cartTotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center pb-28">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative">
        {/* Header */}
        <header className="bg-slate-900 text-white p-5 sticky top-0 z-30 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/20">
                {tableId}
              </div>
              <div>
                <h1 className="font-black text-base text-white leading-tight">
                  {store?.storeName || store?.name || 'ร้านอาหารตามสั่ง'}
                </h1>
                <span className="text-[11px] text-orange-400 font-bold block">
                  โต๊ะ {tableId} • สั่งอาหารเข้าครัว
                </span>
              </div>
            </div>

            {/* Tab switch */}
            <div className="flex items-center space-x-1 p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'menu' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                สั่งอาหาร
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all relative ${
                  activeTab === 'status' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                <span>สถานะ</span>
                {activeOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            </div>
          </div>

          {/* Search bar */}
          {activeTab === 'menu' && (
            <div className="mt-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเมนูอาหารตามสั่ง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
        </header>

        {/* Category Filter Pills */}
        {activeTab === 'menu' && (
          <div className="p-3 bg-white border-b border-slate-100 flex items-center space-x-2 overflow-x-auto scrollbar-none sticky top-[125px] z-20">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 space-y-3">
          {activeTab === 'menu' ? (
            /* Menu Items */
            filteredMenuItems.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                ไม่พบรายการอาหารในหมวดหมู่นี้
              </div>
            ) : (
              filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className={`p-3.5 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                    item.isAvailable
                      ? 'bg-white border-slate-200/80 hover:border-orange-500/50 hover:shadow-md cursor-pointer'
                      : 'bg-slate-50 border-slate-200/40 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">{item.name}</h4>
                      {!item.isAvailable && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          หมด
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                    <span className="text-sm font-black text-orange-600 block mt-1.5">
                      ฿{item.basePrice}
                    </span>
                  </div>

                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      +
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            /* Order Tracking Status Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ยอดรวมที่ต้องชำระ:</span>
                  <span className="text-2xl font-black text-orange-400">
                    ฿{totalAmountToPay.toLocaleString()}
                  </span>
                </div>
                {totalAmountToPay > 0 && (
                  <button
                    onClick={() => setIsPayModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>เช็คบิลพร้อมเพย์</span>
                  </button>
                )}
              </div>

              {activeOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
                  <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-extrabold text-sm text-slate-900">ยังไม่มีรายการสั่งอาหาร</h4>
                  <p className="text-xs text-slate-400">กดแท็บ "สั่งอาหาร" เพื่อเลือกเมนูอร่อยๆ ได้เลยครับ</p>
                </div>
              ) : (
                activeOrders.map((order: any, idx: number) => (
                  <div key={order.id} className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block">ออเดอร์ #{idx + 1}</span>
                        <span className="text-[10px] text-slate-400">{formatTime(order.createdAt)}</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                          order.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.status === 'COOKING'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {order.status === 'READY'
                          ? '✓ ปรุงเสร็จแล้ว'
                          : order.status === 'COOKING'
                          ? '🔥 กำลังปรุง'
                          : '⏳ รอคิวเข้าครัว'}
                      </span>
                    </div>

                    <div className="space-y-2 divide-y divide-slate-50">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{item.name} x {item.quantity}</span>
                            {item.specialNote && (
                              <span className="text-[10px] text-orange-600 block">({item.specialNote})</span>
                            )}
                          </div>
                          <span className="font-black text-slate-900">฿{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Floating Cart Button */}
        {cart.length > 0 && activeTab === 'menu' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full p-4 rounded-3xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-xl shadow-orange-500/30 flex items-center justify-between transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xs">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </div>
                <span>ดูตะกร้าของฉัน</span>
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900">{selectedMenuItem.name}</h3>
                <button onClick={() => setSelectedMenuItem(null)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              {selectedMenuItem.options?.map((group: any) => (
                <div key={group.id} className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">{group.title}</span>
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
                  placeholder="เช่น เผ็ดน้อย, ไม่ใส่กระเทียม"
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
                    className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-sm">{dishQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setDishQuantity(dishQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-sm"
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

        {/* Cart Drawer */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
            <div className="bg-white rounded-t-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-base text-slate-900">ตะกร้าอาหาร (โต๊ะ {tableId})</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-slate-100">
                {cart.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{item.name} x {item.quantity}</span>
                      <span className="text-[11px] text-orange-600 font-bold">฿{item.price * item.quantity}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCartItem(idx)}
                      className="text-rose-500 p-1"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between font-black text-base text-slate-900">
                  <span>รวมทั้งหมด:</span>
                  <span className="text-orange-600">฿{cartTotalAmount.toLocaleString()}</span>
                </div>

                <button
                  disabled={isSubmittingOrder}
                  onClick={handleSendOrderToKitchen}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-xl shadow-orange-500/25 transition-all disabled:opacity-50"
                >
                  {isSubmittingOrder ? 'กำลังส่งเข้าครัว...' : 'ยืนยันส่งออเดอร์เข้าครัว 🍳'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PromptPay Bill QR Modal */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-black text-base text-slate-900">สแกนจ่ายพร้อมเพย์ (โต๊ะ {tableId})</h3>
                <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400">
                  ✕
                </button>
              </div>

              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100">
                <span className="text-xs font-bold text-orange-800 block">ยอดสุทธิที่ต้องชำระ:</span>
                <span className="text-2xl font-black text-orange-600">฿{totalAmountToPay.toLocaleString()}</span>
              </div>

              {promptPayQr ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <QRCodeSVG value={promptPayQr} size={180} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 mt-2">
                    พร้อมเพย์: {store?.promptPayId} ({store?.promptPayName})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-rose-500">ร้านยังไม่ได้ตั้งค่าพร้อมเพย์</p>
              )}

              <p className="text-[11px] text-slate-400">
                สแกนจ่ายผ่านแอปธนาคารใดก็ได้ แล้วแจ้งพนักงานที่หน้าร้านได้เลยครับ
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

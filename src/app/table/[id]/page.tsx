'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
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
} from 'lucide-react';
import { formatPrice, formatTime } from '@/lib/utils';
import { playSuccessChime, playOrderChime } from '@/lib/sound';

export default function TableOrderingPage() {
  const params = useParams();
  const tableId = params?.id ? parseInt(params.id as string, 10) || 1 : 1;

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
        fetch('/api/menu'),
        fetch(`/api/tables/${tableId}`),
        fetch('/api/settings'),
      ]);

      const [menuData, tData, sData] = await Promise.all([
        menuRes.json().catch(() => []),
        tableRes.json().catch(() => null),
        settingsRes.json().catch(() => null),
      ]);

      setCategories(Array.isArray(menuData) ? menuData : []);
      setTableData(tData?.error ? null : tData);
      setStore(sData?.error ? null : sData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource('/api/realtime/stream');
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (
              payload.type === 'ORDER_UPDATED' ||
              payload.type === 'ORDER_CREATED' ||
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
  }, [tableId]);

  const allMenuItems = useMemo(() => {
    const items: any[] = [];
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (Array.isArray(cat?.items)) {
          cat.items.forEach((item: any) => {
            items.push({ ...item, categoryName: cat.name });
          });
        }
      });
    }
    return items;
  }, [categories]);

  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item?.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allMenuItems, selectedCategory, searchQuery]);

  const handleOpenCustomization = (item: any) => {
    if (!item.isAvailable) return;
    setSelectedMenuItem(item);
    setDishQuantity(1);
    setSpecialNote('');

    const initialOptions: { [groupTitle: string]: { name: string; extraPrice: number }[] } = {};
    if (item.options) {
      item.options.forEach((group: any) => {
        if (group.isRequired && group.choices && group.choices.length > 0) {
          initialOptions[group.title] = [
            { name: group.choices[0].name, extraPrice: group.choices[0].extraPrice },
          ];
        } else {
          initialOptions[group.title] = [];
        }
      });
    }
    setSelectedOptions(initialOptions);
  };

  const calculateItemPrice = (basePrice: number, options: typeof selectedOptions) => {
    let extra = 0;
    Object.values(options).forEach((choices) => {
      choices.forEach((c) => {
        extra += c.extraPrice;
      });
    });
    return basePrice + extra;
  };

  const handleAddToCart = () => {
    if (!selectedMenuItem) return;

    const unitPrice = calculateItemPrice(selectedMenuItem.basePrice, selectedOptions);

    const formattedOptionsList: { group: string; choice: string; extraPrice: number }[] = [];
    Object.entries(selectedOptions).forEach(([groupTitle, choices]) => {
      choices.forEach((c) => {
        formattedOptionsList.push({
          group: groupTitle,
          choice: c.name,
          extraPrice: c.extraPrice,
        });
      });
    });

    const cartItem = {
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      basePrice: selectedMenuItem.basePrice,
      price: unitPrice,
      quantity: dishQuantity,
      selectedOptions: formattedOptionsList,
      specialNote: specialNote.trim(),
    };

    setCart((prev) => [...prev, cartItem]);
    setSelectedMenuItem(null);
    playSuccessChime();
  };

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          orderType: 'DINE_IN',
          customerName: customerName.trim() || undefined,
          items: cart,
        }),
      });

      if (res.ok) {
        setCart([]);
        setIsCartOpen(false);
        setActiveTab('status');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        playOrderChime();
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการส่งออเดอร์');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCallBill = async () => {
    setIsCallingBill(true);
    try {
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CALL_BILL',
          tableId,
          slipUrl: simulatedSlipUrl || undefined,
        }),
      });
      setIsPayModalOpen(false);
      setSlipUploaded(true);
      fetchData();
      alert('ส่งคำขอเช็คบิลเรียบร้อย พนักงานกำลังตรวจสอบและออกใบเสร็จให้ครับ');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCallingBill(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-slate-500 font-semibold">กำลังโหลดเมนูอาหาร...</p>
      </div>
    );
  }

  const activeOrders = tableData?.activeOrders || [];
  const activeBillTotal = tableData?.totalAmount || 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 selection:bg-orange-500 selection:text-white">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-30 glass-header">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/20">
              {tableId}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base">โต๊ะ {tableId}</span>
                <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {tableData?.table?.status === 'OCCUPIED' ? 'กำลังทาน' : 'สั่งได้เลย'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium line-clamp-1">{store?.storeName || 'ร้านอาหารตามสั่ง'}</p>
            </div>
          </div>

          {/* Segmented View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 text-xs font-bold">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'menu' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              สั่งอาหาร
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`relative px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'status' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>สถานะ</span>
              {activeOrders.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* VIEW 1: MENU BROWSING */}
      {activeTab === 'menu' && (
        <main className="max-w-md mx-auto px-4 pt-3.5 space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนู เช่น กะเพรา, ข้าวผัด, ต้มยำ..."
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/80 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด ({allMenuItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {cat.name} ({cat.items?.length || 0})
              </button>
            ))}
          </div>

          {/* Food Cards List */}
          <div className="space-y-3">
            {filteredMenuItems.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-2">
                <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-700 font-bold text-xs">ไม่พบเมนูที่คุณค้นหา</p>
                <button
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-orange-600 font-semibold underline"
                >
                  ล้างการค้นหา
                </button>
              </div>
            ) : (
              filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenCustomization(item)}
                  className={`bg-white rounded-3xl p-3.5 border transition-all flex space-x-3.5 ${
                    item.isAvailable
                      ? 'border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]'
                      : 'border-slate-200/50 bg-slate-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Food Image */}
                  {item.imageUrl ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="96px" />
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded-full">
                            ของหมด
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center flex-shrink-0">
                      <Utensils className="w-8 h-8" />
                    </div>
                  )}

                  {/* Food Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <span className="font-black text-orange-600 text-sm">
                        {formatPrice(item.basePrice)}
                      </span>
                      {item.isAvailable ? (
                        <button className="bg-orange-50 text-orange-700 hover:bg-orange-500 hover:text-white px-3 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>เลือก</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-red-500 font-bold">ของหมดชั่วคราว</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* VIEW 2: LIVE STATUS & CHECKOUT */}
      {activeTab === 'status' && (
        <main className="max-w-md mx-auto px-4 pt-3.5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-base">รายการอาหาร (โต๊ะ {tableId})</h2>
                <p className="text-xs text-slate-400 font-medium">อัปเดตสถานะแบบ Real-time</p>
              </div>
              <button
                onClick={fetchData}
                className="p-2 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">ยังไม่มีรายการสั่งอาหารที่โต๊ะนี้</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="px-5 py-2.5 rounded-2xl bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20"
                >
                  เลือกสั่งอาหารเลย
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order: any, oIdx: number) => (
                  <div key={order.id} className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                      <span className="font-extrabold text-slate-800">
                        รอบสั่งที่ #{oIdx + 1} ({formatTime(order.createdAt)})
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                          order.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-900'
                            : order.status === 'COOKING'
                            ? 'bg-orange-100 text-orange-900 animate-pulse'
                            : order.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {order.status === 'PENDING' && '⏳ รอคิวทำ'}
                        {order.status === 'COOKING' && '🍳 กำลังปรุง'}
                        {order.status === 'READY' && '🥗 พร้อมเสิร์ฟ'}
                        {order.status === 'SERVED' && '✅ เสิร์ฟแล้ว'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {order.items.map((item: any, iIdx: number) => {
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
                                {item.name} x {item.quantity}
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
                                <div className="text-[11px] text-orange-600 mt-0.5 italic">
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

                {/* Total & Check Bill */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">ยอดรวมทั้งโต๊ะ</span>
                    <span className="text-xl font-black text-orange-600">
                      {formatPrice(activeBillTotal)}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPayModalOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>เรียกเช็คบิล / สแกนจ่าย</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* DISH CUSTOMIZATION MODAL */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedMenuItem.name}</h3>
                <span className="text-xs text-orange-600 font-extrabold">
                  เริ่มต้น {formatPrice(selectedMenuItem.basePrice)}
                </span>
              </div>
              <button
                onClick={() => setSelectedMenuItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {selectedMenuItem.options?.map((group: any) => (
                <div key={group.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs text-slate-800 flex items-center space-x-1.5">
                      <span>{group.title}</span>
                      {group.isRequired && (
                        <span className="text-[10px] text-red-500 font-extrabold bg-red-50 px-1.5 py-0.5 rounded">
                          จำเป็น
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {group.choices?.map((choice: any) => {
                      const isSelected =
                        selectedOptions[group.title]?.some((c) => c.name === choice.name) ?? false;

                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => {
                            setSelectedOptions((prev) => {
                              const current = prev[group.title] || [];
                              if (group.isMulti) {
                                if (isSelected) {
                                  return {
                                    ...prev,
                                    [group.title]: current.filter((c) => c.name !== choice.name),
                                  };
                                } else {
                                  return {
                                    ...prev,
                                    [group.title]: [...current, { name: choice.name, extraPrice: choice.extraPrice }],
                                  };
                                }
                              } else {
                                return {
                                  ...prev,
                                  [group.title]: [{ name: choice.name, extraPrice: choice.extraPrice }],
                                };
                              }
                            });
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{choice.name}</span>
                          {choice.extraPrice > 0 ? (
                            <span className={isSelected ? 'text-white font-extrabold' : 'text-orange-600 font-extrabold'}>
                              +{formatPrice(choice.extraPrice)}
                            </span>
                          ) : (
                            <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>ฟรี</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="เช่น ไม่ใส่ผัก, ไม่ใส่ชูรส, ขอพริกน้ำปลา..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">จำนวนจาน:</span>
                <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setDishQuantity(Math.max(1, dishQuantity - 1))}
                    className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center font-bold shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">
                    {dishQuantity}
                  </span>
                  <button
                    onClick={() => setDishQuantity(dishQuantity + 1)}
                    className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white">
              <button
                onClick={handleAddToCart}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm flex items-center justify-between px-6 shadow-lg shadow-orange-500/20 active:scale-98 transition-all"
              >
                <span>ใส่ตะกร้า</span>
                <span>
                  {formatPrice(
                    calculateItemPrice(selectedMenuItem.basePrice, selectedOptions) * dishQuantity
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CART BUTTON */}
      {cart.length > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-5 duration-200">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-4 px-5 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-between shadow-2xl active:scale-98 transition-all border border-slate-800"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shadow">
                {cartTotalItems}
              </div>
              <span>ดูรายการในตะกร้า</span>
            </div>
            <div className="flex items-center space-x-2 text-orange-400 font-black">
              <span>{formatPrice(cartTotalAmount)}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-slate-900 text-base">
                  สรุปออเดอร์ (โต๊ะ {tableId})
                </h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้สั่ง (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="เช่น คุณก้อง, โต๊ะหน้าทีวี"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <h4 className="font-black text-xs text-slate-900">{item.name}</h4>
                      {item.selectedOptions?.map((opt: any, oIdx: number) => (
                        <span key={oIdx} className="text-[11px] text-slate-500 block">
                          • {opt.choice} {opt.extraPrice > 0 && `(+${formatPrice(opt.extraPrice)})`}
                        </span>
                      ))}
                      {item.specialNote && (
                        <span className="text-[11px] text-orange-600 block italic">
                          *{item.specialNote}
                        </span>
                      )}
                      <span className="text-xs font-black text-orange-600 mt-1 block">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setCart((prev) => {
                            const clone = [...prev];
                            if (clone[idx].quantity > 1) {
                              clone[idx].quantity -= 1;
                              return clone;
                            } else {
                              return clone.filter((_, i) => i !== idx);
                            }
                          });
                        }}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => {
                          setCart((prev) => {
                            const clone = [...prev];
                            clone[idx].quantity += 1;
                            return clone;
                          });
                        }}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white space-y-3">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">ยอดรวมทั้งหมด:</span>
                <span className="text-orange-600 text-lg font-black">{formatPrice(cartTotalAmount)}</span>
              </div>
              <button
                disabled={isSubmittingOrder}
                onClick={handleSubmitOrder}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
              >
                {isSubmittingOrder ? (
                  <span>กำลังส่งออเดอร์เข้าครัว...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>ยืนยันส่งออเดอร์เข้าครัว</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPTPAY MODAL */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="text-left">
                <h3 className="font-black text-slate-900 text-base">สแกนชำระเงิน</h3>
                <p className="text-xs text-slate-400">โต๊ะ {tableId} • PromptPay QR</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
              <div className="w-full bg-[#113566] text-white py-1.5 px-3 rounded-xl text-xs font-black mb-3 flex items-center justify-center">
                <span>พร้อมเพย์ • PromptPay</span>
              </div>

              {tableData?.promptPayQrPayload ? (
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <QRCodeSVG value={tableData.promptPayQrPayload} size={180} />
                </div>
              ) : (
                <div className="h-44 w-44 flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-400">
                  ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์
                </div>
              )}

              <div className="mt-3 text-center">
                <span className="text-xs text-slate-500 block">ชื่อบัญชี: {store?.promptPayName || 'ร้านอาหารตามสั่ง'}</span>
                <span className="text-xs font-mono text-slate-800 font-bold">{store?.promptPayId}</span>
              </div>

              <div className="mt-2.5 bg-orange-100 text-orange-950 px-4 py-1.5 rounded-full text-sm font-black">
                ยอดที่ต้องชำระ: {formatPrice(activeBillTotal)}
              </div>
            </div>

            <button
              disabled={isCallingBill}
              onClick={() => {
                setSimulatedSlipUrl('https://example.com/slip.jpg');
                handleCallBill();
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>โอนเงินเรียบร้อย / แจ้งเช็คบิล</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

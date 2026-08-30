'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  FolderPlus,
  RefreshCw,
  X,
  Search,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function MenuAdminPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Form State for new item
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [categoryName, setCategoryName] = useState('');

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json().catch(() => []);
      const safeData = Array.isArray(data) ? data : [];
      setCategories(safeData);
      if (safeData.length > 0 && !itemCategory) {
        setItemCategory(safeData[0].id);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Quick 1-Click Toggle "ของหมด" (Out of stock)
  const handleToggleStock = async (itemId: string, currentAvailable: boolean) => {
    try {
      // Optimistic update
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((it: any) =>
            it.id === itemId ? { ...it, isAvailable: !currentAvailable } : it
          ),
        }))
      );

      await fetch('/api/menu/toggle-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, isAvailable: !currentAvailable }),
      });
    } catch (err) {
      console.error(err);
      fetchMenu();
    }
  };

  // Add New Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_CATEGORY', name: categoryName }),
      });
      setCategoryName('');
      setIsAddCategoryOpen(false);
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  // Add New Menu Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice || !itemCategory) return;
    try {
      await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: itemCategory,
          name: itemName,
          description: itemDesc,
          basePrice: parseFloat(itemPrice),
          imageUrl: itemImage,
        }),
      });

      setItemName('');
      setItemDesc('');
      setItemPrice('');
      setItemImage('');
      setIsAddModalOpen(false);
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) return;
    try {
      await fetch(`/api/menu?id=${itemId}&type=item`, { method: 'DELETE' });
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">จัดการเมนูอาหาร & สต็อก</h1>
              <p className="text-xs text-slate-500">
                เพิ่ม/แก้ไขเมนู และกดสวิตช์เปิด-ปิด "ของหมด" ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>เพิ่มหมวดหมู่</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเมนูใหม่</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อเมนู..."
              className="w-full bg-white pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          categories.map((cat) => {
            const filteredItems = (cat.items || []).filter((i: any) =>
              i.name.toLowerCase().includes(search.toLowerCase())
            );

            if (search && filteredItems.length === 0) return null;

            return (
              <div key={cat.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-base text-slate-800 flex items-center space-x-2">
                    <span>{cat.name}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredItems.length} รายการ)
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start space-x-3 ${
                        item.isAvailable
                          ? 'bg-white border-slate-200 shadow-sm'
                          : 'bg-slate-50 border-slate-200/80 opacity-75'
                      }`}
                    >
                      {item.imageUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-orange-50 text-orange-400 flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-xs text-slate-800 truncate pr-1">{item.name}</h3>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-300 hover:text-red-500 p-0.5"
                            title="ลบเมนู"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-orange-600 block mt-0.5">
                          {formatPrice(item.basePrice)}
                        </span>

                        {/* 1-Click Stock Toggle Switch */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500">
                            สถานะสินค้า:
                          </span>
                          <button
                            onClick={() => handleToggleStock(item.id, item.isAvailable)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 ${
                              item.isAvailable
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {item.isAvailable ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>มีสินค้า</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-red-600" />
                                <span>ของหมด</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* CREATE CATEGORY MODAL */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleCreateCategory} className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">เพิ่มหมวดหมู่อาหาร</h3>
              <button type="button" onClick={() => setIsAddCategoryOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหมวดหมู่:</label>
              <input
                type="text"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="เช่น ข้าวผัด, อาหารจานเดียว, ทานเล่น"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs shadow hover:bg-orange-600"
            >
              บันทึกหมวดหมู่
            </button>
          </form>
        </div>
      )}

      {/* CREATE ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <form onSubmit={handleCreateItem} className="bg-white rounded-3xl max-w-md w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">เพิ่มเมนูอาหารใหม่</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่:</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อเมนูอาหาร:</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="เช่น ผัดกะเพราโบราณราดข้าว"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ราคาเริ่มต้น (บาท):</label>
              <input
                type="number"
                required
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียดเมนู:</label>
              <input
                type="text"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="คำอธิบายรสชาติหรือวัตถุดิบ"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ลิงก์รูปภาพ (URL):</label>
              <input
                type="text"
                value={itemImage}
                onChange={(e) => setItemImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs shadow hover:bg-orange-600 mt-2"
            >
              บันทึกเมนูใหม่
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

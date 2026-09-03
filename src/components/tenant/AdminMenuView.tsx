'use client';

import React, { useState, useEffect } from 'react';
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
import { formatPrice, formatImageUrl } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export default function AdminMenuView({ slug = 'lung-pa' }: { slug?: string }) {
  const { showSuccess, showError, showWarning } = useToast();
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

  // Edit Item State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImage, setEditImage] = useState('');

  // Delete Item State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`/api/r/${slug}/menu`);
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
  }, [slug]);

  // Quick 1-Click Toggle "ของหมด"
  const handleToggleStock = async (itemId: string, currentAvailable: boolean) => {
    try {
      const res = await fetch(`/api/r/${slug}/menu/toggle-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, isAvailable: !currentAvailable }),
      });
      if (res.ok) {
        if (currentAvailable) {
          showWarning('เปลี่ยนสถานะเป็น "ของหมด"', 'เมนูนี้จะไม่สามารถสั่งได้ชั่วคราว');
        } else {
          showSuccess('เปิดขายเมนูแล้ว', 'พร้อมรับออเดอร์ตามปกติ');
        }
        fetchMenu();
      }
    } catch (err) {
      console.error(err);
      showError('ไม่สามารถเปลี่ยนสถานะได้', 'กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Add Menu Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const normalizedImage = formatImageUrl(itemImage);
      const res = await fetch(`/api/r/${slug}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: itemCategory,
          name: itemName,
          description: itemDesc,
          basePrice: parseFloat(itemPrice) || 50,
          imageUrl: normalizedImage,
        }),
      });
      if (res.ok) {
        showSuccess('เพิ่มเมนูใหม่สำเร็จ 🎉', `เพิ่ม "${itemName}" ในระบบเรียบร้อย`);
        setIsAddModalOpen(false);
        setItemName('');
        setItemDesc('');
        setItemPrice('');
        setItemImage('');
        fetchMenu();
      } else {
        showError('ไม่สามารถเพิ่มเมนูได้', 'กรุณาตรวจสอบข้อมูล');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มเมนูได้');
    }
  };

  // Open Edit Modal
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.categoryId);
    setEditPrice(String(item.basePrice));
    setEditDesc(item.description || '');
    setEditImage(item.imageUrl || '');
    setIsEditModalOpen(true);
  };

  // Save Edited Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const normalizedImage = formatImageUrl(editImage);
      const res = await fetch(`/api/r/${slug}/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: editCategory,
          name: editName,
          description: editDesc,
          basePrice: parseFloat(editPrice) || 50,
          imageUrl: normalizedImage,
        }),
      });

      if (res.ok) {
        showSuccess('บันทึกการแก้ไขสำเร็จ ✨', `อัปเดตข้อมูล "${editName}" เรียบร้อย`);
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchMenu();
      } else {
        showError('บันทึกไม่สำเร็จ', 'กรุณาตรวจสอบข้อมูล');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการแก้ไขได้');
    }
  };

  // Open Delete Modal
  const openDeleteModal = (item: any) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/r/${slug}/menu/${deletingItem.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('ลบเมนูเรียบร้อย 🗑️', `ลบ "${deletingItem.name}" ออกจากระบบแล้ว`);
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        fetchMenu();
      } else {
        showError('ไม่สามารถลบเมนูได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถลบเมนูได้');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              จัดการเมนูอาหาร &amp; ของหมด
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            แก้ไขรายละเอียด, ลบเมนู และกดสวิตช์ 1-Click ปิดของหมดได้ทันทีแบบเรียลไทม์
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มเมนูใหม่</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-sm w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-5 sm:left-6 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="ค้นหาเมนูอาหาร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Categories & Items Grid */}
      <div className="space-y-4 sm:space-y-6 w-full">
        {categories.map((cat) => {
          const items = (cat.items || []).filter((item: any) =>
            item.name.toLowerCase().includes(search.toLowerCase())
          );

          if (items.length === 0 && search) return null;

          return (
            <div key={cat.id} className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center space-x-2">
                  <span>{cat.name}</span>
                  <span className="text-xs text-slate-400 font-bold">({items.length} รายการ)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5 w-full">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-3 transition-all w-full ${
                      item.isAvailable
                        ? 'bg-white border-slate-200 hover:border-orange-300'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {item.imageUrl && (
                        <img
                          src={formatImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0 bg-slate-100"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{item.name}</h4>
                        </div>
                        <span className="text-sm font-black text-orange-600 block mt-0.5">
                          ฿{item.basePrice}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Toggle Stock + Edit + Delete */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {/* 1-Click Out-of-Stock Toggle */}
                      <button
                        onClick={() => handleToggleStock(item.id, item.isAvailable)}
                        title={item.isAvailable ? 'กดเพื่อปิด (ของหมด)' : 'กดเพื่อเปิด (มีของ)'}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold border transition-all flex items-center space-x-1 ${
                          item.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        }`}
                      >
                        <span>{item.isAvailable ? '✓ มีของ' : '✕ ของหมด'}</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(item)}
                        title="แก้ไขเมนู"
                        className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => openDeleteModal(item)}
                        title="ลบเมนู"
                        className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">+ เพิ่มเมนูอาหารใหม่</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมวดหมู่ *</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อเมนู *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผัดกะเพราหมูกรอบ"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ราคาเริ่มต้น (บาท) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="50"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">รายละเอียด / คำอธิบาย</label>
                <input
                  type="text"
                  placeholder="เช่น หมูกรอบแท้ ผัดพริกแห้งเข้มข้น"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  URL รูปภาพ (รองรับ Google Drive / เว็บรูปภาพ)
                </label>
                <input
                  type="url"
                  placeholder="เช่น ลิงก์แชร์ Google Drive หรือ https://..."
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 วางลิงก์แชร์ Google Drive (ตั้งค่าเป็น 'ทุกคนที่มีลิงก์') ระบบจะแปลงรูปให้อัตโนมัติ
                </p>
                {itemImage && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                    <img
                      src={formatImageUrl(itemImage)}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover bg-white border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-500 font-medium truncate">ตัวอย่างรูปภาพ</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold shadow-md"
                >
                  บันทึกเมนู
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-orange-500" />
                <span>แก้ไขเมนูอาหาร</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">หมวดหมู่ *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ชื่อเมนู *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผัดกะเพราหมูกรอบ"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ราคาเริ่มต้น (บาท) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="50"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">รายละเอียด / คำอธิบาย</label>
                <input
                  type="text"
                  placeholder="เช่น หมูกรอบแท้ ผัดพริกแห้งเข้มข้น"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  URL รูปภาพ (รองรับ Google Drive / เว็บรูปภาพ)
                </label>
                <input
                  type="url"
                  placeholder="เช่น ลิงก์แชร์ Google Drive หรือ https://..."
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 วางลิงก์แชร์ Google Drive (ตั้งค่าเป็น 'ทุกคนที่มีลิงก์') ระบบจะแปลงรูปให้อัตโนมัติ
                </p>
                {editImage && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                    <img
                      src={formatImageUrl(editImage)}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover bg-white border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-500 font-medium truncate">ตัวอย่างรูปภาพ</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold shadow-md"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-base text-slate-900">ยืนยันการลบเมนูอาหาร?</h3>
              <p className="text-xs text-slate-600 font-bold mt-1">
                "{deletingItem.name}" (฿{deletingItem.basePrice})
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                เมนูและสูตรตัดสต็อกจะถูกลบออกจากระบบ (ประวัติยอดขายและบิลในอดีตยังคงถูกบันทึกไว้อย่างถูกต้อง)
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20"
              >
                {isDeleting ? 'กำลังลบ...' : 'ลบเมนูนี้'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

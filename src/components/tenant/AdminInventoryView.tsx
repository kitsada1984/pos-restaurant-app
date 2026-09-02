'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  History,
  ChefHat,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Layers,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  X,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AdminInventoryView({ slug }: { slug: string }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'logs'>('stock');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isNewIngModalOpen, setIsNewIngModalOpen] = useState(false);
  const [selectedIng, setSelectedIng] = useState<any>(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInNote, setStockInNote] = useState('');
  const [saving, setSaving] = useState(false);

  // New Ingredient form
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('กรัม (g)');
  const [newIngCost, setNewIngCost] = useState('');
  const [newIngStock, setNewIngStock] = useState('');
  const [newIngMinAlert, setNewIngMinAlert] = useState('10');

  // Recipe Manager State
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredientId: string; quantity: number }[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ingRes, menuRes] = await Promise.all([
        fetch(`/api/r/${slug}/inventory`),
        fetch(`/api/r/${slug}/menu`),
      ]);
      const ingData = await ingRes.json();
      const menuData = await menuRes.json();
      if (ingData.ingredients) setIngredients(ingData.ingredients);
      if (Array.isArray(menuData)) {
        setMenuItems(menuData);
        if (menuData.length > 0 && !selectedMenuItem) {
          loadRecipeForItem(menuData[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const loadRecipeForItem = async (item: any) => {
    setSelectedMenuItem(item);
    try {
      const res = await fetch(`/api/r/${slug}/recipes?menuItemId=${item.id}`);
      const data = await res.json();
      if (data.recipes) {
        setRecipeIngredients(
          data.recipes.map((r: any) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
          }))
        );
      } else {
        setRecipeIngredients([]);
      }
    } catch (e) {
      setRecipeIngredients([]);
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIng || !stockInQty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STOCK_ADJUST',
          ingredientId: selectedIng.id,
          changeQty: parseFloat(stockInQty),
          reason: 'STOCK_IN',
          note: stockInNote || 'รับเข้าวัตถุดิบ',
        }),
      });
      if (res.ok) {
        showSuccess('รับเข้าวัตถุดิบสำเร็จ 📦', `เพิ่ม "${selectedIng.name}" จำนวน +${stockInQty} ${selectedIng.unit}`);
        setIsStockInModalOpen(false);
        setStockInQty('');
        setStockInNote('');
        fetchData();
      } else {
        showError('ไม่สามารถบันทึกรับเข้าได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกรับเข้าได้');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName || !newIngUnit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIngName,
          unit: newIngUnit,
          costPerUnit: parseFloat(newIngCost) || 0,
          currentStock: parseFloat(newIngStock) || 0,
          minStockAlert: parseFloat(newIngMinAlert) || 10,
        }),
      });
      if (res.ok) {
        showSuccess('เพิ่มวัตถุดิบใหม่สำเร็จ ✨', `เพิ่ม "${newIngName}" เข้าสู่คลังเรียบร้อย`);
        setIsNewIngModalOpen(false);
        setNewIngName('');
        setNewIngCost('');
        setNewIngStock('');
        fetchData();
      } else {
        showError('ไม่สามารถเพิ่มวัตถุดิบได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มวัตถุดิบได้');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!selectedMenuItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/r/${slug}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: selectedMenuItem.id,
          ingredients: recipeIngredients,
        }),
      });
      if (res.ok) {
        showSuccess('บันทึกสูตรอาหารสำเร็จ 🥗', `สูตรสำหรับ "${selectedMenuItem.name}" (${recipeIngredients.length} วัตถุดิบ)`);
        fetchData();
      } else {
        showError('บันทึกสูตรไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกสูตรอาหารได้');
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length;
  const totalStockValue = ingredients.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0);

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate cost of selected menu item
  const selectedItemCost = recipeIngredients.reduce((sum, r) => {
    const ing = ingredients.find((i) => i.id === r.ingredientId);
    return sum + (r.quantity || 0) * (ing?.costPerUnit || 0);
  }, 0);

  const selectedItemProfit = selectedMenuItem ? selectedMenuItem.basePrice - selectedItemCost : 0;
  const selectedItemMargin = selectedMenuItem && selectedMenuItem.basePrice > 0
    ? Math.round((selectedItemProfit / selectedMenuItem.basePrice) * 100)
    : 0;

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
            คลังวัตถุดิบ &amp; สูตรตัดสต็อก (Recipe BOM)
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            ระบบจัดการวัตถุดิบ ผูกสูตรอาหารตัดสต็อก Real-time และคำนวณต้นทุน/กำไรสุทธิระดับ Enterprise
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsNewIngModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            + เพิ่มวัตถุดิบใหม่
          </button>
        </div>
      </div>

      {/* KPI Cards (Equal Height Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 auto-rows-fr w-full">
        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">วัตถุดิบทั้งหมดในระบบ</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{ingredients.length} รายการ</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-500">แจ้งเตือนของใกล้หมด</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{lowStockCount} รายการ</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">มูลค่าสต็อกคงเหลือรวม</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ฿{totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Tabs (Smooth Isolated Scroll on Mobile) */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto scrollbar-none pb-1 w-full max-w-full">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'stock'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          รายการสต็อก &amp; รับเข้า
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'recipes'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          ผูกสูตรอาหาร (Recipe BOM)
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'logs'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติตัดสต็อก &amp; รับเข้า (Audit Logs)
        </button>
      </div>

      {/* TAB 1: Stock Inventory */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="p-3.5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อวัตถุดิบ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Isolated Horizontal Scroll Container for Table */}
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr className="whitespace-nowrap">
                  <th className="py-3 sm:py-4 px-4 sm:px-6">วัตถุดิบ</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">คงเหลือ</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">เกณฑ์เตือน</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">ต้นทุน/หน่วย</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">มูลค่าคงเหลือ</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">สถานะ</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStockAlert;
                  const isOut = ing.currentStock <= 0;

                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap">
                      <td className="py-3 sm:py-4 px-4 sm:px-6 font-extrabold text-slate-900">
                        {ing.name}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 font-black text-sm sm:text-base">
                        <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                          {ing.currentStock.toLocaleString()}
                        </span>{' '}
                        <span className="text-[11px] sm:text-xs text-slate-400 font-normal">{ing.unit}</span>
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-500">
                        {ing.minStockAlert.toLocaleString()} {ing.unit}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-700">
                        ฿{ing.costPerUnit.toFixed(2)} / {ing.unit}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 font-bold text-emerald-600">
                        ฿{(ing.currentStock * ing.costPerUnit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6">
                        {isOut ? (
                          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-red-100 text-red-700">
                            หมดสต็อก
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-700">
                            ใกล้หมด
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-700">
                            ปกติ
                          </span>
                        )}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedIng(ing);
                            setIsStockInModalOpen(true);
                          }}
                          className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition-all inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          รับเข้าสต็อก
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Recipe BOM Manager */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              เลือกเมนูเพื่อกำหนดสูตรอาหาร
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {menuItems.map((item) => {
                const isSelected = selectedMenuItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => loadRecipeForItem(item)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{item.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">ราคาขาย ฿{item.basePrice}</div>
                    </div>
                    <span className="text-xs font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-lg">
                      สูตร BOM
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe Editor */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
            {selectedMenuItem ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      สูตรอาหาร: {selectedMenuItem.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      เมื่อมีออเดอร์สั่งเมนูนี้ ระบบจะตัดสต็อกวัตถุดิบด้านล่างตามปริมาณที่กำหนดแบบ Real-time
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveRecipe}
                      disabled={saving}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      บันทึกสูตร
                    </button>
                  </div>
                </div>

                {/* Profit Margin Breakdown Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white grid grid-cols-3 gap-3 text-center">
                  <div className="p-2">
                    <span className="text-[11px] text-slate-400 block font-bold">ราคาขาย</span>
                    <span className="text-lg sm:text-xl font-black text-white">฿{selectedMenuItem.basePrice}</span>
                  </div>
                  <div className="p-2 border-x border-slate-700">
                    <span className="text-[11px] text-amber-400 block font-bold">ต้นทุนวัตถุดิบรวม</span>
                    <span className="text-lg sm:text-xl font-black text-amber-400">
                      ฿{selectedItemCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2">
                    <span className="text-[11px] text-emerald-400 block font-bold">กำไรขั้นต้น (Margin)</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400">
                      ฿{selectedItemProfit.toFixed(2)} ({selectedItemMargin}%)
                    </span>
                  </div>
                </div>

                {/* Recipe Ingredient Rows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">วัตถุดิบที่ใช้ประกอบอาหาร</span>
                    <button
                      onClick={() => {
                        if (ingredients.length > 0) {
                          setRecipeIngredients([
                            ...recipeIngredients,
                            { ingredientId: ingredients[0].id, quantity: 100 },
                          ]);
                        }
                      }}
                      className="text-xs font-extrabold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มวัตถุดิบในสูตร
                    </button>
                  </div>

                  {recipeIngredients.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      ยังไม่มีการผูกสูตรวัตถุดิบสำหรับเมนูนี้ กดปุ่ม &quot;เพิ่มวัตถุดิบในสูตร&quot; เพื่อเริ่มต้น
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recipeIngredients.map((item, idx) => {
                        const ing = ingredients.find((i) => i.id === item.ingredientId);
                        const rowCost = (item.quantity || 0) * (ing?.costPerUnit || 0);

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1">
                              <select
                                value={item.ingredientId}
                                onChange={(e) => {
                                  const updated = [...recipeIngredients];
                                  updated[idx].ingredientId = e.target.value;
                                  setRecipeIngredients(updated);
                                }}
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                              >
                                {ingredients.map((ingOption) => (
                                  <option key={ingOption.id} value={ingOption.id}>
                                    {ingOption.name} (หน่วย: {ingOption.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="ปริมาณ"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...recipeIngredients];
                                  updated[idx].quantity = parseFloat(e.target.value) || 0;
                                  setRecipeIngredients(updated);
                                }}
                                className="w-24 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-center"
                              />
                              <span className="text-xs text-slate-400 font-medium w-16">
                                {ing?.unit}
                              </span>
                            </div>

                            <div className="text-right w-24">
                              <span className="text-xs font-extrabold text-slate-800">
                                ฿{rowCost.toFixed(2)}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">เลือกเมนูอาหารด้านซ้ายเพื่อดูสูตร</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 w-full">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
            <span>ประวัติการเคลื่อนไหวสต็อกล่าสุด (Stock Audit Logs)</span>
          </h3>
          <div className="divide-y divide-slate-100 w-full overflow-hidden">
            {ingredients.flatMap((i) => (i.stockLogs || []).map((l: any) => ({ ...l, ingredientName: i.name, unit: i.unit })))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 30)
              .map((log) => {
                const isPositive = log.changeQty > 0;
                return (
                  <div key={log.id} className="py-3 sm:py-3.5 flex items-center justify-between gap-2.5 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-extrabold text-slate-900 truncate">{log.ingredientName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <span>{log.note || log.reason || 'ปรับสต็อก'}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`font-black text-xs sm:text-sm ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isPositive ? '+' : ''}{log.changeQty.toLocaleString()} {log.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL: Stock In */}
      {isStockInModalOpen && selectedIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">รับเข้าสต็อก: {selectedIng.name}</h3>
              <button onClick={() => setIsStockInModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  จำนวนที่รับเข้า ({selectedIng.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`เช่น 5000 หรือ 50`}
                  value={stockInQty}
                  onChange={(e) => setStockInQty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-base focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น ซื้อจากตลาดเช้า / สั่งร้านค้าส่ง"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-orange-50 rounded-xl text-xs text-orange-800 font-medium">
                ยอดคงเหลือปัจจุบัน: <strong>{selectedIng.currentStock} {selectedIng.unit}</strong> ➜ หลังรับเข้า:{' '}
                <strong>{(selectedIng.currentStock + (parseFloat(stockInQty) || 0)).toLocaleString()} {selectedIng.unit}</strong>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {saving ? 'กำลังบันทึก...' : 'ยืนยันรับเข้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Ingredient */}
      {isNewIngModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">เพิ่มรายการวัตถุดิบใหม่</h3>
              <button onClick={() => setIsNewIngModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อวัตถุดิบ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กุ้งขาวสด, น้ำปลาแท้, น้ำตาลทราย"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หน่วยนับ</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="กรัม (g)">กรัม (g)</option>
                    <option value="กิโลกรัม (kg)">กิโลกรัม (kg)</option>
                    <option value="ฟอง">ฟอง</option>
                    <option value="มล. (ml)">มล. (ml)</option>
                    <option value="ลิตร (L)">ลิตร (L)</option>
                    <option value="ชิ้น">ชิ้น</option>
                    <option value="กล่อง">กล่อง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ต้นทุนต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 0.16 หรือ 4.2"
                    value={newIngCost}
                    onChange={(e) => setNewIngCost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนคงเหลือเริ่มต้น</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 1000"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เตือนเมื่อเหลือน้อยกว่า</label>
                  <input
                    type="number"
                    step="1"
                    value={newIngMinAlert}
                    onChange={(e) => setNewIngMinAlert(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewIngModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {saving ? 'กำลังบันทึก...' : 'เพิ่มวัตถุดิบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

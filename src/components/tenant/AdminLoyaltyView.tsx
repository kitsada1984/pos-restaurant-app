'use client';

import React, { useState, useEffect } from 'react';
import {
  Gift,
  Users,
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Percent,
  Calendar,
  Save,
  Loader2,
  X,
  Phone,
  DollarSign,
  Sparkles,
  Award,
  Edit2,
  Sliders,
  TrendingUp,
  Check,
  Coffee,
  UtensilsCrossed,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AdminLoyaltyView({ slug }: { slug: string }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<'rewards' | 'members' | 'promotions'>('rewards');
  const [members, setMembers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pointsRate, setPointsRate] = useState(25);
  const [pointValue, setPointValue] = useState(1);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modal State: Reward Milestone
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPoints, setRewardPoints] = useState('10');
  const [rewardType, setRewardType] = useState<'FREE_ITEM' | 'DISCOUNT'>('FREE_ITEM');
  const [rewardDiscountAmount, setRewardDiscountAmount] = useState('20');
  const [rewardFreeItemId, setRewardFreeItemId] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [savingReward, setSavingReward] = useState(false);

  // Modal State: Adjust Points
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState('10');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Modal State: Promo Code
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDiscountType, setPromoDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [promoDiscountValue, setPromoDiscountValue] = useState('');
  const [promoMinSpend, setPromoMinSpend] = useState('0');
  const [savingPromo, setSavingPromo] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [memRes, promoRes, rewardRes] = await Promise.all([
        fetch(`/api/r/${slug}/members`),
        fetch(`/api/r/${slug}/promotions`),
        fetch(`/api/r/${slug}/rewards`),
      ]);
      const memData = await memRes.json();
      const promoData = await promoRes.json();
      const rewardData = await rewardRes.json();

      if (memData.members) setMembers(memData.members);
      if (memData.pointsRate) setPointsRate(memData.pointsRate);
      if (memData.pointValue) setPointValue(memData.pointValue);
      if (promoData.promotions) setPromotions(promoData.promotions);
      if (rewardData.rewards) setRewards(rewardData.rewards);
      if (rewardData.menuItems) setMenuItems(rewardData.menuItems);
    } catch (e) {
      console.error(e);
      showError('ไม่สามารถโหลดข้อมูลได้', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  // Save Store Points Rate Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/r/${slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          pointsRate: parseFloat(pointsRate.toString()) || 25,
          pointValue: parseFloat(pointValue.toString()) || 1,
        }),
      });
      if (res.ok) {
        showSuccess('บันทึกการตั้งค่าแต้มสำเร็จ ⚙️', `อัตรา ฿${pointsRate} = 1 แต้ม`);
      } else {
        showError('ไม่สามารถบันทึกได้');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Create/Edit Reward Modal
  const openRewardModal = (reward?: any) => {
    if (reward) {
      setEditingRewardId(reward.id);
      setRewardTitle(reward.title);
      setRewardPoints(reward.pointsRequired.toString());
      setRewardType(reward.rewardType || 'FREE_ITEM');
      setRewardDiscountAmount(reward.discountAmount?.toString() || '0');
      setRewardFreeItemId(reward.freeMenuItemId || '');
      setRewardDescription(reward.description || '');
    } else {
      setEditingRewardId(null);
      setRewardTitle('');
      setRewardPoints('10');
      setRewardType('FREE_ITEM');
      setRewardDiscountAmount('20');
      setRewardFreeItemId(menuItems[0]?.id || '');
      setRewardDescription('');
    }
    setIsRewardModalOpen(true);
  };

  // Create / Update Reward Milestone
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle || !rewardPoints) return;
    setSavingReward(true);
    try {
      const method = editingRewardId ? 'PUT' : 'POST';
      const res = await fetch(`/api/r/${slug}/rewards`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRewardId,
          title: rewardTitle,
          pointsRequired: parseInt(rewardPoints),
          rewardType,
          discountAmount: rewardType === 'DISCOUNT' ? parseFloat(rewardDiscountAmount) : 0,
          freeMenuItemId: rewardType === 'FREE_ITEM' ? rewardFreeItemId : null,
          description: rewardDescription,
        }),
      });

      if (res.ok) {
        showSuccess(
          editingRewardId ? 'แก้ไขของรางวัลสำเร็จ 🎉' : 'เพิ่มของรางวัลใหม่สำเร็จ 🎉',
          `${rewardTitle} (${rewardPoints} แต้ม)`
        );
        setIsRewardModalOpen(false);
        fetchData();
      } else {
        showError('ไม่สามารถบันทึกของรางวัลได้');
      }
    } catch (e) {
      console.error(e);
      showError('เกิดข้อผิดพลาด');
    } finally {
      setSavingReward(false);
    }
  };

  // Delete Reward
  const handleDeleteReward = async (id: string) => {
    if (!confirm('ยืนยันลบของรางวัลแลกแต้มนี้?')) return;
    try {
      const res = await fetch(`/api/r/${slug}/rewards?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSuccess('ลบของรางวัลเรียบร้อย 🗑️');
        fetchData();
      } else {
        showError('ไม่สามารถลบของรางวัลได้');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด');
    }
  };

  // Adjust Points
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !adjustPointsDelta) return;
    setAdjusting(true);
    try {
      const res = await fetch(`/api/r/${slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUST_POINTS',
          phone: selectedMember.phone,
          pointsDelta: parseInt(adjustPointsDelta),
          reason: adjustReason,
        }),
      });
      if (res.ok) {
        showSuccess('ปรับแต้มสำเร็จ ⭐', `เบอร์ ${selectedMember.phone} (${adjustPointsDelta > '0' ? '+' : ''}${adjustPointsDelta} แต้ม)`);
        setIsAdjustModalOpen(false);
        setSelectedMember(null);
        fetchData();
      } else {
        showError('ไม่สามารถปรับแต้มได้');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด');
    } finally {
      setAdjusting(false);
    }
  };

  // Create Promo Code
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoTitle || !promoDiscountValue) return;
    setSavingPromo(true);
    try {
      const res = await fetch(`/api/r/${slug}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          title: promoTitle,
          discountType: promoDiscountType,
          discountValue: parseFloat(promoDiscountValue),
          minSpend: parseFloat(promoMinSpend) || 0,
        }),
      });
      if (res.ok) {
        showSuccess('สร้างคูปองส่วนลดสำเร็จ 🎉', `โค้ด "${promoCode}" พร้อมใช้งานแล้ว`);
        setIsPromoModalOpen(false);
        setPromoCode('');
        setPromoTitle('');
        setPromoDiscountValue('');
        setPromoMinSpend('0');
        fetchData();
      } else {
        showError('ไม่สามารถสร้างคูปองได้', 'โค้ดส่วนลดนี้อาจมีอยู่แล้ว');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด');
    } finally {
      setSavingPromo(false);
    }
  };

  // Delete Promo
  const handleDeletePromo = async (id: string) => {
    if (!confirm('ยืนยันลบคูปองส่วนลดนี้?')) return;
    try {
      const res = await fetch(`/api/r/${slug}/promotions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSuccess('ลบคูปองส่วนลดเรียบร้อย 🗑️');
        fetchData();
      } else {
        showError('ไม่สามารถลบคูปองได้');
      }
    } catch (e) {
      showError('เกิดข้อผิดพลาด');
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.phone.includes(searchTerm) ||
      (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm w-full">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
            ระบบสะสมแต้ม &amp; รางวัล CRM
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            สะสมแต้มอัตโนมัติตามเบอร์โทรศัพท์ลูกค้า • ตั้งค่าของรางวัลเมื่อถึงเป้าหมาย (Milestones) • คูปองโปรโมชั่น
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rewards' && (
            <button
              onClick={() => openRewardModal()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              + เพิ่มของรางวัลแลกแต้ม
            </button>
          )}

          {activeTab === 'promotions' && (
            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              + สร้างคูปองส่วนลดใหม่
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards & Points Rate Setting */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-4 auto-rows-fr w-full">
        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">สมาชิกทั้งหมด</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{members.length} คน</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">ของรางวัลแลกแต้ม</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{rewards.length} รายการ</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400">คูปองโปรโมชั่น</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {promotions.filter((p) => p.isActive).length} โค้ด
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Setting Card: Points Earning Rate */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              อัตราสะสมแต้ม (บาท = 1 แต้ม)
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">฿</span>
              <input
                type="number"
                min="1"
                step="1"
                value={pointsRate}
                onChange={(e) => setPointsRate(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-extrabold focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              บันทึก
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            ซื้อครบทุก ฿{pointsRate} บาท รับทันที 1 แต้ม
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto scrollbar-none pb-1 w-full max-w-full">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'rewards'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          🎁 ของรางวัลแลกแต้ม (Milestones)
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'members'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          👥 รายชื่อสมาชิก &amp; แต้มสะสม
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`px-4 sm:px-5 py-2.5 sm:py-3 font-extrabold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'promotions'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          🏷️ คูปองส่วนลด &amp; โค้ดโปรโมชั่น
        </button>
      </div>

      {/* TAB 1: Loyalty Reward Milestones */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>เคล็ดลับ:</strong> ตั้งของรางวัลเป็นขั้นบันได (เช่น 10 แต้ม ฟรีไข่ดาว, 20 แต้ม ลด 30 บ., 50 แต้ม ฟรีกะเพราหมูกรอบ) เพื่อกระตุ้นให้ลูกค้ากลับมาทานซ้ำ!
              </span>
            </div>
            <button
              onClick={() => openRewardModal()}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 underline flex items-center gap-1 whitespace-nowrap"
            >
              + เพิ่มของรางวัล
            </button>
          </div>

          {rewards.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                <Award className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">ยังไม่มีการตั้งค่าของรางวัลแลกแต้ม</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                เริ่มต้นสร้างของรางวัลสะสมแต้ม เพื่อให้ลูกค้าได้รับสิทธิประโยชน์และกลับมาทานอาหารที่ร้านอย่างต่อเนื่อง
              </p>
              <button
                onClick={() => openRewardModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-md hover:bg-orange-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                สร้างของรางวัลแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((r) => {
                const menuItem = menuItems.find((m) => m.id === r.freeMenuItemId);
                return (
                  <div
                    key={r.id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-orange-100 text-orange-700 tracking-wider flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-orange-600" />
                          {r.pointsRequired} แต้ม
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {r.isActive ? 'เปิดให้แลก' : 'ปิดชั่วคราว'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900 text-base">{r.title}</h3>
                        {r.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                        )}
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">ประเภทรางวัล</span>
                          <span className="font-extrabold text-slate-800">
                            {r.rewardType === 'FREE_ITEM' ? '🍜 ฟรีเมนูอาหาร' : '💵 ส่วนลดเงินสด'}
                          </span>
                        </div>

                        {r.rewardType === 'FREE_ITEM' && menuItem && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">เมนูที่แถม</span>
                            <span className="font-bold text-orange-600">{menuItem.name} (มูลค่า ฿{menuItem.basePrice})</span>
                          </div>
                        )}

                        {r.rewardType === 'DISCOUNT' && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">มูลค่าส่วนลด</span>
                            <span className="text-sm font-black text-emerald-600">ลด ฿{r.discountAmount}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">แลกไปแล้ว</span>
                          <span className="font-bold text-slate-700">{r.usageCount || 0} ครั้ง</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => openRewardModal(r)}
                        className="text-slate-600 hover:text-orange-600 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        แก้ไข
                      </button>

                      <button
                        onClick={() => handleDeleteReward(r.id)}
                        className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ลบ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Members CRM */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="p-3.5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเบอร์โทร หรือชื่อสมาชิก..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              แสดงสมาชิกทั้งหมด <strong>{filteredMembers.length}</strong> คน
            </div>
          </div>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr className="whitespace-nowrap">
                  <th className="py-3 sm:py-4 px-4 sm:px-6">เบอร์โทรศัพท์</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">ชื่อสมาชิก</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">แต้มคงเหลือ</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">ยอดซื้อสะสม</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">จำนวนครั้ง</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6">วันที่สมัคร</th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6 text-center">จัดการแต้ม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap">
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-black text-slate-900 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                      <span>{m.phone}</span>
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-bold text-slate-700">
                      {m.name || 'ลูกค้าทั่วไป'}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-black text-orange-600 text-sm sm:text-base">
                      {m.points.toLocaleString()} <span className="text-[11px] sm:text-xs font-normal">แต้ม</span>
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-900 font-bold">
                      ฿{m.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-600">
                      {m.visitCount} ครั้ง
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-400 text-xs">
                      {new Date(m.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-center">
                      <button
                        onClick={() => {
                          setSelectedMember(m);
                          setAdjustPointsDelta('10');
                          setAdjustReason('');
                          setIsAdjustModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition-colors"
                      >
                        +/- ปรับแต้ม
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Promotions */}
      {activeTab === 'promotions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-orange-100 text-orange-700 tracking-wider">
                    {p.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                    เปิดใช้งาน
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{p.title}</h3>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">มูลค่าส่วนลด</span>
                  <span className="text-lg font-black text-orange-600">
                    {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `฿${p.discountValue}`}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div>ยอดซื้อขั้นต่ำ: <strong>฿{p.minSpend}</strong></div>
                  <div>ใช้ไปแล้ว: <strong>{p.usageCount} ครั้ง</strong></div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeletePromo(p.id)}
                  className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบโค้ด
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create / Edit Reward Milestone */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                {editingRewardId ? 'แก้ไขของรางวัลแลกแต้ม' : 'เพิ่มของรางวัลแลกแต้มใหม่'}
              </h3>
              <button onClick={() => setIsRewardModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อของรางวัล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ฟรีไข่ดาวกรอบ 1 ฟอง, ส่วนลด 30 บาท"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">แต้มที่ต้องใช้</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="เช่น 10, 20, 50"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทของรางวัล</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="FREE_ITEM">🍜 ฟรีเมนูอาหาร</option>
                    <option value="DISCOUNT">💵 ส่วนลดเงินสด (฿)</option>
                  </select>
                </div>
              </div>

              {rewardType === 'FREE_ITEM' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เลือกเมนูอาหารในร้านที่แถมฟรี</label>
                  <select
                    value={rewardFreeItemId}
                    onChange={(e) => setRewardFreeItemId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">-- เลือกเมนูอาหาร --</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (฿{item.basePrice})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">มูลค่าส่วนลด (บาท)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="เช่น 20, 50, 100"
                    value={rewardDiscountAmount}
                    onChange={(e) => setRewardDiscountAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">คำอธิบาย / เงื่อนไขเพิ่มเติม (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น จำกัด 1 สิทธิ์ต่อโต๊ะ, ใช้ได้เฉพาะทานที่ร้าน"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingReward}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {savingReward ? 'กำลังบันทึก...' : 'บันทึกของรางวัล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Points */}
      {isAdjustModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">ปรับแต้มสะสม</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-100 text-xs">
              <div className="text-slate-600">สมาชิก: <strong>{selectedMember.name || 'ลูกค้าทั่วไป'}</strong></div>
              <div className="text-slate-600 mt-0.5">เบอร์โทร: <strong>{selectedMember.phone}</strong></div>
              <div className="text-orange-600 font-black mt-1">แต้มปัจจุบัน: {selectedMember.points} แต้ม</div>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  จำนวนแต้มที่ต้องการเพิ่ม / ลด (+/-)
                </label>
                <input
                  type="number"
                  required
                  placeholder="เช่น +10 เพื่อเพิ่มแต้ม, -5 เพื่อหักแต้ม"
                  value={adjustPointsDelta}
                  onChange={(e) => setAdjustPointsDelta(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">เหตุผลในการปรับแต้ม (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น โปรโมชั่นพิเศษวันเกิด, แก้ไขแต้มผิด"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs"
                >
                  {adjusting ? 'กำลังบันทึก...' : 'ยืนยันปรับแต้ม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Promo */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">สร้างคูปองส่วนลดใหม่</h3>
              <button onClick={() => setIsPromoModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสโค้ด (Coupon Code)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น PROMO50, DISC10, AROI20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black tracking-wider focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อโปรโมชั่น / คำอธิบาย</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ส่วนลดเปิดร้านใหม่ 50 บาท"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทส่วนลด</label>
                  <select
                    value={promoDiscountType}
                    onChange={(e) => setPromoDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="FIXED">ลดเป็นบาท (฿)</option>
                    <option value="PERCENT">ลดเป็นเปอร์เซ็นต์ (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">มูลค่าส่วนลด</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder={promoDiscountType === 'PERCENT' ? 'เช่น 10 (ลด 10%)' : 'เช่น 50 (ลด 50 บ.)'}
                    value={promoDiscountValue}
                    onChange={(e) => setPromoDiscountValue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ยอดสั่งซื้อขั้นต่ำ (บาท)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="0 = ไม่มีขั้นต่ำ"
                  value={promoMinSpend}
                  onChange={(e) => setPromoMinSpend(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20"
                >
                  {savingPromo ? 'กำลังบันทึก...' : 'สร้างคูปอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

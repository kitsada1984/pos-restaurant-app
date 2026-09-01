'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit, Check, X, Loader2, Sparkles } from 'lucide-react';

export default function PlatformAdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-admin/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingPlan.id ? 'PUT' : 'POST';
      const res = await fetch('/api/platform-admin/plans', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan),
      });

      if (res.ok) {
        setEditingPlan(null);
        fetchPlans();
      } else {
        const d = await res.json();
        alert(d.error || 'บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            จัดการแพ็กเกจราคา (SaaS Plans)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            กำหนดราคาแพ็กเกจรายเดือน/รายปี จำนวนวันที่ได้รับ และสิทธิ์การใช้งาน
          </p>
        </div>
        <button
          onClick={() =>
            setEditingPlan({
              name: '',
              price: 290,
              durationDays: 30,
              maxTables: 15,
              description: '',
              sortOrder: plans.length + 1,
              isActive: true,
            })
          }
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-orange-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มแพ็กเกจใหม่</span>
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-3xl bg-slate-900/90 border flex flex-col justify-between transition-all ${
                p.isActive ? 'border-slate-800 shadow-xl' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    ลำดับที่ {p.sortOrder}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {p._count?.stores || 0} ร้านใช้งานอยู่
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white">{p.name}</h3>

                <div className="pt-2">
                  <span className="text-3xl font-black text-white">฿{p.price.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1">/ {p.durationDays} วัน</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                  {p.description || 'ไม่มีคำอธิบาย'}
                </p>

                <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">ระยะเวลา:</span>
                    <span className="font-bold text-white">{p.durationDays} วัน</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">โต๊ะสูงสุด:</span>
                    <span className="font-bold text-white">{p.maxTables} โต๊ะ</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">สถานะ:</span>
                    <span className={`font-bold ${p.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.isActive ? 'เปิดขาย' : 'ปิดชั่วคราว'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-800">
                <button
                  onClick={() => setEditingPlan(p)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>แก้ไขแพ็กเกจ</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-white">
              {editingPlan.id ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจใหม่'}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">ชื่อแพ็กเกจ *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="เช่น Basic รายเดือน"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ราคา (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">จำนวนวัน (วัน) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingPlan.durationDays}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">จำนวนโต๊ะสูงสุด *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingPlan.maxTables}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxTables: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ลำดับการแสดง</label>
                  <input
                    type="number"
                    value={editingPlan.sortOrder}
                    onChange={(e) => setEditingPlan({ ...editingPlan, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">คำอธิบาย</label>
                <textarea
                  rows={2}
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="รายละเอียดจุดเด่นของแพ็กเกจนี้..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={editingPlan.isActive}
                  onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
                />
                <label htmlFor="isActiveCheck" className="text-slate-300 font-bold">
                  เปิดให้ร้านค้าเลือกแพ็กเกจนี้ได้
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>บันทึกแพ็กเกจ</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

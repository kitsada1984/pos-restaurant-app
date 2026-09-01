'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  LayoutGrid,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  QrCode,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  X,
  Printer,
  Utensils,
  Search,
  RotateCcw,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function TableManagementPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'PAYMENT_PENDING'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Form States
  const [addForm, setAddForm] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [batchCount, setBatchCount] = useState<number>(5);
  const [targetTotalCount, setTargetTotalCount] = useState<number>(15);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [selectedQrTable, setSelectedQrTable] = useState<any>(null);

  // Submitting States & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [tablesRes, settingsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/settings'),
      ]);
      const [tData, sData] = await Promise.all([
        tablesRes.json().catch(() => []),
        settingsRes.json().catch(() => null),
      ]);
      setTables(Array.isArray(tData) ? tData : []);
      setStore(sData?.error ? null : sData);
    } catch (err) {
      console.error('Error loading table data:', err);
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
              payload.type === 'TABLE_UPDATED' ||
              payload.type === 'ORDER_CREATED' ||
              payload.type === 'ORDER_UPDATED' ||
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
  }, []);

  const nextSuggestedId = useMemo(() => {
    const existingIds = new Set(tables.map((t) => t.id));
    let id = 1;
    while (existingIds.has(id)) {
      id++;
    }
    return id;
  }, [tables]);

  const openAddModal = () => {
    setAddForm({
      id: String(nextSuggestedId),
      name: `โต๊ะ ${nextSuggestedId}`,
    });
    setIsAddModalOpen(true);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_TABLE',
          id: addForm.id ? parseInt(addForm.id, 10) : undefined,
          name: addForm.name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'เกิดข้อผิดพลาดในการเพิ่มโต๊ะ');
      } else {
        showFeedback('success', `เพิ่ม ${data.name || `โต๊ะ ${data.id}`} สำเร็จแล้ว`);
        setIsAddModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showFeedback('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchAdd = async (count: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BATCH_CREATE',
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'เกิดข้อผิดพลาดในการเพิ่มโต๊ะ');
      } else {
        showFeedback('success', `เพิ่มโต๊ะสำเร็จจำนวน ${data.count} โต๊ะ`);
        setIsBatchModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showFeedback('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetTargetTotal = async () => {
    if (targetTotalCount <= 0 || targetTotalCount > 100) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_TABLE_COUNT',
          targetCount: targetTotalCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'เกิดข้อผิดพลาด');
      } else {
        showFeedback('success', `ตั้งค่าจำนวนโต๊ะเป็น ${targetTotalCount} โต๊ะเรียบร้อย`);
        setIsBatchModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showFeedback('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_TABLE',
          tableId: editingTable.id,
          name: editingTable.name.trim(),
          status: editingTable.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'เกิดข้อผิดพลาดในการแก้ไข');
      } else {
        showFeedback('success', `แก้ไขข้อมูลโต๊ะ ${editingTable.id} เรียบร้อยแล้ว`);
        setIsEditModalOpen(false);
        setEditingTable(null);
        fetchData();
      }
    } catch (err) {
      showFeedback('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async (tableId: number, tableName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${tableName}" (หมายเลข ${tableId})?`)) return;

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_TABLE',
          tableId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'ไม่สามารถลบโต๊ะได้');
      } else {
        showFeedback('success', `ลบโต๊ะ ${tableId} เรียบร้อยแล้ว`);
        fetchData();
      }
    } catch (err) {
      showFeedback('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleClearTable = async (tableId: number) => {
    if (!confirm(`ต้องการเคลียร์โต๊ะ ${tableId} ให้เป็นสถานะว่างใช่หรือไม่?`)) return;
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLEAR_TABLE',
          tableId,
          cancelUnpaid: true,
        }),
      });
      if (res.ok) {
        showFeedback('success', `เคลียร์โต๊ะ ${tableId} เป็นสถานะว่างแล้ว`);
        fetchData();
      }
    } catch (err) {
      showFeedback('error', 'เกิดข้อผิดพลาด');
    }
  };

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch =
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.id).includes(searchTerm);
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tables, searchTerm, statusFilter]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Top Banner Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-16 sm:top-20 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-xl text-slate-800">จัดการผังโต๊ะอาหาร</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-700">
                  {tables.length} โต๊ะในระบบ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                เพิ่มโต๊ะใหม่, แก้ไขชื่อโต๊ะ, กำหนดจำนวนโต๊ะ และพิมพ์ QR Code ประจำโต๊ะ
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-md shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มโต๊ะใหม่</span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Layers className="w-4 h-4 text-orange-400" />
              <span>เพิ่มหลายโต๊ะด่วน</span>
            </button>

            <Link
              href="/admin/qr-codes"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <QrCode className="w-4 h-4 text-slate-500" />
              <span>พิมพ์ QR ทั้งหมด</span>
            </Link>

            <button
              onClick={fetchData}
              title="รีเฟรชข้อมูล"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                : 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block">จำนวนโต๊ะทั้งหมด</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{tables.length}</span>
              <span className="text-xs text-slate-400 font-bold">โต๊ะ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
            <span className="text-xs font-bold text-emerald-700 block">โต๊ะว่างพร้อมใช้</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">
                {tables.filter((t) => t.status === 'AVAILABLE').length}
              </span>
              <span className="text-xs text-emerald-500 font-bold">โต๊ะ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm bg-gradient-to-br from-white to-orange-50/30">
            <span className="text-xs font-bold text-orange-700 block">กำลังรับประทาน</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-orange-600">
                {tables.filter((t) => t.status === 'OCCUPIED').length}
              </span>
              <span className="text-xs text-orange-500 font-bold">โต๊ะ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
            <span className="text-xs font-bold text-amber-700 block">รอเช็คบิล / ชำระเงิน</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-amber-600">
                {tables.filter((t) => t.status === 'PAYMENT_PENDING').length}
              </span>
              <span className="text-xs text-amber-500 font-bold">โต๊ะ</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อหรือหมายเลขโต๊ะ..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({tables.length})
            </button>
            <button
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ว่าง ({tables.filter((t) => t.status === 'AVAILABLE').length})
            </button>
            <button
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'OCCUPIED'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              กำลังทาน ({tables.filter((t) => t.status === 'OCCUPIED').length})
            </button>
            <button
              onClick={() => setStatusFilter('PAYMENT_PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'PAYMENT_PENDING'
                  ? 'bg-amber-500 text-slate-900 font-extrabold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              รอคิดเงิน ({tables.filter((t) => t.status === 'PAYMENT_PENDING').length})
            </button>
          </div>
        </div>

        {/* Table Cards Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-xs text-slate-400 font-semibold">กำลังโหลดข้อมูลผังโต๊ะ...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto my-8 space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
              <LayoutGrid className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">ไม่พบข้อมูลโต๊ะ</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm ? 'ไม่พบโต๊ะที่ตรงกับคำค้นหา' : 'ยังไม่มีโต๊ะอาหารในระบบ'}
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md"
            >
              + เพิ่มโต๊ะแรกเลย
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredTables.map((table) => {
              const isAvailable = table.status === 'AVAILABLE';
              const isOccupied = table.status === 'OCCUPIED';
              const isPending = table.status === 'PAYMENT_PENDING';
              const tableUrl = `${origin}/table/${table.id}`;

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-3xl p-5 border-2 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 relative ${
                    isPending
                      ? 'border-amber-400 bg-amber-50/10'
                      : isOccupied
                      ? 'border-orange-200'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Number & Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-inner ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isOccupied
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span className="text-[9px] font-bold text-slate-400 -mb-1">โต๊ะ</span>
                        <span className="text-lg">{table.id}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base leading-tight">
                          {table.name}
                        </h3>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPending
                                ? 'bg-amber-500 animate-ping'
                                : isOccupied
                                ? 'bg-orange-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold ${
                              isPending
                                ? 'text-amber-700'
                                : isOccupied
                                ? 'text-orange-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {isPending
                              ? 'รอคิดเงิน'
                              : isOccupied
                              ? `กำลังทาน (${table.activeOrdersCount || 0} บิล)`
                              : 'โต๊ะว่าง'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code thumbnail button */}
                    <button
                      onClick={() => {
                        setSelectedQrTable(table);
                        setIsQrModalOpen(true);
                      }}
                      title="ดู QR Code โต๊ะนี้"
                      className="p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 text-slate-400 border border-slate-200/80 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Order Summary if occupied */}
                  {isOccupied || isPending ? (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>ยอดบิลปัจจุบัน:</span>
                        <span className="text-orange-600 font-extrabold">
                          {formatPrice(table.totalAmount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>จำนวนอาหาร:</span>
                        <span>{table.totalItems || 0} จาน</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 text-[11px] font-semibold text-emerald-700 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>พร้อมรับลูกค้าและสั่งอาหาร</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingTable({ id: table.id, name: table.name, status: table.status });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                        title="แก้ไขชื่อโต๊ะ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {table.status !== 'AVAILABLE' && (
                        <button
                          onClick={() => handleClearTable(table.id)}
                          className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-all"
                          title="เคลียร์สถานะโต๊ะเป็นว่าง"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <Link
                        href={`/table/${table.id}`}
                        target="_blank"
                        className="p-2 rounded-xl text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                        title="เปิดทดสอบหน้าลูกค้า"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <button
                      onClick={() => handleDeleteTable(table.id, table.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      title="ลบโต๊ะ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ADD TABLE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <LayoutGrid className="w-5 h-5 text-orange-500" />
                <span>เพิ่มโต๊ะอาหารใหม่</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเลขโต๊ะ (ID):
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={addForm.id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddForm({
                      ...addForm,
                      id: val,
                      name: addForm.name.startsWith('โต๊ะ ') ? `โต๊ะ ${val}` : addForm.name,
                    });
                  }}
                  placeholder="เช่น 11, 12, 20"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  หมายเลขจะถูกนำไปใช้ใน URL สแกน เช่น <code>/table/{addForm.id || '...'}</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโต๊ะที่แสดงในระบบ:
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="เช่น โต๊ะ 11, VIP 1, ระเบียง 2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : '+ ยืนยันเพิ่มโต๊ะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH ADD MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Layers className="w-5 h-5 text-orange-500" />
                <span>เพิ่มหลายโต๊ะด่วน</span>
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option A: Quick Add N Tables */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-800">
                ตัวเลือก 1: เพิ่มจำนวนโต๊ะเพิ่มต่อจากเดิม
              </h4>
              <p className="text-[11px] text-slate-500">
                ระบบจะสร้างโต๊ะอัตโนมัติต่อจากหมายเลขล่าสุด (เริ่มจาก โต๊ะ {nextSuggestedId})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleBatchAdd(num)}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-extrabold text-xs shadow-sm transition-all"
                  >
                    + เพิ่ม {num} โต๊ะ
                  </button>
                ))}
              </div>
            </div>

            {/* Option B: Set Table Count */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-800">
                ตัวเลือก 2: กำหนดจำนวนโต๊ะทั้งหมดในร้าน
              </h4>
              <p className="text-[11px] text-slate-500">
                สร้างโต๊ะ 1 ถึง N ครบตามจำนวนที่ระบุทันที
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={targetTotalCount}
                  onChange={(e) => setTargetTotalCount(parseInt(e.target.value, 10) || 10)}
                  className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSetTargetTotal}
                  className="flex-1 py-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังสร้าง...' : `สร้างผัง ${targetTotalCount} โต๊ะ`}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TABLE MODAL */}
      {isEditModalOpen && editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-orange-500" />
                <span>แก้ไขข้อมูลโต๊ะ {editingTable.id}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโต๊ะ:
                </label>
                <input
                  type="text"
                  required
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานะโต๊ะ:
                </label>
                <select
                  value={editingTable.status}
                  onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="AVAILABLE">🟢 โต๊ะว่าง (AVAILABLE)</option>
                  <option value="OCCUPIED">🟠 กำลังทาน (OCCUPIED)</option>
                  <option value="PAYMENT_PENDING">🟡 รอคิดเงิน (PAYMENT_PENDING)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE TABLE QR MODAL */}
      {isQrModalOpen && selectedQrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                QR Code ประจำ {selectedQrTable.name}
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-inner inline-block">
              <QRCodeSVG
                value={`${origin}/table/${selectedQrTable.id}`}
                size={180}
                level="M"
              />
            </div>

            <div className="space-y-1">
              <p className="font-bold text-xs text-slate-700">
                สแกนเพื่อสั่งอาหารที่ {selectedQrTable.name}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {origin}/table/{selectedQrTable.id}
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <Link
                href={`/table/${selectedQrTable.id}`}
                target="_blank"
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1"
              >
                <span>ทดลองสั่ง</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/admin/qr-codes"
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ป้าย</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
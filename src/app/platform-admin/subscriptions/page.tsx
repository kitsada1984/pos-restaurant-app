'use client';

import React, { useEffect, useState } from 'react';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  Calendar,
  Building2,
} from 'lucide-react';

export default function PlatformAdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/platform-admin/subscriptions?status=${statusFilter}`);
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/platform-admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchSubscriptions();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          ตรวจสลิปแจ้งชำระเงินต่ออายุ (Subscription Slips)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          ตรวจสอบหลักฐานการโอนเงินค่าบริการ SaaS ของร้านค้า และกดอนุมัติเพื่อเพิ่มวันใช้งานให้อัตโนมัติ
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
        {[
          { id: 'PENDING', label: 'รอดำเนินการ (Pending)', color: 'text-amber-400' },
          { id: 'APPROVED', label: 'อนุมัติแล้ว (Approved)', color: 'text-emerald-400' },
          { id: 'REJECTED', label: 'ปฏิเสธ (Rejected)', color: 'text-rose-400' },
          { id: 'ALL', label: 'ทั้งหมด (All)', color: 'text-slate-300' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === tab.id
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className={statusFilter === tab.id ? tab.color : ''}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* List / Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm font-semibold">
            ไม่มีรายการแจ้งชำระเงินในหมวดหมู่นี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">วันที่แจ้ง</th>
                  <th className="py-3.5 px-4">ร้านค้า</th>
                  <th className="py-3.5 px-4">แพ็กเกจที่เลือก</th>
                  <th className="py-3.5 px-4">ยอดเงิน</th>
                  <th className="py-3.5 px-4">หลักฐานสลิป</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {subscriptions.map((sub) => {
                  const isPending = sub.status === 'PENDING';
                  const isApproved = sub.status === 'APPROVED';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-white">
                          {new Date(sub.createdAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(sub.createdAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-extrabold text-white text-sm">{sub.store?.name}</div>
                        <div className="text-[11px] text-orange-400 font-mono">/r/{sub.store?.slug}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-white block">{sub.plan?.name}</span>
                        <span className="text-[10px] text-emerald-400 block">+{sub.plan?.durationDays} วัน</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm font-black text-emerald-400">
                          ฿{sub.amount.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {sub.slipUrl ? (
                          <button
                            onClick={() => setPreviewSlip(sub.slipUrl)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 text-[11px] font-bold border border-slate-700 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            ดูสลิปโอน
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">ไม่มีรูปสลิป</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            รอดำเนินการ
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            อนุมัติแล้ว
                          </span>
                        )}
                        {sub.status === 'REJECTED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3 mr-1" />
                            ปฏิเสธ
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                        {isPending && (
                          <>
                            <button
                              disabled={processingId === sub.id}
                              onClick={() => handleAction(sub.id, 'APPROVE')}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              อนุมัติ
                            </button>
                            <button
                              disabled={processingId === sub.id}
                              onClick={() => handleAction(sub.id, 'REJECT')}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition-all disabled:opacity-50"
                            >
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                        {!isPending && (
                          <span className="text-[10px] text-slate-500">
                            {sub.approvedBy ? `โดย ${sub.approvedBy}` : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slip Modal Preview */}
      {previewSlip && (
        <div
          onClick={() => setPreviewSlip(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-3xl p-4 max-w-sm w-full border border-slate-800 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">หลักฐานการโอนเงิน (สลิป)</span>
              <button
                onClick={() => setPreviewSlip(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ปิด ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2">
              <img
                src={previewSlip}
                alt="สลิปโอนเงิน"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

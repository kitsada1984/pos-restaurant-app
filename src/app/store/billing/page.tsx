'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  UploadCloud,
  ArrowLeft,
  Loader2,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function StoreBillingPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.user || !meData.user.store) {
        router.push('/login');
        return;
      }

      const slug = meData.user.store.slug;
      const res = await fetch(`/api/r/${slug}/billing`);
      const bData = await res.json();
      setData(bData);
      if (bData.plans && bData.plans.length > 0) {
        setSelectedPlanId(bData.plans[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const selectedPlan = data?.plans?.find((p: any) => p.id === selectedPlanId);

  const handleSubmitSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const slug = data.store.slug;
      const res = await fetch(`/api/r/${slug}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          amount: selectedPlan.price,
          slipUrl,
          note,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg('ส่งข้อมูลแจ้งชำระเงินเรียบร้อยแล้ว! ผู้ดูแลระบบจะตรวจสอบและขยายวันใช้งานให้ภายในไม่กี่นาที');
        setSlipUrl('');
        setNote('');
        fetchBilling();
      } else {
        alert(resData.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const store = data?.store;
  const platform = data?.platformSetting;
  const subEnd = store?.subscriptionEnd ? new Date(store.subscriptionEnd) : new Date();
  const daysLeft = Math.max(0, Math.ceil((subEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/store/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าแดชบอร์ด</span>
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            แพ็กเกจ &amp; ต่ออายุสมาชิก (Subscription &amp; Billing)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ร้าน: <span className="text-white font-bold">{store?.name}</span> • วันหมดอายุปัจจุบัน:{' '}
            <span className="text-orange-400 font-bold">
              {subEnd.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>{' '}
            (เหลือ {daysLeft} วัน)
          </p>
        </div>

        {/* Step 1: Select Plan */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black">
              1
            </span>
            <span>เลือกแพ็กเกจที่ต้องการต่ออายุ</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.plans?.map((p: any) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPlanId === p.id
                    ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/15'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">{p.name}</span>
                  {selectedPlanId === p.id && (
                    <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-white">฿{p.price.toLocaleString()}</span>
                  <span className="text-[11px] text-slate-400 ml-1">/ {p.durationDays} วัน</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {p.description || `รองรับสูงสุด ${p.maxTables} โต๊ะ`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Payment Details & Slip Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Account Details */}
          <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black">
                2
              </span>
              <span>โอนเงินชำระค่าบริการ</span>
            </h2>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ยอดที่ต้องชำระ:</span>
                <span className="text-lg font-black text-emerald-400">
                  ฿{selectedPlan?.price ? selectedPlan.price.toLocaleString() : '0'} บาท
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700/60 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">ธนาคาร:</span>
                  <span className="font-bold text-white">{platform?.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">เลขบัญชี:</span>
                  <span className="font-mono font-bold text-orange-400 text-sm">
                    {platform?.bankAccountNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ชื่อบัญชี:</span>
                  <span className="font-bold text-white">{platform?.bankAccountName}</span>
                </div>
                {platform?.promptPayId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">พร้อมเพย์:</span>
                    <span className="font-mono font-bold text-emerald-400">{platform?.promptPayId}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              💡 หลังโอนเงินเรียบร้อย กรุณาแนบรูปสลิปหรือลิงก์รูปสลิปในฟอร์มด้านขวาเพื่อส่งตรวจสอบ
            </p>
          </div>

          {/* Slip Upload Form */}
          <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black">
                3
              </span>
              <span>ส่งหลักฐานการโอนเงิน (สลิป)</span>
            </h2>

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                ✅ {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmitSlip} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  แนบลิงก์รูปภาพสลิป หรือ URL สลิป *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://... หรืออัปโหลดรูปสลิป"
                  value={slipUrl}
                  onChange={(e) => setSlipUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  หมายเหตุเพิ่มเติม (วัน/เวลาที่โอน)
                </label>
                <input
                  type="text"
                  placeholder="เช่น โอนเวลา 12:30 น."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedPlan}
                className="w-full py-3 px-4 rounded-xl text-white font-extrabold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>แจ้งชำระเงินต่ออายุ</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Payment History */}
        {data?.history && data.history.length > 0 && (
          <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-extrabold text-white">ประวัติการแจ้งชำระเงิน</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">วันที่</th>
                    <th className="py-2.5 px-3">แพ็กเกจ</th>
                    <th className="py-2.5 px-3">ยอดเงิน</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.history.map((h: any) => (
                    <tr key={h.id}>
                      <td className="py-3 px-3">
                        {new Date(h.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">{h.plan?.name}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">฿{h.amount.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        {h.status === 'PENDING' && <span className="text-amber-400 font-bold">รอดำเนินการ</span>}
                        {h.status === 'APPROVED' && <span className="text-emerald-400 font-bold">อนุมัติแล้ว</span>}
                        {h.status === 'REJECTED' && <span className="text-rose-400 font-bold">ปฏิเสธ</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

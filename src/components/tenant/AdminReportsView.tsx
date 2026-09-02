'use client';

import React, { useState, useEffect } from 'react';
import ReceiptPrintModal from '@/components/ReceiptPrintModal';
import {
  BarChart3,
  TrendingUp,
  Banknote,
  QrCode,
  Receipt,
  Printer,
  Calendar,
  RefreshCw,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';

export default function AdminReportsView({ slug = 'lung-pa' }: { slug?: string }) {
  const [report, setReport] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const [repRes, settingsRes] = await Promise.all([
        fetch(`/api/r/${slug}/reports/daily?date=${selectedDate}`),
        fetch(`/api/r/${slug}/settings`),
      ]);
      const [repData, sData] = await Promise.all([
        repRes.json().catch(() => null),
        settingsRes.json().catch(() => null),
      ]);
      setReport(repData?.error ? null : repData);
      setStore(sData?.error ? null : sData);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [slug, selectedDate]);

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm no-print w-full">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              รายงานยอดขาย &amp; ปิดกะประจำวัน
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • สรุปยอดขายประจำวัน สัดส่วนเงินสด vs พร้อมเพย์ และประวัติบิล
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 w-full sm:w-auto"
          />

          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงานปิดกะ</span>
          </button>
        </div>
      </div>

      {/* Enterprise KPI Cards (Equal Height Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 auto-rows-fr w-full">
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-slate-400">ยอดขายรวมสุทธิ</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ฿{(report?.totalSales || 0).toLocaleString()}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-600 font-bold block pt-1.5 border-t border-slate-100">
            {report?.totalBills || 0} บิลสำเร็จ
          </span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-amber-500">ต้นทุนวัตถุดิบ (COGS)</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              ฿{(report?.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block pt-1.5 border-t border-slate-100">
            คำนวณตามสูตรตัดสต็อก
          </span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-emerald-600">กำไรขั้นต้น (GP)</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ฿{(report?.grossProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-600 font-bold block pt-1.5 border-t border-slate-100">
            อัตรากำไร {report?.profitMargin || 0}%
          </span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
          <div>
            <span className="text-xs font-bold text-slate-400">สัดส่วนช่องทางชำระ</span>
            <div className="text-xs space-y-1 mt-1 font-extrabold">
              <div className="flex justify-between text-orange-600">
                <span>พร้อมเพย์:</span>
                <span>฿{(report?.promptPaySales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>เงินสด:</span>
                <span>฿{(report?.cashSales || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Sellers & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {/* Top 10 Best Sellers */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Award className="w-4 h-4 text-orange-500" />
            <span>เมนูขายดีประจำวัน (Top Sellers)</span>
          </h3>

          <div className="divide-y divide-slate-100 space-y-2">
            {report?.topSellingItems?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มีข้อมูลยอดขายในวันนี้</p>
            ) : (
              report?.topSellingItems?.map((item: any, idx: number) => (
                <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1 truncate">
                    <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-700 font-black text-[11px] flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-800 truncate">{item.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-900 block">{item.quantity} จาน</span>
                    <span className="text-[10px] text-slate-400">฿{item.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Bills Table (Isolated Horizontal Scroll) */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-700" />
            <span>รายการบิลที่ชำระเงินแล้ว ({report?.orders?.length || 0} บิล)</span>
          </h3>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="text-slate-400 font-bold border-b border-slate-100">
                <tr className="whitespace-nowrap">
                  <th className="py-2.5 px-3">เวลา</th>
                  <th className="py-2.5 px-3">โต๊ะ</th>
                  <th className="py-2.5 px-3">วิธีจ่าย</th>
                  <th className="py-2.5 px-3 text-right">ยอดสุทธิ</th>
                  <th className="py-2.5 px-3 text-right">ใบเสร็จ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {report?.orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-50 whitespace-nowrap">
                    <td className="py-2.5 px-3 font-semibold">{formatTime(ord.paidAt || ord.createdAt)}</td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">
                      {ord.table?.name || `โต๊ะ ${ord.tableNo}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ord.paymentMethod === 'PROMPTPAY'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {ord.paymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      ฿{ord.netAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setReceiptOrder({
                            storeName: store?.storeName || store?.name || 'ร้านอาหารตามสั่ง',
                            promptPayName: store?.promptPayName || '',
                            phone: store?.phone || '',
                            address: store?.address || '',
                            receiptFooter: store?.receiptFooter || '',
                            tableId: ord.tableNo,
                            tableName: ord.table?.name || `โต๊ะ ${ord.tableNo}`,
                            orders: [ord],
                            totalAmount: ord.totalAmount,
                            discountAmount: ord.discountAmount,
                            netAmount: ord.netAmount,
                            paymentMethod: ord.paymentMethod,
                            cashReceived: ord.cashReceived,
                            changeAmount: ord.changeAmount,
                            paidAt: ord.paidAt || ord.createdAt,
                          });
                          setIsReceiptModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-900"
                        title="พิมพ์ใบเสร็จซ้ำ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {isReceiptModalOpen && receiptOrder && (
        <ReceiptPrintModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          order={receiptOrder}
        />
      )}
    </div>
  );
}

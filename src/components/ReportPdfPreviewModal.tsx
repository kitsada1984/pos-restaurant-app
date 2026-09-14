'use client';

import React from 'react';
import {
  Printer,
  X,
  Download,
  FileText,
  Calendar,
  Store,
  CheckCircle2,
  Receipt,
  TrendingUp,
  Banknote,
  QrCode,
  Award,
} from 'lucide-react';

interface ReportPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
  store?: any;
  slug?: string;
  startDate: string;
  endDate: string;
  onDownloadExcel?: () => void;
}

export default function ReportPdfPreviewModal({
  isOpen,
  onClose,
  report,
  store,
  slug = 'lung-pa',
  startDate,
  endDate,
  onDownloadExcel,
}: ReportPdfPreviewModalProps) {
  if (!isOpen || !report) return null;

  const isSingleDay = startDate === endDate;
  const storeName = store?.storeName || store?.name || 'ร้านอาหารตามสั่ง';
  const storeAddress = store?.address || '';
  const storePhone = store?.phone || '';
  const storePromptPay = store?.promptPayNumber || '';

  const totalSales = report.totalSales || 0;
  const totalBills = report.totalBills || report.orderCount || 0;
  const totalCost = report.totalCost || 0;
  const grossProfit = report.grossProfit || (totalSales - totalCost);
  const profitMargin = report.profitMargin ?? (totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0);
  const avgPerBill = totalBills > 0 ? (totalSales / totalBills).toFixed(2) : '0.00';
  const promptPaySales = report.promptPaySales || 0;
  const cashSales = report.cashSales || 0;
  const totalGpDeducted = report.totalGpDeducted || 0;
  const netRevenueReceived = report.netRevenueReceived ?? (totalSales - totalGpDeducted);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Container */}
      <div className="bg-slate-100 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
        {/* Floating Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 no-print flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm tracking-tight text-white">ตัวอย่างรายงาน PDF ก่อนพิมพ์</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  ขนาด A4
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {storeName} • {isSingleDay ? `วันที่ ${startDate}` : `${startDate} ถึง ${endDate}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onDownloadExcel && (
              <button
                type="button"
                onClick={onDownloadExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="ดาวน์โหลดเป็นไฟล์ Excel (CSV)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="สั่งพิมพ์หรือบันทึกเป็น PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Paper Container */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-300/80 flex justify-center flex-1">
          {/* Printable A4 Paper Sheet */}
          <div
            id="printable-report"
            className="bg-white p-6 sm:p-10 rounded-xl shadow-xl border border-slate-300 w-full max-w-[210mm] font-sans text-slate-900 leading-relaxed space-y-6 print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Header Document */}
            <div className="pb-5 border-b-2 border-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      {storeName}
                    </span>
                  </div>
                  {storeAddress && <p className="text-xs text-slate-600">{storeAddress}</p>}
                  {storePhone && <p className="text-xs text-slate-600">โทร: {storePhone}</p>}
                  {storePromptPay && (
                    <p className="text-xs text-slate-600">พร้อมเพย์ร้าน: {storePromptPay}</p>
                  )}
                </div>

                <div className="sm:text-right space-y-1 text-xs">
                  <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white font-black text-xs tracking-wider uppercase">
                    {isSingleDay ? 'รายงานยอดขายประจำวัน' : 'รายงานสรุปยอดขายช่วงเวลา'}
                  </span>
                  <p className="font-bold text-slate-800 text-xs mt-1.5">
                    {isSingleDay
                      ? `วันที่: ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'long' })}`
                      : `ช่วงวันที่: ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'short' })} ถึง ${new Date(endDate + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'short' })}`}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    พิมพ์เมื่อ: {new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Overview (KPIs 4 Blocks) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-500 tracking-wider uppercase">
                1. สรุปภาพรวมทางการเงิน (Financial Overview)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">ยอดขายรวมสุทธิ</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 block">
                    ฿{totalSales.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    {totalBills} บิลสำเร็จ
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">ต้นทุนวัตถุดิบ (COGS)</span>
                  <span className="text-lg sm:text-xl font-black text-amber-700 block">
                    ฿{Number(totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    คำนวณตามสูตรตัดสต็อก
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">กำไรสุทธิ (Gross Profit)</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-700 block">
                    ฿{Number(grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    อัตรากำไร {profitMargin}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/50 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">ยอดขายเฉลี่ยต่อบิล</span>
                  <span className="text-lg sm:text-xl font-black text-slate-800 block">
                    ฿{Number(avgPerBill).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    เฉลี่ยต่อคำสั่งซื้อ
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary & Channel Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Method Breakdown */}
              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/40 space-y-2">
                <h4 className="text-xs font-black text-slate-700 pb-1.5 border-b border-slate-200">
                  2. สัดส่วนช่องทางการรับเงิน (Payment Methods)
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="font-bold text-slate-600">โอนผ่าน พร้อมเพย์ (PromptPay QR):</span>
                    <span className="font-black text-orange-700">฿{promptPaySales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="font-bold text-slate-600">เงินสดในลิ้นชัก (Cash):</span>
                    <span className="font-black text-emerald-700">฿{cashSales.toLocaleString()}</span>
                  </div>
                  {totalGpDeducted > 0 && (
                    <div className="flex justify-between items-center py-0.5 border-t border-slate-200 text-rose-600">
                      <span className="font-bold">หักค่า GP เดลิเวอรีรวม:</span>
                      <span className="font-black">-฿{totalGpDeducted.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t-2 border-slate-300 font-black text-slate-900">
                    <span>ยอดรับสุทธิที่ได้รับจริง:</span>
                    <span>฿{netRevenueReceived.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Channel Breakdown */}
              {report.channelBreakdown ? (
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/40 space-y-2">
                  <h4 className="text-xs font-black text-slate-700 pb-1.5 border-b border-slate-200">
                    3. ยอดขายแยกตามช่องทาง (Sales by Channel)
                  </h4>
                  <div className="space-y-1 text-xs">
                    {[
                      { label: '🍽️ ทานที่ร้าน (Dine-in)', data: report.channelBreakdown.DINE_IN },
                      { label: '🛍️ กลับบ้าน (Takeaway)', data: report.channelBreakdown.TAKEAWAY },
                      { label: '🟢 LINE MAN', data: report.channelBreakdown.LINEMAN },
                      { label: '🟢 GrabFood', data: report.channelBreakdown.GRAB },
                      { label: '🟠 ShopeeFood', data: report.channelBreakdown.SHOPEE_FOOD },
                    ].map((ch, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 font-medium">
                          {ch.label} ({ch.data?.count || 0} บิล)
                        </span>
                        <span className="font-black text-slate-900">
                          ฿{(ch.data?.net || ch.data?.gross || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/40 space-y-2">
                  <h4 className="text-xs font-black text-slate-700 pb-1.5 border-b border-slate-200">
                    3. ข้อมูลคำสั่งซื้อ
                  </h4>
                  <p className="text-xs text-slate-500">บิลที่ชำระแล้วทั้งหมด {totalBills} รายการ</p>
                </div>
              )}
            </div>

            {/* Daily Breakdown Table (If Date Range has multiple days) */}
            {report.dailyBreakdown && report.dailyBreakdown.length > 0 && !isSingleDay && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-700 tracking-wider uppercase">
                    4. สรุปยอดขายแยกรายวัน (Daily Breakdown • {report.dailyBreakdown.length} วัน)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">
                    เฉลี่ย ฿{report.dailyBreakdown.length > 0 ? Math.round(totalSales / report.dailyBreakdown.length).toLocaleString() : 0} / วัน
                  </span>
                </div>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-300">
                      <tr>
                        <th className="py-1.5 px-3">วันที่</th>
                        <th className="py-1.5 px-2 text-center">บิล</th>
                        <th className="py-1.5 px-3 text-right">ยอดขายสุทธิ</th>
                        <th className="py-1.5 px-3 text-right">ต้นทุน COGS</th>
                        <th className="py-1.5 px-3 text-right">กำไรสุทธิ</th>
                        <th className="py-1.5 px-3 text-right">พร้อมเพย์ / เงินสด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {report.dailyBreakdown.map((day: any) => {
                        const dStr = new Date(day.date + 'T00:00:00').toLocaleDateString('th-TH', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                        return (
                          <tr key={day.date} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-3 font-bold text-slate-900">{dStr}</td>
                            <td className="py-1.5 px-2 text-center font-bold">{day.bills}</td>
                            <td className="py-1.5 px-3 text-right font-black">฿{day.sales.toLocaleString()}</td>
                            <td className="py-1.5 px-3 text-right text-amber-700">฿{Number(day.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1.5 px-3 text-right font-black text-emerald-700">฿{Number(day.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1.5 px-3 text-right text-[11px]">
                              <span>พ: ฿{day.promptPay.toLocaleString()}</span>
                              {day.cash > 0 && <span className="ml-1 text-emerald-700">สด: ฿{day.cash.toLocaleString()}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top 10 Best Sellers Table */}
            {report.topSellingItems && report.topSellingItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-700 tracking-wider uppercase">
                  5. เมนูขายดี 10 อันดับแรก (Top 10 Best Selling Items)
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-300">
                      <tr>
                        <th className="py-1.5 px-3 text-center w-12">อันดับ</th>
                        <th className="py-1.5 px-3">ชื่อรายการอาหาร</th>
                        <th className="py-1.5 px-3 text-center w-24">จำนวนจาน</th>
                        <th className="py-1.5 px-3 text-right w-32">ยอดขายรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {report.topSellingItems.slice(0, 10).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-1.5 px-3 text-center font-black text-slate-500">#{idx + 1}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{item.name}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-700">{item.quantity} จาน</td>
                          <td className="py-1.5 px-3 text-right font-black text-slate-900">฿{Number(item.revenue || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Verification Signatures Section */}
            <div className="pt-6 border-t-2 border-slate-200 space-y-4">
              <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
                <div className="space-y-6">
                  <p className="font-bold text-slate-700">ผู้จัดทำรายงาน / แคชเชียร์</p>
                  <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  <p className="text-[11px] text-slate-400">( ............................................................ )</p>
                  <p className="text-[10px] text-slate-400">วันที่ ......./......./.......</p>
                </div>

                <div className="space-y-6">
                  <p className="font-bold text-slate-700">ผู้จัดการร้าน / ผู้มีอำนาจตรวจสอบ</p>
                  <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  <p className="text-[11px] text-slate-400">( ............................................................ )</p>
                  <p className="text-[10px] text-slate-400">วันที่ ......./......./.......</p>
                </div>
              </div>

              <div className="text-center pt-4 text-[10px] text-slate-400 border-t border-slate-100">
                ระบบจัดการร้านอาหารตามสั่ง (POS Restaurant System) • รายงานผลประกอบการอัตโนมัติ
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

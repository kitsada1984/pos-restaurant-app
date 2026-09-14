'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ReceiptPrintModal from '@/components/ReceiptPrintModal';
import ReportPdfPreviewModal from '@/components/ReportPdfPreviewModal';
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
  Download,
  Eye,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatTime } from '@/lib/utils';

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Re-print modal
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  const fetchReport = async () => {
    try {
      const [repRes, settingsRes] = await Promise.all([
        fetch(`/api/reports/daily?date=${selectedDate}`),
        fetch('/api/settings'),
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
  }, [selectedDate]);

  const handlePrintDailyShift = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (!report) return;

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[][] = [];
    const storeTitle = store?.storeName || store?.name || 'ร้านอาหารตามสั่ง';
    rows.push(['รายงานยอดขาย & สรุปปิดกะประจำวัน', storeTitle]);
    rows.push(['วันที่รายงาน', selectedDate]);
    rows.push(['วันที่ส่งออกข้อมูล', new Date().toLocaleString('th-TH')]);
    rows.push([]);

    rows.push(['=== สรุปภาพรวม (Overview KPIs) ===']);
    rows.push(['ยอดขายรวมสุทธิ (บาท)', String(report.totalSales || 0)]);
    rows.push(['จำนวนบิลสำเร็จ (บิล)', String(report.orderCount || 0)]);
    rows.push(['เฉลี่ยต่อบิล (บาท)', String(report.avgPerBill || 0)]);
    rows.push(['ยอดเงินโอน PromptPay (บาท)', String(report.promptPaySales || 0)]);
    rows.push(['จำนวนรายการ PromptPay', String(report.promptPayCount || 0)]);
    rows.push(['ยอดเงินสดในลิ้นชัก (บาท)', String(report.cashSales || 0)]);
    rows.push(['จำนวนรายการเงินสด', String(report.cashCount || 0)]);
    rows.push([]);

    if (report.topSellingItems && report.topSellingItems.length > 0) {
      rows.push(['=== เมนูขายดีประจำวัน (Top Sellers) ===']);
      rows.push(['อันดับ', 'ชื่อเมนู', 'จำนวนจานที่ขายได้']);
      report.topSellingItems.forEach((item: any, idx: number) => {
        rows.push([String(idx + 1), item.name, String(item.quantity)]);
      });
      rows.push([]);
    }

    if (report.recentBills && report.recentBills.length > 0) {
      rows.push(['=== ประวัติบิลที่ชำระแล้ว (Recent Bills) ===']);
      rows.push(['รหัสบิล', 'เวลา', 'โต๊ะ', 'ช่องทางชำระ', 'ยอดสุทธิ (บาท)']);
      report.recentBills.forEach((bill: any) => {
        const timeStr = bill.paidAt || bill.createdAt ? new Date(bill.paidAt || bill.createdAt).toLocaleString('th-TH') : '-';
        const tableName = bill.table?.name || `โต๊ะ ${bill.tableId}`;
        rows.push([
          bill.id.slice(-8).toUpperCase(),
          timeStr,
          tableName,
          bill.paymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด',
          String(bill.netAmount || 0),
        ]);
      });
    }

    const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCSV).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `รายงานปิดกะ_${selectedDate}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">รายงานยอดขาย & สรุปปิดกะ</h1>
              <p className="text-xs text-slate-500">
                วิเคราะห์ยอดขาย เงินสด เงินโอน และเมนูขายดี
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center">
              <button
                onClick={() => setIsPdfPreviewOpen(true)}
                disabled={!report || loading}
                className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center space-x-1 shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="ดูตัวอย่างรายงาน PDF ก่อนสั่งพิมพ์"
              >
                <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="inline sm:hidden">ดู PDF</span>
                <span className="hidden sm:inline">ดูตัวอย่าง PDF</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                disabled={!report || loading}
                className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center space-x-1 shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                title="ดาวน์โหลดรายงานเป็นไฟล์ Excel (CSV)"
              >
                <Download className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="inline sm:hidden">Excel</span>
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>

              <button
                onClick={handlePrintDailyShift}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="inline sm:hidden">พิมพ์</span>
                <span className="hidden sm:inline">พิมพ์ปิดกะ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ยอดขายรวมสุทธิ</span>
                  <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                    {formatPrice(report?.totalSales)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    จากทั้งหมด {report?.orderCount || 0} บิล
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* PromptPay Total */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ยอดเงินโอน PromptPay</span>
                  <span className="text-2xl font-extrabold text-[#113566] mt-1 block">
                    {formatPrice(report?.promptPaySales)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {report?.promptPayCount || 0} รายการ
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#113566] flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
              </div>

              {/* Cash Total */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ยอดเงินสดในลิ้นชัก</span>
                  <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                    {formatPrice(report?.cashSales)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {report?.cashCount || 0} รายการ
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-6 h-6" />
                </div>
              </div>

              {/* Avg per Bill */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">เฉลี่ยต่อบิล</span>
                  <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                    {formatPrice(report?.avgPerBill)}
                  </span>
                  <span className="text-[11px] text-slate-500">ค่าเฉลี่ยต่อโต๊ะ</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Two Column Section: Top Items & Recent Bills */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Selling Dishes (1 Column) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-base text-slate-800">เมนูขายดีประจำวัน</h2>
                </div>

                {report?.topSellingItems?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">ยังไม่มีรายการขายในวันนี้</p>
                ) : (
                  <div className="space-y-3">
                    {report?.topSellingItems?.map((item: any, idx: number) => {
                      const maxQty = report.topSellingItems[0]?.quantity || 1;
                      const percentage = Math.round((item.quantity / maxQty) * 100);

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800 flex items-center space-x-2 truncate">
                              <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px]">
                                #{idx + 1}
                              </span>
                              <span className="truncate">{item.name}</span>
                            </span>
                            <span className="text-orange-600 font-extrabold whitespace-nowrap pl-2">
                              {item.quantity} จาน
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Bills (2 Columns) */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h2 className="font-bold text-base text-slate-800">ประวัติบิลที่ชำระแล้วล่าสุด</h2>
                  <span className="text-xs text-slate-400">
                    แสดง {report?.recentBills?.length || 0} บิลล่าสุด
                  </span>
                </div>

                {report?.recentBills?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">ยังไม่มีรายการชำระเงิน</p>
                ) : (
                  <div className="divide-y divide-slate-100 overflow-x-auto">
                    {report?.recentBills?.map((bill: any) => (
                      <div key={bill.id} className="py-3 flex items-center justify-between text-xs min-w-[500px]">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 font-bold flex items-center justify-center text-xs">
                            {bill.tableId}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {bill.table?.name || `โต๊ะ ${bill.tableId}`} • บิล #{bill.id.slice(-5).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatTime(bill.paidAt || bill.createdAt)} • {bill.items?.length || 0} รายการ
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              bill.paymentMethod === 'PROMPTPAY'
                                ? 'bg-blue-50 text-[#113566]'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {bill.paymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด'}
                          </span>

                          <span className="font-extrabold text-sm text-slate-800 w-20 text-right">
                            {formatPrice(bill.netAmount)}
                          </span>

                          <button
                            onClick={() => {
                              setReceiptOrder(bill);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            title="ดู/พิมพ์ใบเสร็จ"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* REPRINT RECEIPT MODAL */}
      <ReceiptPrintModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        order={receiptOrder}
        store={store}
      />

      {/* PDF REPORT PREVIEW MODAL */}
      {isPdfPreviewOpen && (
        <ReportPdfPreviewModal
          isOpen={isPdfPreviewOpen}
          onClose={() => setIsPdfPreviewOpen(false)}
          report={report}
          store={store}
          startDate={selectedDate}
          endDate={selectedDate}
          onDownloadExcel={handleDownloadCSV}
        />
      )}
    </div>
  );
}

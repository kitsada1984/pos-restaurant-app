'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Store, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function QrCodesPage() {
  const [store, setStore] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [origin, setOrigin] = useState<string>('');

  const [customHost, setCustomHost] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      setOrigin(currentOrigin);
      setCustomHost(currentOrigin);
    }
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setStore(data))
      .catch(() => {});

    fetch('/api/tables')
      .then((res) => res.json())
      .then((data) => setTables(data || []))
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const currentBaseUrl = customHost.trim() || origin || 'http://localhost:3000';
  const tableList = tables.length > 0 ? tables : Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `โต๊ะ ${i + 1}` }));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">พิมพ์ QR Code ประจำแต่ละโต๊ะ</h1>
              <p className="text-xs text-slate-500">
                พิมพ์ป้ายตั้งโต๊ะสำหรับให้ลูกค้าสแกนสั่งอาหารและดูสถานะ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* IP / Base URL setting */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-600">IP เครื่อง/โดเมน:</span>
              <input
                type="text"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="เช่น http://192.168.1.104:3000"
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 w-56 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ป้าย QR Code ทั้งหมด (A4 Sheet)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1">
        <div
          id="printable-qr-sheet"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {tableList.map((table) => {
            const tableUrl = `${currentBaseUrl}/table/${table.id}`;

            return (
              <div
                key={table.id}
                className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 relative overflow-hidden page-break-inside-avoid"
              >
                {/* Decorative Top Bar */}
                <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 py-1.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-sm">
                  <Store className="w-3.5 h-3.5" />
                  <span className="truncate">{store?.storeName || 'ร้านอาหารตามสั่ง'}</span>
                </div>

                {/* Table Number Circle */}
                <div className="w-16 h-16 rounded-3xl bg-orange-50 border-2 border-orange-200 text-orange-600 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 -mb-1">โต๊ะ</span>
                  <span className="text-2xl font-black">{table.id}</span>
                </div>

                {/* QR Code */}
                <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-md">
                  <QRCodeSVG value={tableUrl} size={150} level="M" />
                </div>

                {/* Instruction */}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-800">
                    สแกนเพื่อสั่งอาหารที่โต๊ะ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เปิดผ่าน LINE หรือกล้องมือถือได้ทันที
                  </p>
                </div>

                {/* Preview Link (No Print) */}
                <div className="pt-2 border-t border-slate-100 w-full no-print">
                  <Link
                    href={`/table/${table.id}`}
                    target="_blank"
                    className="text-xs text-orange-600 font-semibold hover:underline flex items-center justify-center space-x-1"
                  >
                    <span>เปิดทดสอบหน้าสั่งอาหาร</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

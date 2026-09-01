'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Store, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AdminQrCodesView({ slug = 'lung-pa' }: { slug?: string }) {
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
    fetch(`/api/r/${slug}/settings`)
      .then((res) => res.json())
      .then((data) => setStore(data))
      .catch(() => {});

    fetch(`/api/r/${slug}/tables`)
      .then((res) => res.json())
      .then((data) => setTables(Array.isArray(data) ? data : []))
      .catch(() => setTables([]));
  }, [slug]);

  const handlePrint = () => {
    window.print();
  };

  const currentBaseUrl = customHost.trim() || origin || 'http://localhost:3000';
  const safeTables = Array.isArray(tables) ? tables : [];
  const tableList = safeTables.length > 0 ? safeTables : Array.from({ length: 10 }, (_, i) => ({ id: i + 1, tableNo: i + 1, name: `โต๊ะ ${i + 1}` }));

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">
              พิมพ์ป้าย QR Code ตั้งโต๊ะ A4
            </h1>
            <p className="text-xs text-slate-500">
              ร้าน: <span className="font-bold text-slate-800">{store?.storeName || store?.name || slug}</span> • ป้ายตั้งโต๊ะสำหรับให้ลูกค้าสแกนสั่งอาหารและเรียกเช็คบิล
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-600">Base Domain/IP:</span>
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="https://..."
              className="p-2 border border-slate-300 rounded-xl text-xs font-semibold w-48 sm:w-64"
            />
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold flex items-center space-x-2 shadow-md shadow-orange-500/25 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์ทุกโต๊ะ (Print A4)</span>
          </button>
        </div>
      </div>

      {/* Printable Grid of QR Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
        {tableList.map((table) => {
          const tNo = table.tableNo || table.id;
          const tableUrl = `${currentBaseUrl}/r/${slug}/table/${tNo}`;

          return (
            <div
              key={tNo}
              className="bg-white rounded-3xl p-6 border-2 border-slate-800 shadow-md text-center flex flex-col items-center justify-between space-y-4 print:border-black print:shadow-none print:break-inside-avoid"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest block">
                  {store?.storeName || store?.name || 'ORDEO POS'}
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {table.name || `โต๊ะ ${tNo}`}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold">สแกนเพื่อสั่งอาหารที่โต๊ะ</p>
              </div>

              {/* QR Code Canvas */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <QRCodeSVG value={tableUrl} size={160} level="H" includeMargin={false} />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-mono break-all">{tableUrl}</p>
                <div className="no-print pt-2">
                  <Link
                    href={`/r/${slug}/table/${tNo}`}
                    target="_blank"
                    className="inline-flex items-center space-x-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    <span>เปิดทดสอบลิงก์</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

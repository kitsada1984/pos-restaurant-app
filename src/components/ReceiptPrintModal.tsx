'use client';

import React from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  store?: any;
}

export default function ReceiptPrintModal({ isOpen, onClose, order, store }: ReceiptPrintModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const storeInfo = store || order;
  const items = order.items || (order.orders ? order.orders.flatMap((o: any) => o.items || []) : []);
  const totalAmount = order.totalAmount || 0;
  const discountAmount = order.discountAmount || 0;
  const netAmount = order.netAmount || totalAmount - discountAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header (No Print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 no-print">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Printer className="w-5 h-5 text-orange-500" />
            <span>ใบเสร็จรับเงิน</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          {/* Printable Receipt Paper */}
          <div
            id="printable-receipt"
            className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 w-full font-mono text-xs text-slate-900 leading-relaxed"
          >
            {/* Store Info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-sm tracking-wide">{storeInfo?.storeName || 'ร้านอาหารตามสั่ง'}</h2>
              {storeInfo?.address && <p className="text-[11px] text-slate-600 mt-0.5">{storeInfo.address}</p>}
              {storeInfo?.phone && <p className="text-[11px] text-slate-600">โทร: {storeInfo.phone}</p>}
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>โต๊ะ:</span>
                <span className="font-bold">{order.tableName || `โต๊ะ ${order.tableId}`}</span>
              </div>
              <div className="flex justify-between">
                <span>วันที่:</span>
                <span>{formatDateTime(order.paidAt || new Date())}</span>
              </div>
              <div className="flex justify-between">
                <span>วิธีชำระ:</span>
                <span>{order.paymentMethod === 'PROMPTPAY' ? 'PromptPay QR' : 'เงินสด'}</span>
              </div>
            </div>

            {/* Item List */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
              {items.map((item: any, idx: number) => {
                let parsedOptions: any[] = [];
                if (item.selectedOptions) {
                  try {
                    parsedOptions = typeof item.selectedOptions === 'string' ? JSON.parse(item.selectedOptions) : item.selectedOptions;
                  } catch (e) {}
                }

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>

                    {parsedOptions.length > 0 && (
                      <div className="pl-4 text-[10px] text-slate-500">
                        {parsedOptions.map((opt: any, oIdx: number) => (
                          <span key={oIdx} className="mr-1">
                            +{opt.choice || opt.name}
                            {opt.extra > 0 && `(฿${opt.extra})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.specialNote && (
                      <div className="pl-4 text-[10px] text-amber-600 italic">*{item.specialNote}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pricing Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>รวมเงิน:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>ส่วนลด:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                <span>ยอดสุทธิ:</span>
                <span>{formatPrice(netAmount)}</span>
              </div>

              {order.paymentMethod === 'CASH' && order.cashReceived && (
                <>
                  <div className="flex justify-between text-[11px] pt-1 text-slate-600">
                    <span>รับเงินสด:</span>
                    <span>{formatPrice(order.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                    <span>เงินทอน:</span>
                    <span>{formatPrice(order.changeAmount || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[11px] text-slate-500 space-y-1">
              <p>{storeInfo?.receiptFooter || 'ขอบคุณที่มาอุดหนุนครับ 🙏'}</p>
              <p className="text-[9px] text-slate-400">Powered by ORDEO POS</p>
            </div>
          </div>
        </div>

        {/* Action Buttons (No Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex space-x-3 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            ปิด
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-md transition-colors flex items-center justify-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบเสร็จ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  store: any;
}

export default function ReceiptPrintModal({ isOpen, onClose, order, store }: ReceiptPrintModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = order.items || [];
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
              <h2 className="font-bold text-sm tracking-wide">{store?.storeName || 'ร้านอาหารตามสั่ง'}</h2>
              {store?.address && <p className="text-[11px] text-slate-600 mt-0.5">{store.address}</p>}
              {store?.phone && <p className="text-[11px] text-slate-600">โทร: {store.phone}</p>}
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>โต๊ะ:</span>
                <span className="font-bold text-xs">{order.table?.name || `โต๊ะ ${order.tableId}`}</span>
              </div>
              <div className="flex justify-between">
                <span>เลขที่บิล:</span>
                <span>#{order.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>วันที่-เวลา:</span>
                <span>{formatDateTime(order.paidAt || order.createdAt)}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span>ลูกค้า:</span>
                  <span>{order.customerName}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
              <div className="flex justify-between font-bold text-[11px] text-slate-700 pb-1 border-b border-slate-200">
                <span>รายการ</span>
                <span>จำนวน/ราคา</span>
              </div>
              {items.map((item: any, idx: number) => {
                let optionsList: any[] = [];
                try {
                  if (item.selectedOptions) {
                    optionsList = typeof item.selectedOptions === 'string'
                      ? JSON.parse(item.selectedOptions)
                      : item.selectedOptions;
                  }
                } catch {}

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between items-start font-medium">
                      <span className="flex-1 pr-2">
                        {item.name}
                      </span>
                      <span className="whitespace-nowrap">
                        {item.quantity} x {item.price} = {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    {/* Selected Options */}
                    {optionsList && optionsList.length > 0 && (
                      <div className="text-[10px] text-slate-500 pl-2">
                        {optionsList.map((opt: any, oIdx: number) => (
                          <span key={oIdx} className="mr-2">
                            • {opt.choice || opt.name} {opt.extraPrice > 0 ? `(+${opt.extraPrice})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.specialNote && (
                      <div className="text-[10px] text-orange-600 pl-2 italic">
                        *{item.specialNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals Calculation */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ยอดรวมสินค้า:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>ส่วนลด:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>ยอดสุทธิ (NET):</span>
                <span className="text-orange-600">{formatPrice(netAmount)}</span>
              </div>

              {/* Payment Details */}
              <div className="pt-2 text-[11px] text-slate-600 space-y-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>วิธีชำระเงิน:</span>
                  <span className="font-semibold text-slate-800">
                    {order.paymentMethod === 'PROMPTPAY' ? 'สแกน PromptPay' : 'เงินสด (Cash)'}
                  </span>
                </div>
                {order.paymentMethod === 'CASH' && order.cashReceived && (
                  <>
                    <div className="flex justify-between">
                      <span>รับเงินสด:</span>
                      <span>{formatPrice(order.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>เงินทอน:</span>
                      <span>{formatPrice(order.changeAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Message */}
            <div className="text-center pt-4 pb-2 text-[11px] text-slate-500 space-y-1">
              <p>{store?.receiptFooter || 'ขอบคุณที่ใช้บริการครับ/ค่ะ'}</p>
              <p className="text-[10px] text-slate-400">--- Powered by Small POS System ---</p>
            </div>
          </div>
        </div>

        {/* Footer Actions (No Print) */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center space-x-3 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 text-sm transition-colors"
          >
            ปิดหน้าต่าง
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์ใบเสร็จ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

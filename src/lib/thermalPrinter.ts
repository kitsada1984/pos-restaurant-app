/**
 * Thermal Printer Helper for POS Receipts and Kitchen Tickets
 * Solves duplicate printing and blank trailing pages by isolating
 * the printable element in a clean hidden iframe with zero parent layout interference.
 * Also provides direct headless rendering and printing for automatic kitchen tickets.
 */

import { formatDateTime, formatTime } from '@/lib/utils';

export interface PrintThermalOptions {
  copies?: number;
  width?: '80mm' | '58mm' | string;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders complete HTML markup for a Kitchen Order Ticket (KOT)
 */
export function renderKitchenTicketHtml(order: any, store?: any): string {
  if (!order) return '';

  const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(order.orderChannel);
  const channelLabel =
    order.orderChannel === 'LINEMAN'
      ? '🛵 LINE MAN'
      : order.orderChannel === 'GRAB'
      ? '🛵 GrabFood'
      : order.orderChannel === 'SHOPEE_FOOD'
      ? '🛵 ShopeeFood'
      : order.orderChannel === 'ROBINHOOD'
      ? '🛵 Robinhood'
      : order.orderType === 'TAKEAWAY'
      ? '🛍️ สั่งกลับบ้าน'
      : '🍽️ ทานที่ร้าน';

  const orderTitle = isDelivery
    ? `เดลิเวอรี #${order.deliveryOrderId || order.id?.slice(-4) || 'DELIVERY'}`
    : order.table?.name || (order.tableNo ? `โต๊ะ ${order.tableNo}` : 'ออเดอร์');

  const storeName = store?.name || store?.storeName || 'ใบสั่งอาหารห้องครัว';
  const items = order.items || [];
  const totalQty = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const printTimeStr = formatDateTime(new Date());
  const orderTimeStr = order.createdAt ? formatTime(order.createdAt) : formatTime(new Date());

  const itemsHtml = items
    .map((item: any, idx: number) => {
      let parsedOptions: any[] = [];
      if (item.selectedOptions) {
        try {
          parsedOptions =
            typeof item.selectedOptions === 'string'
              ? JSON.parse(item.selectedOptions)
              : item.selectedOptions;
        } catch (e) {}
      }

      const optionsHtml =
        parsedOptions.length > 0
          ? `<div style="margin-left: 14px; margin-top: 2px; font-size: 11px; color: #333;">
              ${parsedOptions
                .map((opt: any) => `<div>• ${escapeHtml(opt.group ? `${opt.group}: ` : '')}${escapeHtml(opt.choice || opt.name)}</div>`)
                .join('')}
            </div>`
          : '';

      const noteHtml = item.specialNote
        ? `<div style="margin-left: 14px; margin-top: 2px; font-size: 11px; font-weight: bold; color: #b91c1c;">
            * ${escapeHtml(item.specialNote)}
          </div>`
        : '';

      return `
        <div style="padding-top: 6px; padding-bottom: 6px; border-bottom: 1px dotted #999;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="flex: 1; font-weight: bold; font-size: 14px; line-height: 1.25; color: #000;">
              ${idx + 1}. ${escapeHtml(item.name)}
            </div>
            <div style="font-size: 16px; font-weight: 900; background: #eee; padding: 2px 8px; border-radius: 4px; min-width: 24px; text-align: center; color: #000;">
              ${item.quantity || 1}
            </div>
          </div>
          ${optionsHtml}
          ${noteHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: monospace, -apple-system, sans-serif; font-size: 13px; line-height: 1.3; color: #000; width: 100%; box-sizing: border-box;">
      <!-- Store & Header -->
      <div style="text-align: center; padding-bottom: 6px; border-bottom: 2px dashed #000;">
        <h2 style="font-weight: 900; font-size: 15px; margin: 0; text-transform: uppercase; color: #000;">
          ${escapeHtml(storeName)}
        </h2>
        <div style="font-size: 10px; color: #444; margin-top: 2px;">
          พิมพ์: ${printTimeStr}
        </div>
      </div>

      <!-- Big Table / Platform Highlight -->
      <div style="padding: 8px 4px; text-align: center; border-bottom: 2px solid #000; background: #f4f4f4; margin: 6px 0; border-radius: 4px;">
        <div style="font-size: 12px; font-weight: bold; color: #333;">${channelLabel}</div>
        <div style="font-size: 22px; font-weight: 900; letter-spacing: 0.5px; margin-top: 2px; color: #000;">
          ${escapeHtml(orderTitle)}
        </div>
        ${
          order.customerName
            ? `<div style="font-size: 11px; font-weight: bold; color: #333; margin-top: 2px;">ลูกค้า: ${escapeHtml(order.customerName)}</div>`
            : ''
        }
        ${
          order.riderName
            ? `<div style="font-size: 11px; font-weight: bold; color: #047857; margin-top: 2px;">ไรเดอร์: ${escapeHtml(order.riderName)}</div>`
            : ''
        }
      </div>

      <!-- Time & Order ID -->
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #444; padding: 4px 0; border-bottom: 1px dashed #999;">
        <span>ออเดอร์: #${escapeHtml(order.id?.slice(-6) || 'N/A')}</span>
        <span>สั่งเมื่อ: ${orderTimeStr}</span>
      </div>

      <!-- Order Note -->
      ${
        order.note
          ? `<div style="margin: 6px 0; padding: 6px 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; border-radius: 4px; font-weight: bold; font-size: 11px;">
              ⚠️ หมายเหตุบิล: ${escapeHtml(order.note)}
            </div>`
          : ''
      }

      <!-- Items List -->
      <div style="padding-top: 4px; padding-bottom: 6px; border-bottom: 2px solid #000;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; border-bottom: 1px solid #000; padding-bottom: 4px;">
          <span>รายการอาหาร (${totalQty} จาน)</span>
          <span>จำนวน</span>
        </div>
        ${itemsHtml}
      </div>

      <!-- Footer Summary -->
      <div style="padding-top: 8px; text-align: center; font-size: 11px; color: #555;">
        *** จบรายการสั่งอาหารห้องครัว ***
      </div>
    </div>
  `;
}

/**
 * Prints raw HTML into a thermal-optimized isolated hidden iframe
 */
export async function printThermalHtml(
  htmlContent: string,
  options: PrintThermalOptions = {}
): Promise<boolean> {
  const { copies = 1, width = '80mm' } = options;
  const effectiveWidth = width === '58mm' ? '58mm' : '80mm';

  if (typeof window === 'undefined') {
    return false;
  }

  // Remove any previous print iframe to avoid DOM clutter
  const existingIframe = document.getElementById('thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = effectiveWidth;
  iframe.style.height = '100px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.warn('[printThermalHtml] Unable to access iframe document, fallback to window.print()');
    window.print();
    return false;
  }

  let bodyContent = '';
  for (let i = 0; i < copies; i++) {
    const isLast = i === copies - 1;
    bodyContent += `
      <div class="thermal-slip-instance ${!isLast ? 'slip-page-break' : ''}">
        ${htmlContent}
      </div>
    `;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Thermal Print</title>
        <style>
          @page {
            size: ${effectiveWidth} auto;
            margin: 0mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${effectiveWidth} !important;
            max-width: ${effectiveWidth} !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          .thermal-slip-instance {
            width: ${effectiveWidth} !important;
            max-width: ${effectiveWidth} !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
          }
          .slip-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  iframeDoc.close();

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('[printThermalHtml] Iframe print exception, fallback to window.print()', err);
        window.print();
        resolve(false);
      } finally {
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    }, 250);
  });
}

/**
 * Directly prints a kitchen order ticket without requiring an existing DOM element
 */
export async function printKitchenTicketDirect(
  order: any,
  store?: any,
  options: PrintThermalOptions = {}
): Promise<boolean> {
  const html = renderKitchenTicketHtml(order, store);
  if (!html) return false;
  return printThermalHtml(html, options);
}

/**
 * Prints an existing DOM element (e.g. from modal preview) in an isolated thermal iframe
 */
export async function printThermalElement(
  elementId: string,
  options: PrintThermalOptions = {}
): Promise<boolean> {
  const { copies = 1, width = '80mm' } = options;
  const effectiveWidth = width === '58mm' ? '58mm' : '80mm';

  if (typeof window === 'undefined') {
    return false;
  }

  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.warn(`[printThermalElement] Element #${elementId} not found, fallback to window.print()`);
    window.print();
    return false;
  }

  // Remove any previous print iframe to avoid DOM clutter
  const existingIframe = document.getElementById('thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = effectiveWidth;
  iframe.style.height = '100px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.warn('[printThermalElement] Unable to access iframe document, fallback to window.print()');
    window.print();
    return false;
  }

  // Extract all existing stylesheet and style tags from current document so Tailwind rules apply
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((tag) => tag.outerHTML)
    .join('\n');

  // Build the receipt HTML blocks based on the requested number of copies
  const receiptHtml = sourceElement.outerHTML;
  let bodyContent = '';

  for (let i = 0; i < copies; i++) {
    const isLast = i === copies - 1;
    bodyContent += `
      <div class="thermal-slip-instance ${!isLast ? 'slip-page-break' : ''}">
        ${receiptHtml}
      </div>
    `;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Thermal Print</title>
        ${headStyles}
        <style>
          @page {
            size: ${effectiveWidth} auto;
            margin: 0mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${effectiveWidth} !important;
            max-width: ${effectiveWidth} !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          .thermal-slip-instance {
            width: ${effectiveWidth} !important;
            max-width: ${effectiveWidth} !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .slip-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          #${elementId} {
            position: static !important;
            width: 100% !important;
            max-width: ${effectiveWidth} !important;
            margin: 0 auto !important;
            padding: 2.5mm 3mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  iframeDoc.close();

  return new Promise((resolve) => {
    // Give browser time to parse CSS and SVG barcodes/QR codes (instant 50ms)
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('[printThermalElement] Iframe print exception, fallback to window.print()', err);
        window.print();
        resolve(false);
      } finally {
        // Cleanup iframe after print dialog resolves or closes
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    }, 50);
  });
}

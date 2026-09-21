/**
 * Receipt Text Parser & Normalizer for Virtual Print Proxy
 * Parses raw text or structured print buffer from Grab, LINE MAN (Wongnai), ShopeeFood, etc.
 */

export interface ParsedItem {
  name: string;
  cleanName: string;
  price: number;
  quantity: number;
  selectedOptions?: string | null;
  specialNote?: string | null;
}

export interface ParsedReceipt {
  channel: 'LINEMAN' | 'GRAB' | 'SHOPEE_FOOD' | 'ROBINHOOD' | 'FOODPANDA' | 'PRINT_PROXY';
  orderId: string;
  riderName?: string | null;
  riderPhone?: string | null;
  customerName?: string | null;
  note?: string | null;
  items: ParsedItem[];
  totalAmount: number;
  isCancellation?: boolean;
}

/**
 * Strips promotional prefixes and multipliers from dish names
 * e.g. "1x [โปรคุ้ม] ข้าวกะเพราหมูกรอบ (ไข่ดาว)" -> "ข้าวกะเพราหมูกรอบ"
 */
export function cleanDishName(rawName: string): string {
  if (!rawName) return '';

  let cleaned = rawName.trim();

  // Strip leading count like "1x ", "2 x ", "1. "
  cleaned = cleaned.replace(/^\d+\s*[xX\.]\s*/, '');

  // Strip promotional badges like [โปรคุ้ม], [1แถม1], [ลด20%], [ขายดี], [แนะนำ]
  cleaned = cleaned.replace(/\[[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\([^\)]*(?:แถม|โปร|ลด|ฟรี)[^\)]*\)/gi, '');

  // Strip modifier notes in parentheses at the end if present, e.g. "(เผ็ดน้อย)", "(ไข่ดาว)"
  // But preserve the core dish name
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');

  // Clean trailing punctuation or extra spaces
  cleaned = cleaned.replace(/^[-\*\s]+/, '').replace(/[-\*\s]+$/, '').trim();

  return cleaned || rawName.trim();
}

/**
 * Detects delivery platform channel from raw text
 */
export function detectReceiptChannel(text: string): ParsedReceipt['channel'] {
  const upper = text.toUpperCase();
  if (upper.includes('LINE MAN') || upper.includes('WONGNAI') || upper.includes('LM-')) return 'LINEMAN';
  if (upper.includes('GRAB') || upper.includes('GRABFOOD') || upper.includes('GF-')) return 'GRAB';
  if (upper.includes('SHOPEE') || upper.includes('SHOPEEFOOD') || upper.includes('SF-')) return 'SHOPEE_FOOD';
  if (upper.includes('ROBINHOOD') || upper.includes('RH-')) return 'ROBINHOOD';
  if (upper.includes('FOODPANDA') || upper.includes('PANDA') || upper.includes('FP-')) return 'FOODPANDA';
  return 'PRINT_PROXY';
}

/**
 * Parses raw receipt text from thermal print buffer into structured order data
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const channel = detectReceiptChannel(rawText);

  // Check for cancellation keyword
  const isCancellation =
    rawText.includes('ยกเลิก') ||
    rawText.toUpperCase().includes('CANCELLED') ||
    rawText.toUpperCase().includes('CANCELED');

  // Extract Order ID
  let orderId = '';
  const orderIdMatch =
    rawText.match(/(?:Order ID|Order No|หมายเลขออเดอร์|รหัสออเดอร์|บิลเลขที่|บิล|ID)[:\s#]*([A-Z0-9\-]+)/i) ||
    rawText.match(/(?:LM|GF|SF|RH|FP)-\d+/i) ||
    rawText.match(/#([A-Z0-9\-]{4,})/i);

  if (orderIdMatch) {
    orderId = orderIdMatch[1] || orderIdMatch[0];
  } else {
    orderId = `${channel === 'LINEMAN' ? 'LM' : channel === 'GRAB' ? 'GF' : channel === 'SHOPEE_FOOD' ? 'SF' : 'PP'}-${Date.now().toString().slice(-4)}`;
  }

  // Extract Customer & Rider
  let customerName: string | null = null;
  let riderName: string | null = null;
  let note: string | null = null;

  const customerMatch = rawText.match(/(?:ลูกค้า|Customer|คุณ)[:\s]+([^\n\r]+)/i);
  if (customerMatch) customerName = customerMatch[1].trim();

  const riderMatch = rawText.match(/(?:ไรเดอร์|คนขับ|Driver|Rider)[:\s]+([^\n\r]+)/i);
  if (riderMatch) riderName = riderMatch[1].trim();

  const noteMatch = rawText.match(/(?:หมายเหตุ|Note|คำขอพิเศษ|ข้อความถึงร้าน)[:\s]+([^\n\r]+)/i);
  if (noteMatch) note = noteMatch[1].trim();

  // Extract Items
  const items: ParsedItem[] = [];
  let totalAmount = 0;

  // Regex for line matching e.g. "1x ข้าวกะเพราหมูกรอบ 65" or "ข้าวผัดหมู x 2 110" or "ข้าวกะเพราหมูกรอบ 1 65"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers and footers
    if (
      line.includes('===') ||
      line.includes('---') ||
      line.includes('ยอดรวม') ||
      line.includes('TOTAL') ||
      line.includes('Total') ||
      line.includes('ขอบคุณ') ||
      line.includes('LINE MAN') ||
      line.includes('GrabFood') ||
      line.includes('ShopeeFood')
    ) {
      continue;
    }

    // Match item line: e.g. "1x ข้าวกะเพราหมูกรอบ 65" or "ข้าวกะเพรา 1 65.00"
    const itemMatch =
      line.match(/^(?:(\d+)\s*[xX]\s*)?([^\d฿]+?)(?:\s*[xX]\s*(\d+))?\s+(?:฿|THB)?\s*(\d+(?:\.\d{1,2})?)$/i) ||
      line.match(/^([^\d฿]+?)\s+(\d+)\s+(?:฿|THB)?\s*(\d+(?:\.\d{1,2})?)$/i);

    if (itemMatch) {
      const rawDishName = itemMatch[2] ? itemMatch[2].trim() : itemMatch[1].trim();
      const qty = parseInt(itemMatch[1] || itemMatch[3] || itemMatch[2] || '1', 10) || 1;
      const price = parseFloat(itemMatch[4] || itemMatch[3] || '50');

      // Check next line for modifiers / options
      let selectedOptions: string | null = null;
      let specialNote: string | null = null;

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.startsWith('-') || nextLine.startsWith('+') || nextLine.startsWith('*')) {
          const optText = nextLine.replace(/^[-+*\s]+/, '').trim();
          selectedOptions = JSON.stringify([{ name: optText, extra: 0 }]);
          specialNote = optText;
          i++; // advance line
        }
      }

      const cName = cleanDishName(rawDishName);
      items.push({
        name: rawDishName,
        cleanName: cName,
        price,
        quantity: qty,
        selectedOptions,
        specialNote,
      });

      totalAmount += price * qty;
    }
  }

  // If no items parsed via regex, try loose fallback
  if (items.length === 0) {
    items.push({
      name: 'รายการอาหารเดลิเวอรี',
      cleanName: 'รายการอาหารเดลิเวอรี',
      price: 60,
      quantity: 1,
      selectedOptions: null,
      specialNote: rawText.slice(0, 100),
    });
    totalAmount = 60;
  }

  return {
    channel,
    orderId,
    customerName,
    riderName,
    note,
    items,
    totalAmount,
    isCancellation,
  };
}

/**
 * Normalizes incoming request payload from Virtual Print Proxy
 * Supports structured JSON or raw receipt text
 */
export function normalizePrintProxyPayload(payload: any): ParsedReceipt {
  if (payload.rawText || payload.text || typeof payload === 'string') {
    const text = payload.rawText || payload.text || payload;
    return parseReceiptText(text);
  }

  // Already parsed structured payload from Print Proxy
  const rawChannel = payload.channel || payload.platform || 'PRINT_PROXY';
  const channel = detectReceiptChannel(rawChannel);

  const rawItems = payload.items || payload.orderItems || [];
  let totalAmount = 0;

  const items: ParsedItem[] = rawItems.map((it: any) => {
    const rawName = String(it.name || it.title || 'อาหารตามสั่ง');
    const price = parseFloat(it.price || it.unitPrice || 50);
    const quantity = parseInt(it.quantity || it.qty || 1, 10);
    totalAmount += price * quantity;

    return {
      name: rawName,
      cleanName: cleanDishName(rawName),
      price,
      quantity,
      selectedOptions: it.selectedOptions || (it.options ? JSON.stringify(it.options) : null),
      specialNote: it.specialNote || it.instruction || it.specialInstructions || null,
    };
  });

  return {
    channel,
    orderId: String(payload.orderId || payload.order_id || payload.id || `PP-${Date.now().toString().slice(-4)}`),
    riderName: payload.riderName || payload.rider?.name || payload.driver?.name || null,
    riderPhone: payload.riderPhone || payload.rider?.phone || payload.driver?.phone || null,
    customerName: payload.customerName || payload.customer?.name || payload.consumer?.name || null,
    note: payload.note || payload.remarks || null,
    items: items.length > 0 ? items : [{ name: 'อาหารตามสั่ง', cleanName: 'อาหารตามสั่ง', price: 50, quantity: 1 }],
    totalAmount: payload.totalAmount ? parseFloat(payload.totalAmount) : totalAmount,
    isCancellation: Boolean(
      payload.isCancelled ||
        payload.event === 'ORDER_CANCELLED' ||
        payload.status === 'CANCELLED'
    ),
  };
}

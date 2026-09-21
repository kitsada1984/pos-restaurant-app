import { describe, it, expect } from 'vitest';
import {
  cleanDishName,
  detectReceiptChannel,
  parseReceiptText,
  normalizePrintProxyPayload,
} from '@/lib/receiptParser';

describe('Receipt Parser & Normalizer Unit Tests', () => {
  describe('cleanDishName', () => {
    it('should strip promotional tags like [โปรคุ้ม] and [1แถม1]', () => {
      expect(cleanDishName('1x [โปรคุ้ม] ข้าวกะเพราหมูกรอบ (ไข่ดาว)')).toBe('ข้าวกะเพราหมูกรอบ');
      expect(cleanDishName('2 x [1แถม1] ข้าวผัดหมู')).toBe('ข้าวผัดหมู');
      expect(cleanDishName('[ขายดี] ต้มยำกุ้งน้ำข้น')).toBe('ต้มยำกุ้งน้ำข้น');
      expect(cleanDishName('3x ข้าวไข่เจียว')).toBe('ข้าวไข่เจียว');
    });

    it('should return untouched dish name when clean already', () => {
      expect(cleanDishName('ผัดคะน้าหมูกรอบ')).toBe('ผัดคะน้าหมูกรอบ');
      expect(cleanDishName('ต้มจืดเต้าหู้หมูสับ')).toBe('ต้มจืดเต้าหู้หมูสับ');
    });

    it('should handle null, empty, or undefined safely', () => {
      expect(cleanDishName('')).toBe('');
      expect(cleanDishName(null as any)).toBe('');
      expect(cleanDishName(undefined as any)).toBe('');
    });
  });

  describe('detectReceiptChannel', () => {
    it('should detect LINEMAN from LINE MAN receipts', () => {
      const linemanSlip = '--- LINE MAN Delivery ---\nOrder #LM-8899\nCustomer: คุณมานะ';
      expect(detectReceiptChannel(linemanSlip)).toBe('LINEMAN');
    });

    it('should detect GRAB from GrabFood receipts', () => {
      const grabSlip = 'GrabFood Order\nGF-1234\nDriver: สุรชัย';
      expect(detectReceiptChannel(grabSlip)).toBe('GRAB');
    });

    it('should detect SHOPEE_FOOD from Shopee receipts', () => {
      const shopeeSlip = 'ShopeeFood Order\nSF-9921';
      expect(detectReceiptChannel(shopeeSlip)).toBe('SHOPEE_FOOD');
    });
  });

  describe('parseReceiptText', () => {
    it('should parse an ESC/POS text slip accurately', () => {
      const sampleText = `
        ========================================
                      LINE MAN
        ----------------------------------------
        Order ID: LM-7749
        Customer: คุณเอกชัย
        Rider: สมชาย พุ่มพวง
        Note: ส่งหน้าบ้าน รั้วสีขาว
        ----------------------------------------
        1x [โปรคุ้ม] ข้าวกะเพราหมูกรอบ       75.00
           - เผ็ดกลาง ไม่ใส่ชูรส
        1x ไข่ดาว                          10.00
        ----------------------------------------
        ยอดรวม:                            85.00
        ========================================
      `;

      const parsed = parseReceiptText(sampleText);
      expect(parsed.channel).toBe('LINEMAN');
      expect(parsed.orderId).toBe('LM-7749');
      expect(parsed.customerName).toBe('คุณเอกชัย');
      expect(parsed.riderName).toBe('สมชาย พุ่มพวง');
      expect(parsed.note).toBe('ส่งหน้าบ้าน รั้วสีขาว');
      expect(parsed.totalAmount).toBe(85);
      expect(parsed.items.length).toBe(2);
      expect(parsed.items[0].cleanName).toBe('ข้าวกะเพราหมูกรอบ');
      expect(parsed.items[0].price).toBe(75);
      expect(parsed.items[1].cleanName).toBe('ไข่ดาว');
      expect(parsed.isCancellation).toBe(false);
    });

    it('should detect cancellation slips', () => {
      const cancelText = 'LINE MAN\nOrder ID: LM-9999\nสถานะ: ยกเลิกออเดอร์ CANCELLED';
      const parsed = parseReceiptText(cancelText);
      expect(parsed.isCancellation).toBe(true);
    });
  });

  describe('normalizePrintProxyPayload', () => {
    it('should pass through structured JSON payloads if items exist', () => {
      const jsonPayload = {
        orderId: 'LM-123',
        channel: 'LINEMAN',
        items: [{ name: 'กะเพราหมู', price: 60, quantity: 1 }],
      };
      const normalized = normalizePrintProxyPayload(jsonPayload);
      expect(normalized.orderId).toBe('LM-123');
      expect(normalized.channel).toBe('LINEMAN');
    });

    it('should parse rawText inside JSON payload', () => {
      const rawPayload = {
        rawText: 'GrabFood Order GF-456\n1x ข้าวผัด 50.00\nยอดรวม: 50.00',
      };
      const normalized = normalizePrintProxyPayload(rawPayload);
      expect(normalized.channel).toBe('GRAB');
      expect(normalized.orderId).toBe('GF-456');
      expect(normalized.items.length).toBeGreaterThan(0);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { parseBankNotificationText } from '@/lib/bank-message-parser';

describe('Bank Notification Message Parser', () => {
  it('correctly parses genuine incoming deposit notifications', () => {
    const text = 'เงินเข้าบัญชี x-9999 จำนวน ฿150.00 จาก นาย กิตติศักดิ์ เมื่อ 26/09/2569 ยอดเงินคงเหลือ ฿12,450.00';
    const parsed = parseBankNotificationText(text, 'SCB Connect');

    expect(parsed.isValid).toBe(true);
    expect(parsed.isDeposit).toBe(true);
    expect(parsed.amount).toBe(150);
    expect(parsed.bank).toBe('SCB');
  });

  it('rejects outgoing transfers with recipient PromptPay IDs without parsing recipient ID as currency', () => {
    const text = `แจ้งเตือนจากแอป SCB Easy: บริการอัตโนมัติแจ้งเตือนการทำธุรกรรม
เรียน กฤษดา เผ่าม่วง

ธนาคารขอแจ้งว่า คุณได้เข้าสู่ระบบ แอพ SCB Easy ครั้งล่าสุด เมื่อวันที่ 24 
ก.ย. 2569 เวลา 20:35:59 น. โดยทำธุรกรรมดังนี้

ประเภทของรายการ: โอนเงินพร้อมเพย์ 
รายละเอียด: จาก ธนาคารไทยพาณิชย์ เบอร์บัญชี xxxxxx6946
ไปยัง หมายเลขพร้อมเพย์ผู้รับเงิน 1341100042801
จำนวนเงิน 140.00 บาท
วันและเวลาการทำรายการ: 24 ก.ย. 2569 ณ 20:35:59`;

    const parsed = parseBankNotificationText(text, 'SCB Easy <scbeasynet@scb.co.th>');

    expect(parsed.isValid).toBe(false);
    expect(parsed.amount).not.toBe(1341100042801);
  });

  it('rejects login and security alerts', () => {
    const text = 'แจ้งเตือน: คุณได้เข้าสู่ระบบ แอพ SCB Easy ครั้งล่าสุด เมื่อวันที่ 25 ก.ย. 2569 เวลา 20:00:06 น.';
    const parsed = parseBankNotificationText(text, 'SCB Easy');

    expect(parsed.isValid).toBe(false);
  });

  it('rejects marketing and gambling spam', () => {
    const text = '🎰 สล็อต & คาสิโนสด รับเงินคืน 6% รายสัปดาห์ – สูงสุดถึง THB6888! 💰 Uwin33';
    const parsed = parseBankNotificationText(text, 'UWIN33 TH');

    expect(parsed.isValid).toBe(false);
  });
});

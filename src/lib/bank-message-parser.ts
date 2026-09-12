/**
 * Bank Notification Parser
 * ตัวแยกวิเคราะห์ข้อความแจ้งเตือนเงินเข้าจาก LINE (SCB Connect, KBank Live, ฯลฯ)
 * และการแจ้งเตือนของแอปพลิเคชันธนาคารในประเทศไทยทุกธนาคาร
 */

export interface ParsedBankMessage {
  isValid: boolean;
  isDeposit: boolean;     // true = เงินเข้า, false = เงินออก/ถอนเงิน
  amount?: number;        // จำนวนเงิน เช่น 120.00
  bank?: string;          // รหัสธนาคาร เช่น 'SCB', 'KBANK', 'KTB', 'BBL', 'TTB', 'GSB', 'BAY', 'PROMPTPAY'
  bankName?: string;      // ชื่อภาษาไทย
  account?: string;       // เลขบัญชี เช่น x-1234
  sender?: string;        // ชื่อผู้ส่ง/แอป เช่น SCB Connect, KBank Live
  transDate?: string;     // วันที่เวลาในข้อความ
  rawText: string;        // ข้อความดั้งเดิม
  message: string;        // ข้อความสรุปผลการวิเคราะห์
}

export const THAI_BANK_NAMES: Record<string, string> = {
  SCB: 'ธนาคารไทยพาณิชย์ (SCB)',
  KBANK: 'ธนาคารกสิกรไทย (KBank)',
  KTB: 'ธนาคารกรุงไทย (Krungthai)',
  BBL: 'ธนาคารกรุงเทพ (Bangkok Bank)',
  TTB: 'ธนาคารทหารไทยธนชาต (ttb)',
  GSB: 'ธนาคารออมสิน (GSB)',
  BAY: 'ธนาคารกรุงศรีอยุธยา (Krungsri)',
  BAAC: 'ธ.ก.ส. (BAAC)',
  PROMPTPAY: 'พร้อมเพย์ (PromptPay)',
  UNKNOWN: 'ธนาคารในประเทศไทย',
};

/**
 * แยกวิเคราะห์ข้อความแจ้งเตือนจาก LINE หรือ Notification ของธนาคาร
 */
export function parseBankNotificationText(
  rawText: string,
  declaredSender?: string
): ParsedBankMessage {
  const text = (rawText || '').trim();
  const sender = (declaredSender || '').trim();
  const fullText = `${sender} ${text}`.trim();

  if (!text) {
    return {
      isValid: false,
      isDeposit: false,
      rawText: '',
      message: 'ไม่มีข้อความแจ้งเตือน',
    };
  }

  // 1. ตรวจสอบว่าเป็น "เงินออก" หรือ "ถอนเงิน/ชำระเงิน" หรือไม่ (ถ้าใช่ ให้ปฏิเสธทันที)
  const isWithdrawal = /(เงินออก|โอนเงินออก|โอนสำเร็จ|โอนไป|ชำระเงิน|ถอนเงิน|หักบัญชี|จ่ายบิล|ตัดบัญชี|จ่ายเงิน)/i.test(
    text
  ) && !/(เงินเข้า|รับเงิน|รับโอน|ได้รับ)/i.test(text);

  if (isWithdrawal) {
    return {
      isValid: false,
      isDeposit: false,
      rawText: text,
      sender,
      message: 'ตรวจพบรายการเงินออก (ไม่ใช่รายการเงินเข้า)',
    };
  }

  // 2. ตรวจสอบยืนยันว่าเป็น "เงินเข้า"
  const isDeposit = /(เงินเข้า|รับเงิน|รับโอน|ได้รับเงิน|ยอดเงินเข้า|โอนเข้า|เงินโอนเข้า|deposit|received|inward)/i.test(
    fullText
  );

  // 3. ระบุธนาคาร (Bank Identification)
  let bank = 'UNKNOWN';
  if (/scb|ไทยพาณิชย์|แม่มณี/i.test(fullText)) {
    bank = 'SCB';
  } else if (/kbank|k plus|กสิกร|k-plus|kplus/i.test(fullText)) {
    bank = 'KBANK';
  } else if (/ktb|krungthai|กรุงไทย|เป๋าตัง/i.test(fullText)) {
    bank = 'KTB';
  } else if (/bbl|bangkok bank|กรุงเทพ|บัวหลวง/i.test(fullText)) {
    bank = 'BBL';
  } else if (/ttb|tmb|thanachart|ทหารไทย|ธนชาต/i.test(fullText)) {
    bank = 'TTB';
  } else if (/gsb|ออมสิน|mymo/i.test(fullText)) {
    bank = 'GSB';
  } else if (/bay|krungsri|กรุงศรี/i.test(fullText)) {
    bank = 'BAY';
  } else if (/baac|ธกส|ธ\.ก\.ส\./i.test(fullText)) {
    bank = 'BAAC';
  } else if (/พร้อมเพย์|promptpay/i.test(fullText)) {
    bank = 'PROMPTPAY';
  }

  // 4. ดึงยอดเงิน (Amount Extraction)
  let amount: number | undefined = undefined;

  const patterns = [
    // ฿150.00 หรือ ฿ 150.00 หรือ ฿150
    /(?:฿|THB)\s*([0-9,]+\.?[0-9]*)/i,
    // จำนวน 150.00 บาท หรือ จำนวน 150 บาท
    /(?:จำนวน|ยอด|เงินเข้า|รับเงิน|รับโอน|โอนเข้า)\s*:?\s*([0-9,]+\.?[0-9]*)\s*(?:บาท|บ\.|THB)?/i,
    // 150.00 บาท หรือ 150.00 บ. หรือ 150 บาท
    /([0-9,]+\.[0-9]{2})\s*(?:บาท|บ\.|THB)/i,
    /([0-9,]+)\s*(?:บาท|บ\.)/i,
    // ตัวเลขเงินที่มีทศนิยม 2 ตำแหน่ง
    /\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsedVal = parseFloat(cleanNum);
      if (!isNaN(parsedVal) && parsedVal > 0) {
        amount = parsedVal;
        break;
      }
    }
  }

  // 5. ดึงเลขบัญชี (Account Number เช่น x-1234 หรือ xxx1234)
  let account: string | undefined = undefined;
  const accMatch = text.match(/(?:บัญชี|เลขที่|acc|account|บ\/ช)\s*:?\s*([xX\*\-0-9]{4,16})/i);
  if (accMatch && accMatch[1]) {
    account = accMatch[1].trim();
  }

  // 6. ดึงวันที่และเวลา
  let transDate: string | undefined = undefined;
  const dateMatch = text.match(/([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/);
  if (dateMatch && dateMatch[1]) {
    transDate = dateMatch[1].trim();
  } else {
    // ภาษาไทย เช่น "12 ก.ย. 69 08:50"
    const thaiDateMatch = text.match(/([0-9]{1,2}\s+[^\s]+\s+[0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2})/);
    if (thaiDateMatch && thaiDateMatch[1]) {
      transDate = thaiDateMatch[1].trim();
    }
  }

  const isValid = Boolean(isDeposit && amount !== undefined && amount > 0);

  return {
    isValid,
    isDeposit,
    amount,
    bank,
    bankName: THAI_BANK_NAMES[bank] || THAI_BANK_NAMES.UNKNOWN,
    account,
    sender: sender || undefined,
    transDate,
    rawText: text,
    message: isValid
      ? `ตรวจพบยอดเงินเข้า ฿${amount?.toLocaleString()} ธนาคาร ${THAI_BANK_NAMES[bank] || bank}`
      : 'ไม่สามารถระบุยอดเงินเข้าที่ถูกต้องจากข้อความได้',
  };
}

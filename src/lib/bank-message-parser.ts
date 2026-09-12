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
  // กฎเหล็ก: ค้นหาและตัด "ยอดเงินคงเหลือ" (Account Balance) ทิ้งทั้งหมดอย่างเด็ดขาด
  // เพื่อการันตี 100% ว่าจะอ่านเฉพาะ "ยอดเงินเข้า" เท่านั้น ไม่มียอดคงเหลือปะปน
  const balancePattern = /(?:ยอดเงินคงเหลือ|ยอดคงเหลือ|เงินคงเหลือ|คงเหลือ|ยอดเงินที่ใช้ได้|ยอดเงินใช้ได้|คงเหลือใช้ได้|คงเหลือสุทธิ|ยอดในบัญชี|ยอดเงินในบัญชี|balance|available balance|avail\s*bal|ledger\s*bal|current balance|ending balance)[^0-9\n]{0,30}?(?:฿|THB)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|บ\.|THB)?/gi;

  const detectedBalances: number[] = [];
  let bMatch: RegExpExecArray | null;
  const balanceScanner = new RegExp(balancePattern.source, 'gi');
  while ((bMatch = balanceScanner.exec(text)) !== null) {
    if (bMatch[1]) {
      const bVal = parseFloat(bMatch[1].replace(/,/g, ''));
      if (!isNaN(bVal)) {
        detectedBalances.push(bVal);
      }
    }
  }

  // ตัดคำว่ายอดคงเหลือและตัวเลขที่ผูกกับยอดคงเหลือทิ้งจากข้อความค้นหาทั้งหมด
  const cleanSearchText = text.replace(balancePattern, ' ');

  let amount: number | undefined = undefined;

  const patterns = [
    // 1. ระบุชัดเจนว่าเป็นเงินเข้า เช่น "เงินเข้า ฿150.00", "รับเงิน 150 บาท", "รับโอน 150.00"
    /(?:เงินเข้า|รับเงิน|รับโอน|โอนเข้า|เงินโอนเข้า|ยอดเงินเข้า|ได้รับเงิน|ได้รับโอน|จำนวนเงินเข้า|deposit|received)\s*:?\s*(?:฿|THB)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // 2. มีคำว่าเงินเข้า นำหน้า แล้วตามด้วยจำนวน เช่น "เงินเข้าบัญชี x-1234 จำนวน 150.00 บาท"
    /(?:เงินเข้า|รับเงิน|รับโอน|โอนเข้า|เงินโอนเข้า|ได้รับเงิน|ได้รับโอน)[\s\S]{1,60}?(?:จำนวน\s*)?(?:฿|THB)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|บ\.|THB)/i,
    // 3. มีคำว่า "จำนวน" เช่น "จำนวน 150.00 บาท", "จำนวน ฿150.00"
    /(?:จำนวน|amount)\s*:?\s*(?:฿|THB)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|บ\.|THB)?/i,
    // 4. สัญลักษณ์สกุลเงิน ฿150.00 หรือ THB 150.00 (ค้นหาในข้อความที่ตัดยอดคงเหลือทิ้งแล้ว)
    /(?:฿|THB)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // 5. 150.00 บาท หรือ 150.00 บ. หรือ 150 บาท
    /([0-9,]+\.[0-9]{2})\s*(?:บาท|บ\.|THB)/i,
    /([0-9,]+)\s*(?:บาท|บ\.)/i,
    // 6. ตัวเลขเงินที่มีทศนิยม 2 ตำแหน่ง
    /\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/,
  ];

  for (const regex of patterns) {
    const match = cleanSearchText.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const candidateVal = parseFloat(cleanNum);
      // ตรวจสอบความปลอดภัย: ยอดเงินเข้าต้องมากกว่า 0 และต้องไม่ตรงกับยอดเงินคงเหลือใดๆ ในบัญชี
      const isMatchingAnyBalance = detectedBalances.some(bal => Math.abs(bal - candidateVal) < 0.01);
      if (!isNaN(candidateVal) && candidateVal > 0 && !isMatchingAnyBalance) {
        amount = candidateVal;
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

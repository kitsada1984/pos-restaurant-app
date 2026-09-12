import crypto from 'crypto';

// รายชื่อรหัสธนาคารไทย (Bank Codes)
export const THAI_BANKS: { [code: string]: { name: string; short: string; color: string } } = {
  '002': { name: 'ธนาคารกรุงเทพ', short: 'BBL', color: '#1e3a8a' },
  '004': { name: 'ธนาคารกสิกรไทย', short: 'KBANK', color: '#16a34a' },
  '006': { name: 'ธนาคารกรุงไทย', short: 'KTB', color: '#0284c7' },
  '011': { name: 'ธนาคารทหารไทยธนชาต', short: 'TTB', color: '#2563eb' },
  '014': { name: 'ธนาคารไทยพาณิชย์', short: 'SCB', color: '#7c3aed' },
  '025': { name: 'ธนาคารกรุงศรีอยุธยา', short: 'BAY', color: '#d97706' },
  '069': { name: 'ธนาคารเกียรตินาคินภัทร', short: 'KKP', color: '#4f46e5' },
  '022': { name: 'ธนาคารซีไอเอ็มบีไทย', short: 'CIMBT', color: '#b91c1c' },
  '067': { name: 'ธนาคารทิสโก้', short: 'TISCO', color: '#0369a1' },
  '073': { name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', short: 'LHBANK', color: '#6b7280' },
  '030': { name: 'ธนาคารออมสิน', short: 'GSB', color: '#ec4899' },
  '034': { name: 'ธ.ก.ส.', short: 'BAAC', color: '#15803d' },
};

export interface ParsedSlipData {
  isValid: boolean;
  rawPayload: string;
  slipRef: string;
  amount?: number;
  bankCode?: string;
  bankName?: string;
  transDate?: string;
  receiverAccount?: string;
  receiverName?: string;
  senderName?: string;
  provider: 'INTERNAL' | 'SLIPOK' | 'EASYSLIP';
  verificationStatus: 'VALID' | 'AMOUNT_MISMATCH' | 'DUPLICATE' | 'INVALID_QR' | 'API_ERROR';
  message: string;
}

/**
 * ฟังก์ชันแยกโครงสร้าง Tag-Length-Value (TLV) ของ EMVCo / PromptPay QR
 */
export function parseTLV(payload: string): { [tag: string]: string } {
  const tags: { [tag: string]: string } = {};
  let i = 0;
  while (i < payload.length - 4) {
    const tag = payload.substring(i, i + 2);
    const lengthStr = payload.substring(i + 2, i + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 0 || i + 4 + length > payload.length) {
      break;
    }
    const value = payload.substring(i + 4, i + 4 + length);
    tags[tag] = value;
    i += 4 + length;
  }
  return tags;
}

/**
 * สร้าง Unique Hash ของสลิป เพื่อป้องกันการนำสลิปเดิมมาใช้ซ้ำ (Anti-Fraud)
 */
export function generateSlipHash(payload: string): string {
  return crypto.createHash('sha256').update(payload.trim()).digest('hex').substring(0, 32);
}

/**
 * ถอดรหัส Mini-QR จากข้อมูล QR payload บนสลิปธนาคาร
 */
export function parseBankSlipQr(rawPayload: string): ParsedSlipData {
  const trimmed = rawPayload.trim();
  if (!trimmed || trimmed.length < 10) {
    return {
      isValid: false,
      rawPayload: trimmed,
      slipRef: '',
      provider: 'INTERNAL',
      verificationStatus: 'INVALID_QR',
      message: 'รหัส QR Code ในสลิปไม่ถูกต้องหรือไม่ครบถ้วน',
    };
  }

  // รูปแบบ 1: ITMX BScanC Standard (ขึ้นต้นด้วย 0046... หรือ 005...)
  if (trimmed.startsWith('0046') || trimmed.startsWith('005')) {
    try {
      const subPayload = trimmed.substring(4);
      const subTags = parseTLV(subPayload);
      const bankCode = subTags['01'] || '';
      const transRef = subTags['02'] || generateSlipHash(trimmed);
      const transDate = subTags['03'] || '';
      const amountStr = subTags['04'] || '';
      const amount = amountStr ? parseFloat(amountStr) : undefined;
      const bankInfo = THAI_BANKS[bankCode] || { name: 'ธนาคารในประเทศไทย', short: 'BANK', color: '#475569' };

      return {
        isValid: true,
        rawPayload: trimmed,
        slipRef: `${bankCode}_${transRef}`,
        amount,
        bankCode,
        bankName: bankInfo.name,
        transDate,
        provider: 'INTERNAL',
        verificationStatus: 'VALID',
        message: `ตรวจพบสลิปธนาคาร ${bankInfo.name} (${bankInfo.short})`,
      };
    } catch {
      // Fallback to generic parsing
    }
  }

  // รูปแบบ 2: มาตรฐาน EMVCo (000201...)
  if (trimmed.startsWith('000201')) {
    try {
      const tags = parseTLV(trimmed);
      let amount: number | undefined = undefined;
      if (tags['54']) {
        const parsedAmt = parseFloat(tags['54']);
        if (!isNaN(parsedAmt)) amount = parsedAmt;
      }

      // ดึง ref จาก Tag 62 (Additional Data)
      let transRef = '';
      if (tags['62']) {
        const sub62 = parseTLV(tags['62']);
        transRef = sub62['01'] || sub62['05'] || sub62['07'] || '';
      }
      if (!transRef) {
        transRef = generateSlipHash(trimmed);
      }

      return {
        isValid: true,
        rawPayload: trimmed,
        slipRef: `EMV_${transRef}`,
        amount,
        provider: 'INTERNAL',
        verificationStatus: 'VALID',
        message: 'ถอดรหัส Mini-QR สลิปสำเร็จ',
      };
    } catch {
      // Fallback
    }
  }

  // รูปแบบ 3: Bank URL หรือ Token เฉพาะธนาคาร (เช่น scbeasy, kbank, krungthai)
  const hashRef = generateSlipHash(trimmed);
  let detectedBankName = 'ธนาคาร';
  if (trimmed.includes('scbeasy') || trimmed.includes('scb')) detectedBankName = 'ธนาคารไทยพาณิชย์ (SCB)';
  else if (trimmed.includes('kbank')) detectedBankName = 'ธนาคารกสิกรไทย (KBANK)';
  else if (trimmed.includes('ktb') || trimmed.includes('krungthai')) detectedBankName = 'ธนาคารกรุงไทย (KTB)';
  else if (trimmed.includes('ttbbank')) detectedBankName = 'ธนาคารทหารไทยธนชาต (TTB)';

  return {
    isValid: true,
    rawPayload: trimmed,
    slipRef: `URL_${hashRef}`,
    bankName: detectedBankName,
    provider: 'INTERNAL',
    verificationStatus: 'VALID',
    message: `ตรวจพบข้อมูลสลิป ${detectedBankName}`,
  };
}

/**
 * ยิงตรวจสอบกับ SlipOK API Gateway (หากร้านค้ากรอก API Key)
 */
export async function verifyWithSlipOK(
  apiKey: string,
  qrPayload: string,
  branchId?: string
): Promise<ParsedSlipData | null> {
  try {
    const url = branchId
      ? `https://api.slipok.com/api/line/apikey/${apiKey}/${branchId}`
      : `https://api.slipok.com/api/line/apikey/${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: qrPayload, log: true }),
    });

    const json = await res.json();
    if (json.success && json.data) {
      const d = json.data;
      const bankCode = d.sendingBank || '';
      const bankInfo = THAI_BANKS[bankCode] || { name: 'ธนาคาร', short: 'BANK', color: '#475569' };

      return {
        isValid: true,
        rawPayload: qrPayload,
        slipRef: d.transRef || generateSlipHash(qrPayload),
        amount: typeof d.amount === 'number' ? d.amount : parseFloat(d.amount),
        bankCode,
        bankName: bankInfo.name,
        transDate: d.transDate ? `${d.transDate} ${d.transTime || ''}` : undefined,
        receiverAccount: d.receiver?.account?.value || d.receiver?.proxy?.value,
        receiverName: d.receiver?.account?.name || d.receiver?.name,
        senderName: d.sender?.account?.name || d.sender?.name,
        provider: 'SLIPOK',
        verificationStatus: 'VALID',
        message: 'ตรวจสอบผ่าน SlipOK API เรียบร้อยแล้ว (ยอดเงินเข้าบัญชีจริง)',
      };
    } else {
      return {
        isValid: false,
        rawPayload: qrPayload,
        slipRef: generateSlipHash(qrPayload),
        provider: 'SLIPOK',
        verificationStatus: 'INVALID_QR',
        message: json.message || 'SlipOK ปฏิเสธสลิปนี้ (อาจเป็นสลิปปลอม หรือไม่อยู่ในระบบ ITMX)',
      };
    }
  } catch (error: any) {
    console.error('SlipOK verification error:', error);
    return null;
  }
}

/**
 * ยิงตรวจสอบกับ EasySlip API Gateway
 */
export async function verifyWithEasySlip(
  apiKey: string,
  qrPayload: string
): Promise<ParsedSlipData | null> {
  try {
    const res = await fetch('https://developer.easyslip.com/api/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ payload: qrPayload }),
    });

    const json = await res.json();
    if (json.status === 200 && json.data) {
      const d = json.data;
      return {
        isValid: true,
        rawPayload: qrPayload,
        slipRef: d.transRef || generateSlipHash(qrPayload),
        amount: d.amount?.amount ? parseFloat(d.amount.amount) : undefined,
        bankCode: d.sender?.bank?.id,
        bankName: d.sender?.bank?.name,
        transDate: d.date,
        receiverAccount: d.receiver?.account?.bank?.account,
        receiverName: d.receiver?.account?.name?.th,
        senderName: d.sender?.account?.name?.th,
        provider: 'EASYSLIP',
        verificationStatus: 'VALID',
        message: 'ตรวจสอบผ่าน EasySlip API เรียบร้อยแล้ว (ยอดเงินเข้าบัญชีจริง)',
      };
    } else {
      return {
        isValid: false,
        rawPayload: qrPayload,
        slipRef: generateSlipHash(qrPayload),
        provider: 'EASYSLIP',
        verificationStatus: 'INVALID_QR',
        message: json.message || 'EasySlip ปฏิเสธสลิปนี้',
      };
    }
  } catch (error: any) {
    console.error('EasySlip verification error:', error);
    return null;
  }
}

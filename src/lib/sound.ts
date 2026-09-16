/**
 * Web Audio API Sound Synthesizer for Kitchen & Order Chimes
 */

export function playOrderChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // First note (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second note (A5 - High Bright Chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.15);
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);

    // Third note (C#6 - Resonant Ring)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1108.73, now + 0.3);
    gain3.gain.setValueAtTime(0.3, now + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.3);
    osc3.stop(now + 1.2);
  } catch (err) {
    console.warn('Audio chime playback error:', err);
  }
}

export function playSuccessChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.warn('Audio success chime playback error:', err);
  }
}

/**
 * Distinct 2-Strike Service Desk Bell Chime for Customer Calling Staff ("Ding-Dong ... Ding-Dong")
 */
export function playServiceCallChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const playStrike = (startTime: number) => {
      // High Ding (E6 ~1318Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, startTime);
      gain1.gain.setValueAtTime(0.45, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(startTime);
      osc1.stop(startTime + 0.55);

      // Resonant Dong / Harmonic (B5 ~987Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(987.77, startTime + 0.1);
      gain2.gain.setValueAtTime(0.35, startTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime + 0.1);
      osc2.stop(startTime + 0.65);
    };

    // Double strike desk bell
    playStrike(now);
    playStrike(now + 0.4);
  } catch (err) {
    console.warn('Audio service call chime error:', err);
  }
}

/**
 * Distinct Rapid Triple-Beep Chime for Incoming Delivery Orders (LINE MAN / Grab)
 */
export function playDeliveryChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Rapid fanfare: F5 -> A5 -> C6 -> F6
    const notes = [698.46, 880.00, 1046.50, 1396.91];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.35, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  } catch (err) {
    console.warn('Delivery chime error:', err);
  }
}

export function formatThaiCurrencyForSpeech(amount: number): string {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return '0 บาท';
  const baht = Math.floor(num);
  const satang = Math.round((num - baht) * 100);
  if (satang > 0) {
    return `${baht} บาท ${satang} สตางค์`;
  }
  return `${baht} บาท`;
}

let cachedThaiVoice: SpeechSynthesisVoice | null = null;

function findBestThaiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // กรองเฉพาะเสียงภาษาไทย (th-TH, th_TH, th)
    const thaiVoices = voices.filter((v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang === 'th-th' || lang.startsWith('th');
    });

    if (thaiVoices.length === 0) return null;

    // ให้ความสำคัญกับเสียง Natural, Google หรือเสียงพรีเมียมก่อน
    const premiumVoice = thaiVoices.find((v) => {
      const name = (v.name || '').toLowerCase();
      return (
        name.includes('natural') ||
        name.includes('google') ||
        name.includes('premwadee') ||
        name.includes('online') ||
        name.includes('narisa') ||
        name.includes('kanya')
      );
    });

    return premiumVoice || thaiVoices[0];
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      const best = findBestThaiVoice();
      if (best) cachedThaiVoice = best;
    } catch {}
  };

  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Thai Text-to-Speech Voice Synthesizer
 * อ่านออกเสียงข้อความภาษาไทยด้วย Web Speech API
 */
export function speakThaiVoice(text: string, rate: number = 1.0) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!text || !text.trim()) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    // ยกเลิกเสียงที่กำลังพูดค้างอยู่ก่อนหน้า
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'th-TH';
    utterance.rate = rate; // ความเร็วตามที่กำหนด (ค่าเริ่มต้น 1.0)
    utterance.pitch = 1.0;

    const voice = cachedThaiVoice || findBestThaiVoice();
    if (voice) {
      cachedThaiVoice = voice;
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * อ่านออกเสียงยอดเงินเข้าภาษาไทย เช่น "เงินเข้า โต๊ะ 1 50 บาท เรียบร้อยค่ะ"
 * อ่านเฉพาะยอดเงินเข้า ไม่มียอดคงเหลือปะปน
 */
export function speakMoneyReceived(amount: number, tableName?: string) {
  const formattedAmount = formatThaiCurrencyForSpeech(amount);
  let target = '';
  if (tableName) {
    target = String(tableName).startsWith('โต๊ะ') ? ` ${tableName}` : ` โต๊ะ ${tableName}`;
  }
  speakThaiVoice(`เงินเข้า${target} ${formattedAmount} เรียบร้อยค่ะ`.replace(/\s+/g, ' ').trim());
}

/**
 * อ่านออกเสียงเมื่อตรวจสอบสลิปโอนเงินถูกต้องและปิดบิลสำเร็จ
 */
export function speakSlipVerified(amount: number, tableName?: string) {
  const formattedAmount = formatThaiCurrencyForSpeech(amount);
  let target = '';
  if (tableName) {
    target = String(tableName).startsWith('โต๊ะ') ? ` ${tableName}` : ` โต๊ะ ${tableName}`;
  }
  speakThaiVoice(`เงินเข้า${target} ${formattedAmount} เรียบร้อยค่ะ`.replace(/\s+/g, ' ').trim());
}

/**
 * อ่านออกเสียงเมื่อลูกค้ากดแจ้งโอนเงินผ่านหน้าเว็บ (รอแคชเชียร์ตรวจเช็ค)
 * เช่น "ตรวจสอบเงินเข้าโต๊ะ 1 จำนวน 50 บาทค่ะ"
 */
export function speakCustomerNotifyTransfer(tableNo: number | string, amount: number) {
  const cleanTable = String(tableNo || '').replace(/^โต๊ะ\s*/, '').trim();
  const amountPart = formatThaiCurrencyForSpeech(amount);
  speakThaiVoice(`ตรวจสอบเงินเข้าโต๊ะ ${cleanTable} จำนวน ${amountPart} ค่ะ`.replace(/\s+/g, ' ').trim());
}

/**
 * อ่านออกเสียงเมื่อระบบสแกนอ่านสลิปสำเร็จ (โหมดรอแคชเชียร์กดยืนยันปิดบิล)
 */
export function speakSlipReadSuccess(amount: number, tableName?: string) {
  const formattedAmount = formatThaiCurrencyForSpeech(amount);
  const target = tableName ? ` ${tableName}` : '';
  speakThaiVoice(`อ่านสลิปถูกต้อง ได้รับเงิน ${formattedAmount}${target} ค่ะ กรุณากดยืนยันปิดบิลค่ะ`);
}

/**
 * แจ้งเตือนสลิปซ้ำ
 */
export function speakSlipDuplicate() {
  speakThaiVoice('แจ้งเตือนค่ะ สลิปนี้เคยถูกใช้งานในระบบแล้วค่ะ');
}

/**
 * แจ้งเตือนยอดเงินในสลิปไม่ตรงกับยอดบิล
 */
export function speakSlipAmountMismatch(slipAmount?: number, expectedAmount?: number) {
  if (slipAmount && expectedAmount) {
    const slipText = formatThaiCurrencyForSpeech(slipAmount);
    const expText = formatThaiCurrencyForSpeech(expectedAmount);
    speakThaiVoice(`แจ้งเตือนค่ะ ยอดเงินในสลิป ${slipText} ไม่ตรงกับยอดบิล ${expText} ค่ะ`);
  } else {
    speakThaiVoice('แจ้งเตือนค่ะ ยอดเงินในสลิปไม่ตรงกับยอดบิลที่ต้องชำระค่ะ');
  }
}

/**
 * แจ้งเตือนบัญชีผู้รับเงินในสลิปไม่ตรงกับร้านค้า
 */
export function speakSlipReceiverMismatch() {
  speakThaiVoice('แจ้งเตือนค่ะ บัญชีผู้รับเงินในสลิป ไม่ตรงกับพร้อมเพย์ของร้านค่ะ');
}

/**
 * แจ้งเตือนเมื่อไม่พบคิวอาร์โค้ดบนสลิป
 */
export function speakSlipNoQr() {
  speakThaiVoice('แนบรูปสลิปแล้ว ไม่พบคิวอาร์โค้ดบนรูป กรุณาตรวจทานด้วยสายตาค่ะ');
}

/**
 * แจ้งเตือนเมื่อโต๊ะส่งสลิปเข้ามาผ่านหน้าเว็บ
 */
export function speakSlipSubmitted(tableNo?: number | string, amount?: number) {
  const cleanTable = tableNo ? String(tableNo).replace(/^โต๊ะ\s*/, '').trim() : '';
  if (amount) {
    const amountPart = formatThaiCurrencyForSpeech(amount);
    speakThaiVoice(`ตรวจสอบเงินเข้าโต๊ะ ${cleanTable} จำนวน ${amountPart} ค่ะ`.replace(/\s+/g, ' ').trim());
  } else {
    speakThaiVoice(`ตรวจสอบเงินเข้าโต๊ะ ${cleanTable} ค่ะ`.replace(/\s+/g, ' ').trim());
  }
}

/**
 * แจ้งเตือนลูกค้ากดเรียกพนักงานที่โต๊ะอาหาร
 * ใช้ประโยคสั้นกระชับ รวดเร็ว สปีด 1.15x เพื่อให้พูดจบไวใน 1-2 วินาที
 */
export function speakServiceCall(
  tableNo?: number | string,
  requestType?: string,
  note?: string,
  rate: number = 1.15
) {
  const cleanTable = tableNo ? String(tableNo).replace(/^โต๊ะ\s*/, '').trim() : '';
  const rawType = (requestType || '').trim();
  const cleanType = rawType && rawType !== 'เรียกพนักงาน' ? rawType : '';
  
  let phrase = '';
  if (cleanTable) {
    if (cleanType) {
      phrase = `โต๊ะ ${cleanTable} เรียกค่ะ ${cleanType}`;
    } else {
      phrase = `โต๊ะ ${cleanTable} เรียกพนักงานค่ะ`;
    }
  } else {
    phrase = cleanType ? `ลูกค้าเรียกค่ะ ${cleanType}` : 'มีลูกค้าเรียกพนักงานค่ะ';
  }

  if (note && note.trim() && note.trim().length <= 30) {
    phrase += ` ${note.trim()}`;
  }

  speakThaiVoice(phrase, rate);
}




/**
 * Web Audio API Sound Synthesizer & Universal Thai Voice Notifier
 * Deep Audio Subsystem:
 * - Shared AudioContext singleton with auto-unlocking & state recovery
 * - Web Audio synth chimes (Order, Delivery, Success, Service Bell)
 * - Crisp online Google Thai TTS stream with Web Speech & chime fallback
 * - AudioNotifier facade providing unified dispatch for all POS & Kitchen alerts
 */

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playOrderChime() {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
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
    osc2.frequency.setValueAtTime(880.0, now + 0.15);
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
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
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
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
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
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    // Rapid fanfare: F5 -> A5 -> C6 -> F6
    const notes = [698.46, 880.0, 1046.5, 1396.91];
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

/**
 * Instant Tactile Button Feedback Synthesizer
 * Synthesizes a crisp, subtle mechanical click/tap with sub-millisecond latency using Web Audio API
 */
let lastTapTime = 0;
export function playButtonTapSound(variant: 'tap' | 'pop' | 'success' | 'delete' = 'tap') {
  if (typeof window === 'undefined') return;

  const nowMs = Date.now();
  if (nowMs - lastTapTime < 20) return; // Prevent audio distortion from rapid sub-20ms multi-touch
  lastTapTime = nowMs;

  const ctx = getSharedAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (variant === 'success') {
      // Crisp subtle positive micro-chime: 587Hz -> 880Hz (D5 -> A5), 50ms
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (variant === 'delete') {
      // Soft low tactile thud: 220Hz -> 90Hz, 30ms
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.035);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (variant === 'pop') {
      // Light bubbly pop: 920Hz -> 450Hz, 25ms
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.025);
      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else {
      // Default 'tap': Crisp, high-end mechanical tactile click: 750Hz -> 280Hz, 18ms
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.018);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {
    // Gracefully ignore audio interruptions
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

// Active HTML Audio element for high-quality online Thai speech
let activeTtsAudio: HTMLAudioElement | null = null;
let cachedThaiVoice: SpeechSynthesisVoice | null = null;

/**
 * Clean and simplify service call labels for natural, fluid spoken Thai
 */
export function cleanRequestTypeForSpeech(raw?: string): string {
  if (!raw) return '';
  let str = raw.trim();
  if (str === 'ทดสอบเสียง') return 'ทดสอบระบบเสียงเรียกพนักงานค่ะ';
  if (str === 'เรียกพนักงาน') return '';

  // Remove parenthesized content like (ชำระด้วยเงินสด)
  str = str.replace(/\([^)]*\)/g, '').trim();

  // Normalize known service call items into fluid spoken Thai
  if (str.includes('น้ำปลาพริก')) return 'ขอน้ำปลาพริก เครื่องปรุง';
  if (str.includes('น้ำแข็ง')) return 'ขอน้ำแข็ง น้ำดื่ม';
  if (str.includes('ช้อนส้อม')) return 'ขอช้อนส้อม จานแบ่ง';
  if (str.includes('ทิชชู่')) return 'ขอกระดาษทิชชู่';
  if (str.includes('เช็คบิล')) return 'เช็คบิลค่ะ';
  if (str.includes('สอบถาม')) return 'สอบถามพนักงานค่ะ';

  // Replace multiple slashes with simple space
  str = str.replace(/\s*\/\s*/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Search local/browser voices for a genuine Thai speech synthesis voice
 */
function findBestThaiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const thaiVoices = voices.filter((v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang === 'th-th' || lang.startsWith('th');
    });

    if (thaiVoices.length === 0) return null;

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
 * Preload and unlock audio context across browsers on first interaction
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    try {
      getSharedAudioContext();
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

if (typeof window !== 'undefined') {
  initAudioUnlock();
}

/**
 * Play high-quality native Thai speech streamed from TTS proxy (/api/tts)
 * Works universally on Windows, iOS, Android, macOS without requiring OS Thai voice packs.
 */
export function playThaiAudioStream(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const clean = text.trim();
  if (!clean) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      if (activeTtsAudio) {
        activeTtsAudio.pause();
        activeTtsAudio.currentTime = 0;
      }

      const encoded = encodeURIComponent(clean);
      const audioUrl = `/api/tts?text=${encoded}`;
      const audio = new Audio(audioUrl);
      activeTtsAudio = audio;

      let settled = false;
      const finish = (success: boolean) => {
        if (!settled) {
          settled = true;
          resolve(success);
        }
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);

      const timer = setTimeout(() => finish(false), 9000);
      audio.addEventListener('ended', () => clearTimeout(timer), { once: true });
      audio.addEventListener('error', () => clearTimeout(timer), { once: true });

      const p = audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('[TTS] playThaiAudioStream play() caught:', err);
          clearTimeout(timer);
          finish(false);
        });
      }
    } catch (err) {
      console.warn('[TTS] playThaiAudioStream error:', err);
      resolve(false);
    }
  });
}

/**
 * Fallback to Web Speech API if browser has genuine Thai voice installed
 */
export function speakViaWebSpeech(text: string, rate: number = 1.0): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  if (!text || !text.trim()) return false;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'th-TH';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voice = cachedThaiVoice || findBestThaiVoice();
    if (voice) {
      cachedThaiVoice = voice;
      utterance.voice = voice;
    } else {
      return false;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('[TTS] Web Speech synthesis error:', err);
    return false;
  }
}

/**
 * Universal Thai Voice Synthesizer
 * 1. Streams crisp, native Google Thai speech via /api/tts (works 100% on all OS/devices)
 * 2. Falls back to Web Speech API if offline or if Thai voice is present
 * 3. Falls back to service chime as guaranteed audible alert
 */
export function speakThaiVoice(text: string, rate: number = 1.0) {
  if (typeof window === 'undefined') return;
  if (!text || !text.trim()) return;
  const clean = text.trim();

  playThaiAudioStream(clean).then((played) => {
    if (!played) {
      const webSpeechPlayed = speakViaWebSpeech(clean, rate);
      if (!webSpeechPlayed) {
        console.warn('[TTS] Thai voice fallback to service chime');
        playServiceCallChime();
      }
    }
  });
}

/**
 * อ่านออกเสียงยอดเงินเข้าภาษาไทย เช่น "เงินเข้า 170 บาท โต๊ะ 2 ค่ะ"
 */
export function speakMoneyReceived(amount: number, tableName?: string) {
  const formattedAmount = formatThaiCurrencyForSpeech(amount);
  let target = '';
  if (tableName) {
    target = String(tableName).startsWith('โต๊ะ') ? ` ${tableName}` : ` โต๊ะ ${tableName}`;
  }
  speakThaiVoice(`เงินเข้า ${formattedAmount}${target} ค่ะ`.replace(/\s+/g, ' ').trim());
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
  speakThaiVoice(`เงินเข้า ${formattedAmount}${target} ค่ะ`.replace(/\s+/g, ' ').trim());
}

/**
 * อ่านออกเสียงเมื่อลูกค้ากดแจ้งโอนเงินผ่านหน้าเว็บ (รอแคชเชียร์ตรวจเช็ค)
 */
export function speakCustomerNotifyTransfer(tableNo: number | string, amount: number) {
  const cleanTable = String(tableNo || '').replace(/^โต๊ะ\s*/, '').trim();
  const amountPart = formatThaiCurrencyForSpeech(amount);
  const target = cleanTable ? ` โต๊ะ ${cleanTable}` : '';
  speakThaiVoice(`เงินเข้า ${amountPart}${target} ค่ะ`.replace(/\s+/g, ' ').trim());
}

/**
 * อ่านออกเสียงเมื่อระบบสแกนอ่านสลิปสำเร็จ (โหมดรอแคชเชียร์กดยืนยันปิดบิล)
 */
export function speakSlipReadSuccess(amount: number, tableName?: string) {
  const formattedAmount = formatThaiCurrencyForSpeech(amount);
  let target = '';
  if (tableName) {
    target = String(tableName).startsWith('โต๊ะ') ? ` ${tableName}` : ` โต๊ะ ${tableName}`;
  }
  speakThaiVoice(`อ่านสลิปถูกต้อง ได้รับเงิน ${formattedAmount}${target} ค่ะ กรุณากดยืนยันปิดบิลค่ะ`.replace(/\s+/g, ' ').trim());
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
  const target = cleanTable ? ` โต๊ะ ${cleanTable}` : '';
  if (amount) {
    const amountPart = formatThaiCurrencyForSpeech(amount);
    speakThaiVoice(`เงินเข้า ${amountPart}${target} ค่ะ`.replace(/\s+/g, ' ').trim());
  } else {
    speakThaiVoice(`ตรวจสอบสลิป${target} ค่ะ`.replace(/\s+/g, ' ').trim());
  }
}

/**
 * แจ้งเตือนลูกค้ากดเรียกพนักงานที่โต๊ะอาหาร
 */
export function speakServiceCall(
  tableNo?: number | string,
  requestType?: string,
  note?: string,
  rate: number = 1.15
) {
  const cleanTable = tableNo ? String(tableNo).replace(/^โต๊ะ\s*/, '').trim() : '';
  const cleanType = cleanRequestTypeForSpeech(requestType);

  let phrase = '';
  if (cleanTable) {
    if (cleanType.includes('ทดสอบ')) {
      phrase = `โต๊ะ ${cleanTable} ${cleanType}`;
    } else if (cleanType) {
      phrase = `โต๊ะ ${cleanTable} เรียกค่ะ ${cleanType}`;
    } else {
      phrase = `โต๊ะ ${cleanTable} เรียกพนักงานค่ะ`;
    }
  } else {
    phrase = cleanType ? `ลูกค้าเรียกค่ะ ${cleanType}` : 'มีลูกค้าเรียกพนักงานค่ะ';
  }

  if (note && note.trim() && note.trim().length <= 30) {
    if (!note.includes('฿') && !note.includes('ยอดรวม')) {
      const cleanNote = note.trim().replace(/\s*\/\s*/g, ' ');
      phrase += ` ${cleanNote}`;
    }
  }

  speakThaiVoice(phrase, rate);
}

export type AudioNotificationEvent =
  | { type: 'ORDER_CREATED'; isDelivery?: boolean }
  | { type: 'ORDER_SUCCESS' }
  | { type: 'DELIVERY_ORDER' }
  | { type: 'PAYMENT_RECEIVED'; amount: number; tableName?: string }
  | { type: 'SLIP_VERIFIED'; amount: number; tableName?: string }
  | { type: 'CUSTOMER_TRANSFER_NOTIFIED'; tableNo: number | string; amount: number }
  | { type: 'SLIP_READ_SUCCESS'; amount: number; tableName?: string }
  | { type: 'SLIP_DUPLICATE' }
  | { type: 'SLIP_MISMATCH'; slipAmount?: number; expectedAmount?: number }
  | { type: 'SLIP_RECEIVER_MISMATCH' }
  | { type: 'SLIP_NO_QR' }
  | { type: 'SLIP_SUBMITTED'; tableNo?: number | string; amount?: number }
  | { type: 'SERVICE_CALL'; tableNo?: number | string; requestType?: string; note?: string; rate?: number };

/**
 * Deep Audio Subsystem Facade
 * Provides a clean, single-point dispatch for all sound notifications across POS, Kitchen, and Tables.
 */
export class AudioNotifier {
  private static _muted: boolean = false;

  static setMuted(muted: boolean) {
    this._muted = muted;
  }

  static isMuted(): boolean {
    return this._muted;
  }

  static notify(event: AudioNotificationEvent): void {
    if (this._muted) return;

    switch (event.type) {
      case 'ORDER_CREATED':
        if (event.isDelivery) {
          playDeliveryChime();
        } else {
          playOrderChime();
        }
        break;
      case 'ORDER_SUCCESS':
        playSuccessChime();
        break;
      case 'DELIVERY_ORDER':
        playDeliveryChime();
        break;
      case 'PAYMENT_RECEIVED':
        playSuccessChime();
        speakMoneyReceived(event.amount, event.tableName);
        break;
      case 'SLIP_VERIFIED':
        playSuccessChime();
        speakSlipVerified(event.amount, event.tableName);
        break;
      case 'CUSTOMER_TRANSFER_NOTIFIED':
        playServiceCallChime();
        speakCustomerNotifyTransfer(event.tableNo, event.amount);
        break;
      case 'SLIP_READ_SUCCESS':
        speakSlipReadSuccess(event.amount, event.tableName);
        break;
      case 'SLIP_DUPLICATE':
        speakSlipDuplicate();
        break;
      case 'SLIP_MISMATCH':
        speakSlipAmountMismatch(event.slipAmount, event.expectedAmount);
        break;
      case 'SLIP_RECEIVER_MISMATCH':
        speakSlipReceiverMismatch();
        break;
      case 'SLIP_NO_QR':
        speakSlipNoQr();
        break;
      case 'SLIP_SUBMITTED':
        playOrderChime();
        speakSlipSubmitted(event.tableNo, event.amount);
        break;
      case 'SERVICE_CALL':
        playServiceCallChime();
        speakServiceCall(event.tableNo, event.requestType, event.note, event.rate ?? 1.15);
        break;
    }
  }

  static unlock(): void {
    initAudioUnlock();
  }
}

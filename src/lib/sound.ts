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

let cachedThaiVoice: SpeechSynthesisVoice | null = null;

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      cachedThaiVoice =
        voices.find(
          (v) =>
            v.lang === 'th-TH' ||
            v.lang.toLowerCase().replace('_', '-').startsWith('th')
        ) || null;
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
export function speakThaiVoice(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    // ยกเลิกเสียงที่กำลังพูดค้างอยู่ก่อนหน้า
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0; // ความเร็วมาตรฐานชัดเจน
    utterance.pitch = 1.0;

    if (cachedThaiVoice) {
      utterance.voice = cachedThaiVoice;
    } else {
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(
        (v) =>
          v.lang === 'th-TH' ||
          v.lang.toLowerCase().replace('_', '-').startsWith('th')
      );
      if (thaiVoice) {
        cachedThaiVoice = thaiVoice;
        utterance.voice = thaiVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * อ่านออกเสียงยอดเงินเข้าภาษาไทย เช่น "ได้รับเงินเข้า 150 บาท โต๊ะ 3 เรียบร้อยค่ะ"
 * อ่านเฉพาะยอดเงินเข้า ไม่มียอดคงเหลือปะปน
 */
export function speakMoneyReceived(amount: number, tableName?: string) {
  const num = Number(amount);
  const formattedAmount = isNaN(num) ? amount : num % 1 === 0 ? num : num.toFixed(2);
  const target = tableName ? ` ${tableName}` : '';
  speakThaiVoice(`ได้รับเงินเข้า ${formattedAmount} บาท${target} เรียบร้อยค่ะ`);
}



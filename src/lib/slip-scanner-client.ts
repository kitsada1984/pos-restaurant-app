'use client';

import jsQR from 'jsqr';

export interface ScanResult {
  qrText: string | null;
  compressedBase64: string;
  width: number;
  height: number;
  error?: string;
}

/**
 * ฟังก์ชันอ่าน Mini-QR จากไฟล์รูปภาพสลิปบน Client (Browser)
 * พร้อมบีบอัดภาพให้อยู่ในขนาดที่เหมาะสมสำหรับส่ง API และบันทึกประหยัดพื้นที่
 */
export async function scanSlipQrClient(file: File | Blob): Promise<ScanResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // คำนวณขนาดภาพให้อยู่ในช่วงที่อ่าน QR แม่นยำแต่ประหยัดขนาด (ไม่เกิน 1200px)
          const MAX_DIM = 1200;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            resolve({
              qrText: null,
              compressedBase64: '',
              width: w,
              height: h,
              error: 'ไม่สามารถสร้าง canvas context ได้',
            });
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);

          // ดึงพิกเซลข้อมูลรูปภาพเพื่อถอดรหัส QR
          const imageData = ctx.getImageData(0, 0, w, h);
          let qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          // ถ้าสแกนแบบเต็มรูปไม่พบ ลองสแกนโซนครึ่งล่างหรือครึ่งบนที่มักเป็นที่อยู่ของ Mini-QR ในสลิปธนาคาร
          if (!qrCode && h > 400) {
            // โซนครึ่งล่าง (สลิปส่วนใหญ่อยู่ล่างขวาหรือล่างกลาง)
            const lowerH = Math.round(h * 0.6);
            const lowerY = Math.round(h * 0.4);
            const lowerData = ctx.getImageData(0, lowerY, w, lowerH);
            qrCode = jsQR(lowerData.data, lowerData.width, lowerData.height, {
              inversionAttempts: 'attemptBoth',
            });
          }

          // บีบอัดรูปภาพเป็น JPEG คุณภาพ 0.72 เพื่อประหยัดพื้นที่
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);

          resolve({
            qrText: qrCode ? qrCode.data : null,
            compressedBase64,
            width: w,
            height: h,
          });
        } catch (err: any) {
          resolve({
            qrText: null,
            compressedBase64: '',
            width: 0,
            height: 0,
            error: err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ',
          });
        }
      };

      img.onerror = () => {
        resolve({
          qrText: null,
          compressedBase64: '',
          width: 0,
          height: 0,
          error: 'ไม่สามารถโหลดรูปภาพได้',
        });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        qrText: null,
        compressedBase64: '',
        width: 0,
        height: 0,
        error: 'เกิดข้อผิดพลาดในการอ่านไฟล์',
      });
    };

    reader.readAsDataURL(file);
  });
}

import fs from 'fs';
import path from 'path';

export interface SaveSlipOptions {
  slug: string;
  orderId?: string;
  tableNo?: number | string;
  folderId?: string | null;
  webhookUrl?: string | null;
}

export interface UploadResult {
  url: string;
  provider: 'GOOGLE_DRIVE' | 'LOCAL_DISK';
  fileId?: string;
  fileName: string;
  message?: string;
}

import { GOOGLE_APPS_SCRIPT_TEMPLATE } from './google-drive-template';
export { GOOGLE_APPS_SCRIPT_TEMPLATE };


/**
 * บันทึกรูปสลิปโอนเงินเข้า Google Drive (หรือบันทึกลงโฟลเดอร์เครื่องเซิร์ฟเวอร์สำรอง)
 * ป้องกันปัญหารูป Base64 เข้าไปฝังในฐานข้อมูล Supabase ทำให้ฐานข้อมูลบวม
 */
export async function saveSlipImage(
  base64OrUrl: string,
  options: SaveSlipOptions
): Promise<string> {
  if (!base64OrUrl || typeof base64OrUrl !== 'string') {
    return '';
  }

  const trimmed = base64OrUrl.trim();

  // ถ้าเป็น URL อยู่แล้ว (เช่น ลิงก์ Google Drive หรือ /uploads/ อยู่แล้ว) ให้ใช้ค่าเดิมได้ทันที
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/')
  ) {
    return trimmed;
  }

  // สกัดข้อมูล Base64 และ Mime Type
  let mimeType = 'image/jpeg';
  let cleanBase64 = trimmed;

  if (trimmed.startsWith('data:')) {
    const mimeMatch = trimmed.match(/^data:([^;]+);base64,/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
    const parts = trimmed.split('base64,');
    if (parts.length > 1) {
      cleanBase64 = parts[1];
    }
  }

  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
    ? 'webp'
    : 'jpg';

  const timestamp = Date.now();
  const safeSlug = (options.slug || 'store').replace(/[^a-zA-Z0-9_-]/g, '');
  const tablePart = options.tableNo ? `_table${options.tableNo}` : '';
  const fileName = `slip_${safeSlug}${tablePart}_${timestamp}.${ext}`;

  const webhookUrl =
    options.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || null;
  const folderId =
    options.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || null;

  // -------------------------------------------------------------
  // วิธีที่ 1: อัปโหลดตรงเข้า Google Drive ผ่าน Apps Script Webhook
  // -------------------------------------------------------------
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: cleanBase64,
          mimeType,
          fileName,
          folderId,
          slug: options.slug,
          orderId: options.orderId,
          tableNo: options.tableNo,
        }),
      });

      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result && result.success && (result.directUrl || result.viewUrl)) {
          return result.directUrl || result.viewUrl;
        }
        if (result && result.fileId) {
          return `https://lh3.googleusercontent.com/d/${result.fileId}`;
        }
      }
      console.warn('Google Drive Webhook did not return valid URL, falling back to local storage.');
    } catch (gdriveErr) {
      console.warn('Error uploading slip to Google Drive Webhook:', gdriveErr);
    }
  }

  // -------------------------------------------------------------
  // วิธีที่ 2 (สำรองปลอดภัย 100%): บันทึกลงโฟลเดอร์เครื่องเซิร์ฟเวอร์
  // โฟลเดอร์: public/uploads/slips/
  // ไม่บันทึก Base64 ลง Supabase เด็ดขาด!
  // -------------------------------------------------------------
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'slips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    return `/uploads/slips/${fileName}`;
  } catch (fsErr) {
    console.error('Error saving slip to local disk storage:', fsErr);
    return '';
  }
}

/**
 * ฟังก์ชันสำหรับทดสอบการส่งข้อมูลไปยัง Google Drive Webhook
 */
export async function testGoogleDriveWebhook(
  webhookUrl: string,
  folderId?: string | null
): Promise<{ success: boolean; message: string; data?: any }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'กรุณาระบุ URL ของ Google Apps Script ให้ถูกต้อง' };
  }

  try {
    const sampleBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: sampleBase64,
        mimeType: 'image/gif',
        fileName: `test_connection_${Date.now()}.gif`,
        folderId: folderId || undefined,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return {
        success: true,
        message: 'เชื่อมต่อ Google Drive สำเร็จ! ไฟล์ทดสอบถูกบันทึกลงไดรฟ์เรียบร้อย',
        data,
      };
    } else {
      return {
        success: false,
        message: data?.error || 'เซิร์ฟเวอร์ Google Drive ปฏิเสธการบันทึก กรุณาตรวจสอบ Folder ID และสิทธิ์การเข้าถึง',
        data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || 'ไม่สามารถติดต่อ Webhook ได้'}`,
    };
  }
}

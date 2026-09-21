/**
 * ORDEO POS - Virtual Print Proxy Companion (Print Bridge)
 * =========================================================
 * โปรแกรมตัวกลางจำลองเครื่องพิมพ์เสมือน (Virtual Network / Bluetooth Printer)
 * รับคำสั่งพิมพ์ ESC/POS จาก Wongnai Merchant App, GrabMerchant หรือ Shopee Partner
 * ถอดรหัสข้อความออเดอร์ ยิงส่งเข้า Webhook ของ POS และส่งต่อให้พิมพ์กระดาษจริง (Pass-through)
 *
 * วิธีใช้งาน:
 * 1. กำหนดค่าตัวแปร POS_STORE_SLUG และ POS_WEBHOOK_URL
 * 2. รันสคริปต์: node scripts/print-proxy-companion.js
 * 3. ในแอป Wongnai/Grab: ไปที่ตั้งค่าเครื่องพิมพ์ > เพิ่มเครื่องพิมพ์ Network/LAN > ใส่ IP เครื่องนี้ Port 9100
 */

const net = require('net');
const http = require('http');
const https = require('https');

// --- ตั้งค่าระบบ (Configuration) ---
const CONFIG = {
  // พอร์ตที่จำลองเป็นเครื่องพิมพ์ Network (Port 9100 คือพอร์ตมาตรฐาน ESC/POS)
  LISTEN_PORT: process.env.PROXY_PORT || 9100,

  // ที่อยู่ Webhook ของร้านเรา
  POS_SERVER_URL: process.env.POS_SERVER_URL || 'https://pos-restaurant-app-psi.vercel.app',
  POS_STORE_SLUG: process.env.POS_STORE_SLUG || 'lung-pa',
  PROXY_SECRET_KEY: process.env.PROXY_SECRET_KEY || '',

  // ส่งต่อให้เครื่องพิมพ์จริงในครัว (Pass-through to Physical Printer)
  FORWARD_TO_REAL_PRINTER: process.env.FORWARD_PRINT === 'true' || false,
  REAL_PRINTER_IP: process.env.REAL_PRINTER_IP || '192.168.1.200',
  REAL_PRINTER_PORT: process.env.REAL_PRINTER_PORT || 9100,
};

/**
 * แปลง Byte Stream ESC/POS เป็นข้อความ UTF-8 / TIS-620
 */
function decodeEscPosBuffer(buffer) {
  // ลบ ESC/POS command control codes (เช่น ESC @, GS V, LF, CR)
  // รักษาข้อความตัวอักษรภาษาไทยและอังกฤษ
  let text = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    // ข้ามคำสั่งควบคุม ESC (0x1B) และ GS (0x1D)
    if (byte === 0x1b || byte === 0x1d) {
      i++; // ข้าม parameter ถัดไป
      continue;
    }

    // รองรับ ASCII และรหัสภาษาไทย TIS-620 (0xA1 - 0xFB)
    if (byte >= 0xa1 && byte <= 0xfb) {
      // TIS-620 to Unicode offset: 0x0E00 - 0xA0 = 0x0E00 + (byte - 0xA0)
      text += String.fromCharCode(0x0e00 + byte - 0xa0);
    } else if (byte === 0x0a || byte === 0x0d) {
      text += '\n';
    } else if (byte >= 0x20 && byte <= 0x7e) {
      text += String.fromCharCode(byte);
    }
  }

  return text.trim();
}

/**
 * ส่งข้อความสลิปเข้าสู่ POS Webhook
 */
function sendToPosWebhook(rawText) {
  const targetUrl = new URL(
    `/api/r/${CONFIG.POS_STORE_SLUG}/webhooks/delivery/print-proxy`,
    CONFIG.POS_SERVER_URL
  );

  const payload = JSON.stringify({
    rawText: rawText,
    timestamp: Date.now(),
    source: 'virtual_print_proxy',
  });

  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const req = client.request(
    targetUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(CONFIG.PROXY_SECRET_KEY ? { 'x-proxy-signature': CONFIG.PROXY_SECRET_KEY } : {}),
      },
    },
    (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[POS Webhook] ✅ ออเดอร์ส่งเข้า POS สำเร็จ! (HTTP ${res.statusCode})`);
          try {
            const data = JSON.parse(responseBody);
            console.log(`  └─ ออเดอร์ ID: ${data.deliveryOrderId || data.orderId} | สถานะ: ${data.status}`);
          } catch (e) {}
        } else {
          console.error(`[POS Webhook] ❌ เกิดข้อผิดพลาด HTTP ${res.statusCode}: ${responseBody}`);
        }
      });
    }
  );

  req.on('error', (err) => {
    console.error(`[POS Webhook] ❌ ไม่สามารถเชื่อมต่อไปยัง POS ได้:`, err.message);
  });

  req.write(payload);
  req.end();
}

/**
 * ส่งต่อไบต์พิมพ์ไปยังเครื่องพิมพ์กระดาษจริงในครัว (Pass-through)
 */
function forwardToRealPrinter(rawBuffer) {
  if (!CONFIG.FORWARD_TO_REAL_PRINTER) return;

  const client = new net.Socket();
  client.connect(CONFIG.REAL_PRINTER_PORT, CONFIG.REAL_PRINTER_IP, () => {
    client.write(rawBuffer);
    client.end();
    console.log(`[Printer Forward] 🖨️ ส่งต่อคำสั่งพิมพ์ไปยังเครื่องพิมพ์จริง (${CONFIG.REAL_PRINTER_IP}) เรียบร้อย`);
  });

  client.on('error', (err) => {
    console.warn(`[Printer Forward] ⚠️ ไม่สามารถส่งต่อให้เครื่องพิมพ์จริงได้:`, err.message);
  });
}

// --- สร้าง Server จำลองเครื่องพิมพ์เสมือน ---
const server = net.createServer((socket) => {
  console.log(`\n[Virtual Printer] ⚡ มีคำสั่งพิมพ์เข้ามาจาก: ${socket.remoteAddress}`);

  const chunks = [];

  socket.on('data', (chunk) => {
    chunks.push(chunk);
  });

  socket.on('end', () => {
    const rawBuffer = Buffer.concat(chunks);
    console.log(`[Virtual Printer] 📥 ได้รับข้อมูลการพิมพ์ทั้งหมด ${rawBuffer.length} bytes`);

    // 1. ถอดรหัสข้อความจาก Buffer
    const decodedText = decodeEscPosBuffer(rawBuffer);
    console.log('--- ตัวอย่างข้อความในสลิปที่ถอดรหัสได้ ---');
    console.log(decodedText.slice(0, 300) + '...\n---------------------------------------');

    // 2. ยิงส่งเข้า POS Webhook
    sendToPosWebhook(decodedText);

    // 3. ส่งต่อไปยังเครื่องพิมพ์จริง (Pass-through)
    forwardToRealPrinter(rawBuffer);
  });
});

server.listen(CONFIG.LISTEN_PORT, () => {
  console.log('=====================================================');
  console.log('🚀 ORDEO POS - Virtual Print Proxy Companion เริ่มทำงานแล้ว');
  console.log(`   พอร์ตเครื่องพิมพ์เสมือน: 0.0.0.0:${CONFIG.LISTEN_PORT}`);
  console.log(`   ร้านค้าเป้าหมาย: ${CONFIG.POS_STORE_SLUG}`);
  console.log(`   ปลายทาง POS Webhook: ${CONFIG.POS_SERVER_URL}`);
  console.log('=====================================================');
  console.log('💡 ในแอป Grab / Wongnai: เพิ่มเครื่องพิมพ์ Network IP ระบุ IP เครื่องนี้ Port 9100');
});

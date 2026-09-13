/**
 * ฟังก์ชันสร้างโค้ด Google Apps Script สำหรับดักจับอีเมลแจ้งเตือนเงินเข้าของธนาคารใน Gmail
 * ส่งยอดเงินเข้า Webhook ของ POS อัตโนมัติ (Cloud-to-Cloud 24 ชม. ไม่ต้องเปิดมือถือทิ้งไว้)
 */
export function getBankEmailAppsScript(webhookUrlWithKey: string): string {
  return `// ============================================================================
// 🍳 POS Restaurant - Google Apps Script: ดักจับอีเมลแจ้งเตือนเงินเข้าธนาคาร (Gmail)
// ทำงานบน Google Cloud อัตโนมัติ 24 ชม. ตรวจสอบอีเมลทุก 1 นาที ไม่ต้องใช้ MacroDroid
// ============================================================================

// Webhook URL ประจำร้านของคุณ (พร้อม Secret Key)
var POS_WEBHOOK_URL = "${webhookUrlWithKey}";

/**
 * ฟังก์ชันหลัก: ค้นหาอีเมลแจ้งเตือนเงินเข้าที่ยังไม่ได้อ่าน แล้วส่งเข้า POS
 */
function checkBankEmails() {
  try {
    // คำค้นหาครอบคลุมทุกธนาคารในไทย (กสิกร KBank, ไทยพาณิชย์ SCB, กรุงไทย KTB, กรุงเทพ BBL, ttb, ออมสิน)
    var query = 'is:unread label:inbox (from:(kasikornbank.com OR scb.co.th OR krungthai.com OR bangkokbank.com OR ttbbank.com OR gsb.or.th) OR subject:(เงินเข้า OR รับเงิน OR รับโอน OR เงินโอนเข้า OR deposit OR "K-eMail" OR "K-eMail Alert" OR "SCB Alert" OR "Krungthai"))';
    
    var threads = GmailApp.search(query, 0, 10);
    if (!threads || threads.length === 0) {
      return;
    }

    var processedLabel = getOrCreateLabel('POS-Processed');

    for (var i = 0; i < threads.length; i++) {
      var thread = threads[i];
      var messages = thread.getMessages();

      for (var j = 0; j < messages.length; j++) {
        var msg = messages[j];
        if (!msg.isUnread()) continue;

        var from = msg.getFrom();
        var subject = msg.getSubject();
        var body = msg.getPlainBody() || '';

        // เตรียมข้อมูลส่งไปยัง Webhook ของ POS
        var payload = {
          sender: from,
          title: subject,
          text: subject + "\\n" + body
        };

        var options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };

        var response = UrlFetchApp.fetch(POS_WEBHOOK_URL, options);
        var statusCode = response.getResponseCode();

        // เมื่อส่งสำเร็จ (200 หรือ 400 ที่มีคำตอบ) ให้มาร์กอ่านแล้วและติดป้ายกำกับ
        if (statusCode >= 200 && statusCode < 300) {
          msg.markRead();
          thread.addLabel(processedLabel);
          Logger.log('ส่งเข้า POS สำเร็จ: ' + subject);
        } else {
          Logger.log('Webhook ส่งกลับรหัส: ' + statusCode + ' - ' + response.getContentText());
        }
      }
    }
  } catch (err) {
    Logger.log('Error in checkBankEmails: ' + err.toString());
  }
}

/**
 * ฟังก์ชันสร้างตัวนับเวลา (Trigger) ให้ทำงานอัตโนมัติทุก 1 นาที (กดรันฟังก์ชันนี้เพียงครั้งเดียว)
 */
function installTrigger() {
  // ลบ Trigger เดิมออกเพื่อไม่ให้ซ้ำซ้อน
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkBankEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // สร้าง Trigger ใหม่ให้เช็คอีเมลทุก 1 นาที
  ScriptApp.newTrigger('checkBankEmails')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ ตั้งค่าตรวจสอบอีเมลทุก 1 นาทีเรียบร้อยแล้ว!');
}

/**
 * ฟังก์ชันทดสอบส่งข้อความจำลองเข้า POS ทันที
 */
function testWebhookConnection() {
  var mockPayload = {
    sender: 'K-eMail Alert (kasikornbank.com)',
    title: 'K-eMail Alert: แจ้งเงินเข้าบัญชี x-9999',
    text: 'ธนาคารกสิกรไทย เงินเข้าบัญชี x-9999 จำนวน 150.00 บาท เมื่อ ' + new Date().toLocaleTimeString('th-TH') + ' ยอดเงินคงเหลือ 12,500.00 บาท'
  };

  var response = UrlFetchApp.fetch(POS_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(mockPayload),
    muteHttpExceptions: true
  });

  Logger.log('ผลการทดสอบ: ' + response.getContentText());
}

/**
 * ฟังก์ชันช่วยค้นหาหรือสร้าง Label ป้ายกำกับใน Gmail
 */
function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}
`;
}

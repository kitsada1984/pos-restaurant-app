/**
 * Google Apps Script Webhook Template
 * ใช้สำหรับคัดลอกไปวางใน Google Apps Script (script.google.com) เพื่อรับรูปสลิปจาก POS
 * ไปบันทึกลงใน Google Drive ส่วนตัวของร้านค้า
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// === โค้ด Google Apps Script สำหรับรับรูปสลิปจาก POS ไปเก็บใน Google Drive ===
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId || 'ใส่_FOLDER_ID_ของ_GOOGLE_DRIVE_ที่นี่';
    var folder = DriveApp.getFolderById(folderId);
    
    var base64Data = data.base64;
    if (base64Data.indexOf('base64,') !== -1) {
      base64Data = base64Data.split('base64,')[1];
    }
    
    var decoded = Utilities.base64Decode(base64Data);
    var mimeType = data.mimeType || 'image/jpeg';
    var fileName = data.fileName || ('slip_' + new Date().getTime() + '.jpg');
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    // สร้างไฟล์ใน Google Drive
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var viewUrl = file.getUrl();
    var directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: fileId,
      viewUrl: viewUrl,
      directUrl: directUrl
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

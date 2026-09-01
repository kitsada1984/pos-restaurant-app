const bcrypt = require('bcryptjs');
const fs = require('fs');

async function gen() {
  const adminHash = await bcrypt.hash('adminpassword123', 10);
  const ownerHash = await bcrypt.hash('password123', 10);

  const sql = `
-- 1. Seed Plans
INSERT INTO "Plan" ("id", "name", "price", "durationDays", "maxTables", "description", "isActive", "sortOrder", "updatedAt")
VALUES 
  ('plan-trial', 'ทดลองใช้ฟรี (Trial 14 วัน)', 0, 14, 10, 'สำหรับร้านค้าใหม่ ทดลองใช้งานฟรีทุกฟังก์ชัน 14 วันเต็ม', true, 0, NOW()),
  ('plan-basic', 'Basic รายเดือน (1 เดือน)', 290, 30, 15, 'เหมาะสำหรับร้านขนาดเล็ก-กลาง สูงสุด 15 โต๊ะ', true, 1, NOW()),
  ('plan-pro', 'Pro คุ้มค่า (6 เดือน)', 1590, 180, 30, 'เหมาะสำหรับร้านอาหารยอดนิยม สูงสุด 30 โต๊ะ (ประหยัด 150 บาท)', true, 2, NOW()),
  ('plan-unlimited', 'Unlimited สุดคุ้ม (1 ปี)', 2900, 365, 999, 'ไม่จำกัดจำนวนโต๊ะ อัปเดตฟังก์ชันใหม่ฟรีก่อนใคร (ประหยัด 580 บาท)', true, 3, NOW())
ON CONFLICT ("id") DO NOTHING;

-- 2. Seed Super Admin User
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "updatedAt")
VALUES ('usr-superadmin', 'admin@ordeopos.com', '${adminHash}', 'Super Administrator', 'SUPER_ADMIN', NOW())
ON CONFLICT ("email") DO NOTHING;

-- 3. Seed Platform Setting
INSERT INTO "PlatformSetting" ("id", "platformName", "bankName", "bankAccountNo", "bankAccountName", "promptPayId", "contactLine", "contactPhone", "updatedAt")
VALUES ('default', 'ORDEO SaaS POS Platform', 'ธนาคารกสิกรไทย (KBANK)', '123-4-56789-0', 'บจก. ออร์เดียโอ โซลูชั่นส์', '0812345678', '@ordeopos', '081-234-5678', NOW())
ON CONFLICT ("id") DO UPDATE SET "platformName" = EXCLUDED."platformName";

-- 4. Seed Demo Store 'lung-pa'
INSERT INTO "Store" ("id", "slug", "name", "description", "status", "trialEndsAt", "subscriptionEnd", "planId", "promptPayId", "promptPayName", "phone", "address", "receiptFooter", "tableCount", "updatedAt")
VALUES ('store-lung-pa', 'lung-pa', 'ร้านอาหารตามสั่ง ลุง-ป้า (สาขาหลัก)', 'อาหารตามสั่งรสเด็ด กะเพราโบราณ ข้าวผัด ต้มยำ', 'ACTIVE', NOW() + INTERVAL '30 day', NOW() + INTERVAL '180 day', 'plan-pro', '0891234567', 'นายสมชาย พัฒนาสุข (ร้านตามสั่ง)', '089-123-4567', '88/9 หมู่ 3 ถนนสุขุมวิท ต.เสม็ด อ.เมือง จ.ชลบุรี', 'ขอบคุณที่มาอุดหนุนครับ 🙏 โอกาสหน้าเชิญใหม่ครับ', 10, NOW())
ON CONFLICT ("slug") DO NOTHING;

-- 5. Seed Store Owner User
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "storeId", "phone", "updatedAt")
VALUES ('usr-owner-lungpa', 'owner@lungpa.com', '${ownerHash}', 'ลุงสมชาย ใจดี', 'STORE_OWNER', 'store-lung-pa', '089-123-4567', NOW())
ON CONFLICT ("email") DO NOTHING;

-- 6. Seed Tables 1-10 for 'lung-pa'
INSERT INTO "Table" ("id", "storeId", "tableNo", "name", "status", "updatedAt")
VALUES 
  ('tbl-1', 'store-lung-pa', 1, 'โต๊ะ 1', 'AVAILABLE', NOW()),
  ('tbl-2', 'store-lung-pa', 2, 'โต๊ะ 2', 'AVAILABLE', NOW()),
  ('tbl-3', 'store-lung-pa', 3, 'โต๊ะ 3', 'AVAILABLE', NOW()),
  ('tbl-4', 'store-lung-pa', 4, 'โต๊ะ 4', 'AVAILABLE', NOW()),
  ('tbl-5', 'store-lung-pa', 5, 'โต๊ะ 5', 'AVAILABLE', NOW()),
  ('tbl-6', 'store-lung-pa', 6, 'โต๊ะ 6', 'AVAILABLE', NOW()),
  ('tbl-7', 'store-lung-pa', 7, 'โต๊ะ 7', 'AVAILABLE', NOW()),
  ('tbl-8', 'store-lung-pa', 8, 'โต๊ะ 8', 'AVAILABLE', NOW()),
  ('tbl-9', 'store-lung-pa', 9, 'โต๊ะ 9', 'AVAILABLE', NOW()),
  ('tbl-10', 'store-lung-pa', 10, 'โต๊ะ 10', 'AVAILABLE', NOW())
ON CONFLICT ("storeId", "tableNo") DO NOTHING;

-- 7. Seed Categories
INSERT INTO "Category" ("id", "storeId", "name", "sortOrder")
VALUES 
  ('cat-1', 'store-lung-pa', 'เมนูกะเพรา (Signature)', 1),
  ('cat-2', 'store-lung-pa', 'เมนูข้าวผัด & ทอดกระเทียม', 2),
  ('cat-3', 'store-lung-pa', 'เมนูต้ม & ยำ', 3),
  ('cat-4', 'store-lung-pa', 'เครื่องดื่ม & ของหวาน', 4)
ON CONFLICT ("id") DO NOTHING;

-- 8. Seed Menu Items
INSERT INTO "MenuItem" ("id", "storeId", "categoryId", "name", "description", "basePrice", "imageUrl", "isAvailable", "sortOrder")
VALUES 
  ('item-1', 'store-lung-pa', 'cat-1', 'ข้าวกะเพราถาดโบราณ (รสเด็ด)', 'กะเพราพริกแห้งสูตรโบราณ รสเข้มข้น จัดจ้าน เสิร์ฟพร้อมข้าวสวยร้อนๆ', 60, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80', true, 1),
  ('item-2', 'store-lung-pa', 'cat-2', 'ข้าวผัดรถไฟโบราณ ซีอิ๊วดำ', 'ข้าวผัดกลิ่นกระทะหอมกรุ่น ใส่คะน้า มะเขือเทศ หอมใหญ่ และซีอิ๊วดำ', 55, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80', true, 2),
  ('item-3', 'store-lung-pa', 'cat-2', 'ข้าวผัดคะน้าหมูกรอบ', 'คะน้าฮ่องกงยอดอ่อน ผัดไฟแรงกับหมูกรอบแท้ หนังฟูกรอบสะท้านลิ้น', 70, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', true, 3),
  ('item-4', 'store-lung-pa', 'cat-3', 'ต้มยำกุ้งน้ำข้น (หม้อไฟ/ชาม)', 'ต้มยำกุ้งแม่น้ำตัวโต สมุนไพรไทยข่า ตะไคร้ ใบมะกรูด น้ำพริกเผาเข้มข้น', 120, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?auto=format&fit=crop&w=600&q=80', true, 4),
  ('item-5', 'store-lung-pa', 'cat-4', 'ชาไทยโบราณ (ชาตรามือ)', 'ชาไทยแท้ หอม เข้ม มัน หวานกลมกล่อมสูตรโบราณ', 30, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80', true, 5)
ON CONFLICT ("id") DO NOTHING;
`;

  fs.writeFileSync('prisma/seed-supabase.sql', sql);
  console.log('Generated prisma/seed-supabase.sql successfully');
}
gen();

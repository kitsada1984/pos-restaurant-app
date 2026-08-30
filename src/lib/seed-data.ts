import prisma from './prisma';

export async function ensureDatabaseSeeded() {
  try {
    const tableCount = await prisma.table.count();
    if (tableCount === 0) {
      console.log('--- Auto-seeding 10 Tables ---');
      for (let i = 1; i <= 10; i++) {
        await prisma.table.create({
          data: {
            id: i,
            name: `โต๊ะ ${i}`,
            status: 'AVAILABLE',
          },
        });
      }
    }

    const settingCount = await prisma.storeSetting.count();
    if (settingCount === 0) {
      console.log('--- Auto-seeding Store Settings ---');
      await prisma.storeSetting.create({
        data: {
          storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง',
          promptPayId: '0812345678',
          promptPayName: 'สมใจ ขายดี',
          phone: '081-234-5678',
          address: '123/4 ตลาดสดพัฒนาการ ถ.สุขุมวิท',
          tableCount: 10,
          receiptFooter: 'ขอบคุณที่มาอุดหนุนครับ / Thank you!',
        },
      });
    }

    const catCount = await prisma.category.count();
    if (catCount === 0) {
      console.log('--- Auto-seeding Menu Categories & Items ---');
      const catKaprao = await prisma.category.create({
        data: { name: 'เมนูกะเพรา (Signature)', sortOrder: 1 },
      });
      const catFriedRice = await prisma.category.create({
        data: { name: 'เมนูข้าวผัด & ทอดกระเทียม', sortOrder: 2 },
      });
      const catSoup = await prisma.category.create({
        data: { name: 'เมนูต้ม & ยำ', sortOrder: 3 },
      });
      const catDrink = await prisma.category.create({
        data: { name: 'เครื่องดื่ม & ของหวาน', sortOrder: 4 },
      });

      // 1. กะเพราถาดโบราณ
      await prisma.menuItem.create({
        data: {
          name: 'ข้าวกะเพราถาดโบราณ (รสเด็ด)',
          description: 'กะเพราพริกแห้งสูตรโบราณ รสเข้มข้น จัดจ้าน เสิร์ฟพร้อมข้าวสวยร้อนๆ',
          basePrice: 60,
          categoryId: catKaprao.id,
          sortOrder: 1,
          imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
          options: {
            create: [
              {
                title: 'เลือกเนื้อสัตว์',
                isRequired: true,
                isMulti: false,
                choices: {
                  create: [
                    { name: 'หมูสับ', extraPrice: 0 },
                    { name: 'ไก่ชิ้น', extraPrice: 0 },
                    { name: 'หมูกรอบ (ยอดนิยม)', extraPrice: 15 },
                    { name: 'เนื้อสับโคขุน', extraPrice: 20 },
                    { name: 'ทะเล (กุ้ง+หมึก)', extraPrice: 25 },
                  ],
                },
              },
              {
                title: 'ระดับความเผ็ด',
                isRequired: false,
                isMulti: false,
                choices: {
                  create: [
                    { name: 'เผ็ดน้อย (พริก 2 เม็ด)', extraPrice: 0 },
                    { name: 'เผ็ดกลาง (มาตรฐาน)', extraPrice: 0 },
                    { name: 'เผ็ดมาก (พริกแห้งจุกๆ)', extraPrice: 0 },
                  ],
                },
              },
              {
                title: 'เพิ่มท็อปปิ้งไข่',
                isRequired: false,
                isMulti: false,
                choices: {
                  create: [
                    { name: 'ไข่ดาวไม่สุก (กรอบนอกเยิ้มใน)', extraPrice: 10 },
                    { name: 'ไข่ดาวสุก', extraPrice: 10 },
                    { name: 'ไข่เจียวหมูสับกรอบ', extraPrice: 15 },
                    { name: 'ไข่ข้นเยิ้มๆ', extraPrice: 15 },
                  ],
                },
              },
            ],
          },
        },
      });

      // 2. ข้าวผัดโบราณ
      await prisma.menuItem.create({
        data: {
          name: 'ข้าวผัดรถไฟโบราณ ซีอิ๊วดำ',
          description: 'ข้าวผัดกลิ่นกระทะหอมกรุ่น ใส่คะน้า มะเขือเทศ หอมใหญ่ และซีอิ๊วดำ',
          basePrice: 55,
          categoryId: catFriedRice.id,
          sortOrder: 2,
          imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
          options: {
            create: [
              {
                title: 'เลือกเนื้อสัตว์',
                isRequired: true,
                isMulti: false,
                choices: {
                  create: [
                    { name: 'หมูชิ้น', extraPrice: 0 },
                    { name: 'ไก่', extraPrice: 0 },
                    { name: 'กุนเชียง', extraPrice: 10 },
                    { name: 'กุ้งสด', extraPrice: 20 },
                    { name: 'ปูแกะ', extraPrice: 35 },
                  ],
                },
              },
            ],
          },
        },
      });

      // 3. ผัดคะน้าหมูกรอบ
      await prisma.menuItem.create({
        data: {
          name: 'ข้าวผัดคะน้าหมูกรอบ',
          description: 'คะน้าฮ่องกงยอดอ่อน ผัดไฟแรงกับหมูกรอบแท้ หนังฟูกรอบสะท้านลิ้น',
          basePrice: 70,
          categoryId: catFriedRice.id,
          sortOrder: 3,
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        },
      });

      // 4. ต้มยำกุ้งน้ำข้น
      await prisma.menuItem.create({
        data: {
          name: 'ต้มยำกุ้งน้ำข้น (หม้อไฟ/ชาม)',
          description: 'ต้มยำกุ้งแม่น้ำตัวโต สมุนไพรไทยข่า ตะไคร้ ใบมะกรูด น้ำพริกเผาเข้มข้น',
          basePrice: 120,
          categoryId: catSoup.id,
          sortOrder: 4,
          imageUrl: 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?auto=format&fit=crop&w=600&q=80',
        },
      });

      // 5. ชาไทยเย็น & ชามะนาว
      await prisma.menuItem.create({
        data: {
          name: 'ชาไทยโบราณ (ชาตรามือ)',
          description: 'ชาไทยแท้ หอม เข้ม มัน หวานกลมกล่อมสูตรโบราณ',
          basePrice: 30,
          categoryId: catDrink.id,
          sortOrder: 5,
          imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
        },
      });
    }
  } catch (err) {
    console.error('ensureDatabaseSeeded error:', err);
  }
}

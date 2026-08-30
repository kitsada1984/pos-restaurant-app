const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for Small Thai Restaurant POS ---');

  // 1. Store Settings
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง',
      promptPayId: '0891234567',
      promptPayName: 'นายสมชาย พัฒนาสุข (ร้านตามสั่ง)',
      address: '88/9 หมู่ 3 ถนนสุขุมวิท ต.เสม็ด อ.เมือง จ.ชลบุรี 20000',
      phone: '089-123-4567',
      receiptFooter: 'ขอบคุณที่มาอุดหนุนครับ 🙏 ทานให้อร่อย โอกาสหน้าเชิญใหม่ครับ',
      tableCount: 10,
    },
  });

  // 2. Tables (1-10)
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { id: i },
      update: {},
      create: {
        id: i,
        name: `โต๊ะ ${i}`,
        status: 'AVAILABLE',
      },
    });
  }

  // Clear existing menu for clean re-seed
  await prisma.menuOptionChoice.deleteMany({});
  await prisma.menuOptionGroup.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});

  // 3. Categories & Menu Items
  const catKaprow = await prisma.category.create({
    data: { name: 'เมนูผัดกะเพรา / ผัดพริก', sortOrder: 1 },
  });

  const catFriedRice = await prisma.category.create({
    data: { name: 'เมนูข้าวผัด / จานเดียว', sortOrder: 2 },
  });

  const catSoup = await prisma.category.create({
    data: { name: 'เมนูต้มยำ & แกงจืด', sortOrder: 3 },
  });

  const catFriedNoodle = await prisma.category.create({
    data: { name: 'เมนูเส้น & ผัดซีอิ๊ว', sortOrder: 4 },
  });

  const catDrinks = await prisma.category.create({
    data: { name: 'เครื่องดื่ม & ของหวาน', sortOrder: 5 },
  });

  // Reusable option sets
  const standardMeatOptions = [
    { name: 'หมูสับ/หมูชิ้น', extraPrice: 0 },
    { name: 'ไก่ชิ้น', extraPrice: 0 },
    { name: 'หมูกรอบ (ยอดฮิต)', extraPrice: 15 },
    { name: 'เนื้อวัว', extraPrice: 20 },
    { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 25 },
    { name: 'รวมมิตรทุกอย่าง', extraPrice: 30 },
  ];

  const eggOptions = [
    { name: 'ไม่เพิ่มไข่', extraPrice: 0 },
    { name: 'ไข่ดาวไม่สุก (เยิ้มๆ)', extraPrice: 10 },
    { name: 'ไข่ดาวกรอบสุก', extraPrice: 10 },
    { name: 'ไข่เจียวหมูสับ', extraPrice: 20 },
    { name: 'ไข่เค็มดาว', extraPrice: 15 },
  ];

  const spicyLevels = [
    { name: 'ไม่ใส่พริก (เด็กทานได้)', extraPrice: 0 },
    { name: 'เผ็ดน้อย (พริก 1-2 เม็ด)', extraPrice: 0 },
    { name: 'เผ็ดกลาง (มาตรฐาน)', extraPrice: 0 },
    { name: 'เผ็ดมาก (พริกคั่วจัดเต็ม)', extraPrice: 0 },
    { name: 'เผ็ดพ่นไฟ / เผ็ดจัด', extraPrice: 0 },
  ];

  const ricePortionOptions = [
    { name: 'ข้าวปกติ', extraPrice: 0 },
    { name: 'พิเศษเพิ่มข้าว', extraPrice: 10 },
    { name: 'กับข้าวอย่างเดียว (ไม่เอาข้าว)', extraPrice: 20 },
  ];

  // Item 1: ผัดกะเพราโบราณ
  await prisma.menuItem.create({
    data: {
      categoryId: catKaprow.id,
      name: 'ผัดกะเพราสูตรโบราณ (ราดข้าว)',
      description: 'ผัดกะเพราแท้ ผัดแห้งหอมกระทะ ไม่ใส่ถั่วฝักยาวและหัวหอม พริกแห้งพริกสดหอมฟุ้ง',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'ระดับความเผ็ด (บังคับ)',
            isRequired: true,
            choices: { create: spicyLevels },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
          {
            title: 'ขนาดจาน',
            isRequired: false,
            choices: { create: ricePortionOptions },
          },
        ],
      },
    },
  });

  // Item 2: ผัดพริกแกงถั่วฝักยาว
  await prisma.menuItem.create({
    data: {
      categoryId: catKaprow.id,
      name: 'ผัดพริกแกงราดข้าว',
      description: 'พริกแกงใต้หอมเข้มข้น ผัดกับถั่วฝักยาวกรอบๆ และใบมะกรูดซอย',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'ระดับความเผ็ด',
            isRequired: true,
            choices: { create: spicyLevels },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 3: ผัดกระเทียมพริกไทย
  await prisma.menuItem.create({
    data: {
      categoryId: catKaprow.id,
      name: 'ทอดกระเทียมพริกไทยราดข้าว',
      description: 'กระเทียมเจียวสดกรอบเหลืองทอง คลุกเคล้าซอสสูตรเด็ด หอมพริกไทย',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 4: ผัดคะน้าหมูกรอบ
  await prisma.menuItem.create({
    data: {
      categoryId: catKaprow.id,
      name: 'ผัดคะน้าหมูกรอบราดข้าว',
      description: 'คะน้าฮ่องกงยอดอ่อน ผัดไฟแดงเสียงดังฉ่า หมูกรอบหนังพองกรุบกรอบ',
      basePrice: 65,
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'ระดับความเผ็ด',
            isRequired: true,
            choices: { create: spicyLevels },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 5: ข้าวผัดรถไฟ / ข้าวผัดโบราณ
  await prisma.menuItem.create({
    data: {
      categoryId: catFriedRice.id,
      name: 'ข้าวผัดโบราณ / ข้าวผัดไข่',
      description: 'ข้าวเรียงเม็ดสวย หอมกลิ่นคั่วกระทะ ใส่ไข่ คะน้า และมะเขือเทศ มะนาวผ่าซีก',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์ (บังคับ)',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
          {
            title: 'เพิ่มท็อปปิ้งไข่',
            isRequired: false,
            choices: { create: eggOptions },
          },
        ],
      },
    },
  });

  // Item 6: ข้าวไข่เจียวทรงเครื่อง
  await prisma.menuItem.create({
    data: {
      categoryId: catFriedRice.id,
      name: 'ข้าวไข่เจียวฟูปูอัด/หมูสับ (2 ฟอง)',
      description: 'ไข่เจียวกรอบนอกนุ่มใน ไม่อมน้ำมัน เสิร์ฟคู่ซอสพริกศรีราชา',
      basePrice: 45,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกไส้ไข่เจียว (เลือกได้หลายอย่าง)',
            isRequired: false,
            isMulti: true,
            choices: {
              create: [
                { name: 'หมูสับ', extraPrice: 10 },
                { name: 'กุ้งสับ', extraPrice: 20 },
                { name: 'ปูอัด', extraPrice: 10 },
                { name: 'แหนม', extraPrice: 15 },
                { name: 'ต้นหอม+หอมแดง', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  // Item 7: ต้มยำรวมมิตรทะเลน้ำข้น
  await prisma.menuItem.create({
    data: {
      categoryId: catSoup.id,
      name: 'ต้มยำกุ้ง / ทะเลน้ำข้น (หม้อ/ถ้วย)',
      description: 'เครื่องต้มยำสด กุ้งสดตัวโต เห็ดฟาง น้ำพริกเผานมสด เข้มข้นแซ่บถึงใจ',
      basePrice: 100,
      imageUrl: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'ประเภทน้ำต้มยำ',
            isRequired: true,
            choices: {
              create: [
                { name: 'น้ำข้น (ใส่นมสดและพริกเผา)', extraPrice: 0 },
                { name: 'น้ำใส (มะนาวสด หอมสมุนไพร)', extraPrice: 0 },
              ],
            },
          },
          {
            title: 'เนื้อสัตว์ในต้มยำ',
            isRequired: true,
            choices: {
              create: [
                { name: 'กุ้งแม่น้ำล้วน', extraPrice: 20 },
                { name: 'ทะเลรวม (กุ้ง+หมึก)', extraPrice: 20 },
                { name: 'ไก่ชิ้น/กระดูกอ่อน', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  // Item 8: ต้มจืดเต้าหู้หมูสับสาหร่าย
  await prisma.menuItem.create({
    data: {
      categoryId: catSoup.id,
      name: 'ต้มจืดเต้าหู้หมูสับสาหร่าย',
      description: 'น้ำซุปใสกลมกล่อม หมูสับปั้นก้อนนุ่ม เต้าหู้ไข่ สาหร่ายวากาเมะ และผักกาดขาว',
      basePrice: 70,
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
    },
  });

  // Item 9: ผัดซีอิ๊วเส้นใหญ่
  await prisma.menuItem.create({
    data: {
      categoryId: catFriedNoodle.id,
      name: 'ผัดซีอิ๊วเส้นใหญ่กระทะเหล็ก',
      description: 'เส้นเหนียวนุ่ม ผัดเคล้าซีอิ๊วดำหอมกลิ่นไหม้กระทะ คะน้ากรอบ ไข่เคลือบเส้น',
      basePrice: 50,
      imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'เลือกเนื้อสัตว์',
            isRequired: true,
            choices: { create: standardMeatOptions },
          },
        ],
      },
    },
  });

  // Item 10-13: เครื่องดื่ม
  await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'ชาไทยเย็น / ชานมเย็นโบราณ',
      description: 'ใบชาเข้มข้น หวานมันกลมกล่อม',
      basePrice: 25,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cf0c458a2?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      options: {
        create: [
          {
            title: 'ระดับความหวาน',
            isRequired: true,
            choices: {
              create: [
                { name: 'หวานปกติ (100%)', extraPrice: 0 },
                { name: 'หวานน้อย (50%)', extraPrice: 0 },
                { name: 'ไม่หวานเลย (0%)', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'น้ำเก๊กฮวยเย็น / กระเจี๊ยบเย็น',
      description: 'ต้มสดใหม่ หอมสดชื่น ดับกระหายคลายเผ็ด',
      basePrice: 20,
      isAvailable: true,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'โค้ก / เป๊ปซี่ + น้ำแข็งเปล่า',
      description: 'กระป๋องเย็นเจี๊ยบ เสิร์ฟพร้อมแก้วน้ำแข็ง',
      basePrice: 20,
      isAvailable: true,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'น้ำเปล่าขวด (พร้อมน้ำแข็ง)',
      description: 'น้ำดื่มสะอาด 600ml',
      basePrice: 10,
      isAvailable: true,
    },
  });

  console.log('✅ Database seeded successfully with 10 tables, settings, categories and rich a-la-carte menu items!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSampleThread() {
  console.log('Seeding sample community thread...');

  // Find admin or store owner user
  const user = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  }) || await prisma.user.findFirst();

  if (!user) {
    console.log('No user found to author thread, skipping.');
    return;
  }

  // Find suggestion category
  const category = await prisma.boardCategory.findUnique({
    where: { slug: 'suggestion' },
  });

  if (!category) {
    console.log('Category not found, skipping.');
    return;
  }

  // Check if sample thread already exists
  const existing = await prisma.boardThread.findFirst({
    where: { title: { contains: 'ระบบแยกบิลโต๊ะเดียวกัน' } },
  });

  if (!existing) {
    const thread = await prisma.boardThread.create({
      data: {
        categoryId: category.id,
        userId: user.id,
        title: '💡 อยากให้มีระบบแยกบิลโต๊ะเดียวกัน (Split Bill / แยกจ่ายคนละจาน)',
        body: 'สวัสดีครับทีมงาน ORDEO POS\n\nอยากเสนอแนะฟีเจอร์ "แยกบิลโต๊ะเดียวกัน" ครับ เวลาลูกค้ากลุ่มออฟฟิศหรือนักศึกษามาทานด้วยกัน 4-5 คน มักจะขอคิดเงินแยกคนละจาน หรือแยกจ่ายคนละครึ่ง\n\nหากมีปุ่มให้เลือกติ๊กรายการแล้วกดชำระเงินทีละส่วน พร้อมพิมพ์ใบเสร็จย่อยให้แต่ละคน จะช่วยให้แคชเชียร์ทำงานได้รวดเร็วขึ้นมากครับ ขอบคุณครับ!',
        isPinned: true,
        featureStatus: 'IN_PROGRESS',
        viewsCount: 24,
      },
    });

    // Add a reaction from user
    await prisma.boardReaction.create({
      data: {
        userId: user.id,
        threadId: thread.id,
        type: 'UPVOTE',
      },
    });

    // Add a response from admin/team
    await prisma.boardComment.create({
      data: {
        threadId: thread.id,
        userId: user.id,
        body: 'ขอบคุณสำหรับข้อเสนอแนะที่ดีเยี่ยมครับ! ขณะนี้ทีมงานรับเรื่องและกำลังพัฒนา (In Progress) ระบบ Split Bill คาดว่าจะพร้อมให้อัปเดตในเวอร์ชันถัดไปครับ 🚀',
      },
    });

    console.log(`[SUCCESS] Sample thread created: ${thread.title}`);
  } else {
    console.log('Sample thread already exists.');
  }
}

seedSampleThread()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

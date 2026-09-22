const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedBoardCategories() {
  console.log('Seeding Board Categories...');
  const categories = [
    {
      slug: 'suggestion',
      name: '💡 เสนอแนะฟีเจอร์ใหม่',
      description: 'เสนอและโหวตฟีเจอร์ใหม่ที่คุณอยากให้มีใน ORDEO POS',
      icon: 'Lightbulb',
      sortOrder: 1,
    },
    {
      slug: 'community',
      name: '💬 พูดคุย & เทคนิคทำร้าน',
      description: 'แชร์ประสบการณ์ แลกเปลี่ยนเทคนิคการบริหารและเพิ่มยอดขายร้านอาหารตามสั่ง',
      icon: 'MessageSquare',
      sortOrder: 2,
    },
    {
      slug: 'feedback',
      name: '🐛 แจ้งปัญหา & ติชมการใช้งาน',
      description: 'พบข้อติดขัด ข้อผิดพลาด หรือมีข้อเสนอแนะ แจ้งให้ทีมงานพัฒนาปรับปรุงได้ที่นี่',
      icon: 'Bug',
      sortOrder: 3,
    },
    {
      slug: 'announcement',
      name: '📢 ประกาศและอัปเดตระบบ',
      description: 'ข่าวสาร การอัปเดตเวอร์ชันใหม่ และกำหนดการสำคัญจากทีมงาน ORDEO POS',
      icon: 'Megaphone',
      sortOrder: 4,
    },
  ];

  for (const cat of categories) {
    await prisma.boardCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
      create: cat,
    });
    console.log(`- Upserted category: ${cat.name} (${cat.slug})`);
  }

  console.log('[SUCCESS] All Board Categories seeded successfully!');
}

seedBoardCategories()
  .catch((e) => {
    console.error('Error seeding board categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

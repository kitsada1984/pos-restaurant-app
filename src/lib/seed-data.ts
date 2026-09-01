import { prisma } from './prisma';

export async function ensureDatabaseSeeded() {
  try {
    let store = await prisma.store.findFirst({
      where: { slug: 'lung-pa' },
    });

    if (!store) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      store = await prisma.store.create({
        data: {
          slug: 'lung-pa',
          name: 'กะเพราถาดยายสม & อาหารตามสั่ง',
          description: 'ร้านอาหารตามสั่งยอดนิยม ผัดกะเพราโบราณ ข้าวผัด ต้มยำน้ำข้น',
          status: 'ACTIVE',
          trialEndsAt: trialEnd,
          subscriptionEnd: trialEnd,
          promptPayId: '0891234567',
          promptPayName: 'นายสมชาย พัฒนาสุข (ร้านตามสั่ง)',
          phone: '089-123-4567',
          receiptFooter: 'ขอบคุณที่มาอุดหนุนครับ 🙏 ทานให้อร่อย โอกาสหน้าเชิญใหม่ครับ',
          tableCount: 10,
        },
      });

      for (let i = 1; i <= 10; i++) {
        await prisma.table.create({
          data: {
            storeId: store.id,
            tableNo: i,
            name: `โต๊ะ ${i}`,
            status: 'AVAILABLE',
          },
        });
      }
    }
  } catch (err) {
    console.error('ensureDatabaseSeeded error:', err);
  }
}

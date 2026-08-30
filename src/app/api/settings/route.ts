import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let setting = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      setting = await prisma.storeSetting.create({
        data: {
          id: 'default',
          storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง',
          promptPayId: '0891234567',
          promptPayName: 'นายสมชาย พัฒนาสุข (ร้านตามสั่ง)',
          address: '88/9 หมู่ 3 ถนนสุขุมวิท ต.เสม็ด อ.เมือง จ.ชลบุรี 20000',
          phone: '089-123-4567',
          receiptFooter: 'ขอบคุณที่มาอุดหนุนครับ 🙏 โอกาสหน้าเชิญใหม่ครับ',
          tableCount: 10,
        },
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeName, promptPayId, promptPayName, address, phone, receiptFooter, tableCount } = body;

    const setting = await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        storeName: storeName || 'ร้านอาหารตามสั่ง',
        promptPayId: promptPayId || '',
        promptPayName: promptPayName || '',
        address: address || '',
        phone: phone || '',
        receiptFooter: receiptFooter || '',
        tableCount: Number(tableCount) || 10,
      },
      create: {
        id: 'default',
        storeName: storeName || 'ร้านอาหารตามสั่ง',
        promptPayId: promptPayId || '',
        promptPayName: promptPayName || '',
        address: address || '',
        phone: phone || '',
        receiptFooter: receiptFooter || '',
        tableCount: Number(tableCount) || 10,
      },
    });

    // If table count changed, ensure tables exist
    const count = Number(tableCount) || 10;
    for (let i = 1; i <= count; i++) {
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

    broadcastEvent('MENU_UPDATED', { type: 'SETTINGS_UPDATED' });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

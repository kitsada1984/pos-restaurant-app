import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePromptPayPayload } from '@/lib/promptpay';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tableId = parseInt(params.id, 10);
    if (isNaN(tableId)) {
      return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!table) {
      return NextResponse.json({
        table: { id: tableId, name: `โต๊ะ ${tableId}`, status: 'AVAILABLE', orders: [] },
        store: { storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง', promptPayId: '0812345678', promptPayName: 'สมใจ ขายดี' },
        activeOrders: [],
        totalAmount: 0,
        promptPayQrPayload: '',
      });
    }

    const store = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    const activeOrders = table.orders;
    const totalAmount = activeOrders.reduce((sum, order) => sum + order.netAmount, 0);

    // Generate Dynamic PromptPay QR Payload if there is an active bill
    let promptPayQrPayload = '';
    if (store?.promptPayId && totalAmount > 0) {
      promptPayQrPayload = generatePromptPayPayload(store.promptPayId, totalAmount);
    }

    return NextResponse.json({
      table,
      store,
      activeOrders,
      totalAmount,
      promptPayQrPayload,
    });
  } catch (error) {
    console.error('Error fetching table details:', error);
    const tableId = parseInt(params?.id || '1', 10) || 1;
    return NextResponse.json({
      table: { id: tableId, name: `โต๊ะ ${tableId}`, status: 'AVAILABLE', orders: [] },
      store: { storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง', promptPayId: '0812345678', promptPayName: 'สมใจ ขายดี' },
      activeOrders: [],
      totalAmount: 0,
      promptPayQrPayload: '',
    });
  }
}

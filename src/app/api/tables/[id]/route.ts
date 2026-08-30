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
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
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
    return NextResponse.json({ error: 'Failed to fetch table details' }, { status: 500 });
  }
}

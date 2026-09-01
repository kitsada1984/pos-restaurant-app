import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export async function POST(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const { paymentMethod, cashReceived, changeAmount, slipUrl } = body;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { table: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        paymentMethod,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        cashReceived: cashReceived ? parseFloat(cashReceived) : null,
        changeAmount: changeAmount ? parseFloat(changeAmount) : null,
        slipUrl,
        paidAt: new Date(),
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Check if table has other unpaid orders
    if (order.tableId) {
      const remainingOrders = await prisma.order.count({
        where: {
          storeId: store.id,
          tableId: order.tableId,
          id: { not: order.id },
          paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
        },
      });

      if (remainingOrders === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: {
            status: 'AVAILABLE',
            currentSessionId: null,
          },
        });
        broadcastEvent('TABLE_UPDATED', { tableNo: order.tableNo, status: 'AVAILABLE' }, store.id);
      }
    }

    broadcastEvent('PAYMENT_RECEIVED', updatedOrder, store.id);
    broadcastEvent('ORDER_UPDATED', updatedOrder, store.id);

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error paying order:', error);
    return NextResponse.json({ error: error.message || 'Failed to process payment' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export async function GET(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        table: true,
        items: true,
      },
    });

    if (!order) return NextResponse.json({ error: 'ไม่พบออเดอร์' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
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
    const { status, itemId, itemStatus } = body;

    // Update single item status
    if (itemId && itemStatus) {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { status: itemStatus },
      });
    }

    // Update entire order status
    let updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'SERVED' || status === 'COMPLETED') {
        await prisma.orderItem.updateMany({
          where: { orderId: params.id },
          data: { status: 'SERVED' },
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        table: true,
        items: true,
      },
    });

    broadcastEvent('ORDER_UPDATED', updatedOrder, store.id);

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}

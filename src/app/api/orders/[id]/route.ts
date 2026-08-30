import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, itemStatusUpdates, discountAmount } = body;

    let updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (discountAmount !== undefined) {
      const discount = parseFloat(discountAmount) || 0;
      const currentOrder = await prisma.order.findUnique({ where: { id: params.id } });
      if (currentOrder) {
        updateData.discountAmount = discount;
        updateData.netAmount = Math.max(0, currentOrder.totalAmount - discount);
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Update individual item statuses if requested
    if (itemStatusUpdates && Array.isArray(itemStatusUpdates)) {
      for (const itemUpdate of itemStatusUpdates) {
        if (itemUpdate.id && itemUpdate.status) {
          await prisma.orderItem.update({
            where: { id: itemUpdate.id },
            data: { status: itemUpdate.status },
          });
        }
      }
    }

    broadcastEvent('ORDER_UPDATED', updatedOrder);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
      include: { table: true },
    });

    broadcastEvent('ORDER_UPDATED', { id: params.id, status: 'CANCELLED', tableId: order.tableId });

    return NextResponse.json({ success: true, message: 'ยกเลิกออเดอร์เรียบร้อย' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

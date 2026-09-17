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
    const { status, itemId, itemStatus, itemStatusUpdates, discountAmount } = body;

    // 1. Update individual item statuses first
    if (itemId && itemStatus) {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { status: itemStatus },
      });
    }

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

    let updateData: any = {};

    if (status) {
      updateData.status = status;

      // Mass item update only when NOT updating a single item
      if (!itemId && (!itemStatusUpdates || itemStatusUpdates.length === 0)) {
        if (status === 'SERVED' || status === 'COMPLETED') {
          await prisma.orderItem.updateMany({
            where: { orderId: params.id },
            data: { status: 'SERVED' },
          });
        } else if (status === 'READY') {
          await prisma.orderItem.updateMany({
            where: { orderId: params.id, status: { not: 'SERVED' } },
            data: { status: 'READY' },
          });
        } else if (status === 'COOKING') {
          await prisma.orderItem.updateMany({
            where: { orderId: params.id, status: { in: ['PENDING', 'READY'] } },
            data: { status: 'COOKING' },
          });
        } else if (status === 'PENDING') {
          await prisma.orderItem.updateMany({
            where: { orderId: params.id, status: { in: ['COOKING', 'READY'] } },
            data: { status: 'PENDING' },
          });
        }
      }
    } else if (itemId || (itemStatusUpdates && itemStatusUpdates.length > 0)) {
      const currentItems = await prisma.orderItem.findMany({
        where: { orderId: params.id },
      });
      if (currentItems.length > 0) {
        const allServed = currentItems.every((it) => it.status === 'SERVED');
        const allReady = currentItems.every((it) => it.status === 'READY' || it.status === 'SERVED');
        const anyCookingOrReady = currentItems.some((it) => it.status === 'COOKING' || it.status === 'READY');

        if (allServed) {
          updateData.status = 'SERVED';
        } else if (allReady) {
          updateData.status = 'READY';
        } else if (anyCookingOrReady) {
          const current = await prisma.order.findUnique({ where: { id: params.id }, select: { status: true } });
          if (current?.status === 'PENDING') {
            updateData.status = 'COOKING';
          }
        }
      }
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

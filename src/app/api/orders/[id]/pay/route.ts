import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const {
      paymentMethod,
      cashReceived,
      discountAmount,
      slipUrl,
      payAllTableOrders,
    } = body;

    const orderId = params.id;
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const tableId = currentOrder.tableId;
    const now = new Date();

    if (payAllTableOrders && tableId) {
      const activeOrders = await prisma.order.findMany({
        where: {
          tableId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });

      for (const ord of activeOrders) {
        let disc = 0;
        if (ord.id === orderId && discountAmount !== undefined) {
          disc = parseFloat(discountAmount) || 0;
        }
        const net = Math.max(0, ord.totalAmount - disc);
        const cashRec = cashReceived ? parseFloat(cashReceived) : null;
        const change = cashRec !== null && cashRec >= net ? cashRec - net : 0;

        await prisma.order.update({
          where: { id: ord.id },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paymentMethod: paymentMethod || 'CASH',
            discountAmount: disc,
            netAmount: net,
            cashReceived: cashRec,
            changeAmount: change,
            slipUrl: slipUrl || ord.slipUrl,
            paidAt: now,
          },
        });
      }
    } else {
      const disc = parseFloat(discountAmount) || 0;
      const net = Math.max(0, currentOrder.totalAmount - disc);
      const cashRec = cashReceived ? parseFloat(cashReceived) : null;
      const change = cashRec !== null && cashRec >= net ? cashRec - net : 0;

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMethod: paymentMethod || 'CASH',
          discountAmount: disc,
          netAmount: net,
          cashReceived: cashRec,
          changeAmount: change,
          slipUrl: slipUrl || null,
          paidAt: now,
        },
      });
    }

    let remainingOrders = 0;
    if (tableId) {
      remainingOrders = await prisma.order.count({
        where: {
          tableId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });

      if (remainingOrders === 0) {
        await prisma.table.update({
          where: { id: tableId },
          data: { status: 'AVAILABLE', currentSessionId: null },
        });
      }
    }

    broadcastEvent('PAYMENT_RECEIVED', {
      orderId,
      tableId,
      paymentMethod,
      timestamp: now.getTime(),
    }, currentOrder.storeId);
    broadcastEvent('TABLE_UPDATED', { tableId, action: 'PAYMENT_COMPLETE' }, currentOrder.storeId);

    return NextResponse.json({
      success: true,
      message: 'ชำระเงินและปิดบิลเรียบร้อยแล้ว',
      tableId,
      remainingActiveOrders: remainingOrders,
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}

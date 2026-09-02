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
      select: { id: true, pointsRate: true, pointValue: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const { paymentMethod, cashReceived, changeAmount, slipUrl, memberPhone, pointsRedeemed, promoCode, discountAmount } = body;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { table: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const effectiveMemberPhone = memberPhone ? memberPhone.replace(/\D/g, '') : order.memberPhone;
    const effectivePointsRedeemed = Number(pointsRedeemed) || order.pointsRedeemed || 0;
    const effectivePromoCode = promoCode || order.promoCode;
    const effectiveDiscount = discountAmount !== undefined ? Number(discountAmount) : order.discountAmount;
    const effectiveNetAmount = Math.max(0, order.totalAmount - effectiveDiscount);

    // Calculate Points Earned (e.g. netAmount / pointsRate)
    let pointsEarned = 0;
    if (effectiveMemberPhone && store.pointsRate > 0) {
      pointsEarned = Math.floor(effectiveNetAmount / store.pointsRate);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        paymentMethod,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        discountAmount: effectiveDiscount,
        netAmount: effectiveNetAmount,
        cashReceived: cashReceived ? parseFloat(cashReceived) : null,
        changeAmount: changeAmount ? parseFloat(changeAmount) : null,
        memberPhone: effectiveMemberPhone,
        pointsEarned,
        pointsRedeemed: effectivePointsRedeemed,
        promoCode: effectivePromoCode,
        slipUrl,
        paidAt: new Date(),
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Update Customer Member Record (Add Earned Points, Deduct Redeemed Points, Increase Total Spent)
    if (effectiveMemberPhone) {
      const netPointsChange = pointsEarned - effectivePointsRedeemed;
      await prisma.customerMember.upsert({
        where: {
          storeId_phone: {
            storeId: store.id,
            phone: effectiveMemberPhone,
          },
        },
        update: {
          points: { increment: netPointsChange },
          totalSpent: { increment: effectiveNetAmount },
          visitCount: { increment: 1 },
        },
        create: {
          storeId: store.id,
          phone: effectiveMemberPhone,
          name: order.customerName || 'สมาชิก',
          points: Math.max(0, netPointsChange),
          totalSpent: effectiveNetAmount,
          visitCount: 1,
        },
      });
    }

    // Increment Promotion Usage Count
    if (effectivePromoCode) {
      await prisma.promotion.updateMany({
        where: { storeId: store.id, code: effectivePromoCode.toUpperCase().trim() },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

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

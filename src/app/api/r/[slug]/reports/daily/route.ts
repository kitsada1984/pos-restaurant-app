import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const paidOrders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        paymentStatus: 'PAID',
        paidAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalSales = paidOrders.reduce((sum, o) => sum + o.netAmount, 0);
    const totalBills = paidOrders.length;
    const totalCost = paidOrders.reduce((sum, o) => sum + (o.costAmount || 0), 0);
    const totalDiscount = paidOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const grossProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0;
    const totalPointsEarned = paidOrders.reduce((sum, o) => sum + (o.pointsEarned || 0), 0);
    const totalPointsRedeemed = paidOrders.reduce((sum, o) => sum + (o.pointsRedeemed || 0), 0);

    let cashSales = 0;
    let promptPaySales = 0;

    const itemCounts: { [name: string]: { quantity: number; revenue: number } } = {};

    paidOrders.forEach((order) => {
      if (order.paymentMethod === 'CASH') {
        cashSales += order.netAmount;
      } else {
        promptPaySales += order.netAmount;
      }

      order.items.forEach((item) => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { quantity: 0, revenue: 0 };
        }
        itemCounts[item.name].quantity += item.quantity;
        itemCounts[item.name].revenue += item.price * item.quantity;
      });
    });

    const topSellingItems = Object.entries(itemCounts)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      date: startOfDay.toISOString().split('T')[0],
      totalSales,
      totalBills,
      totalCost,
      grossProfit,
      profitMargin,
      totalDiscount,
      totalPointsEarned,
      totalPointsRedeemed,
      cashSales,
      promptPaySales,
      topSellingItems,
      orders: paidOrders,
    });
  } catch (error: any) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

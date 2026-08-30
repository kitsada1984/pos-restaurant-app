import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // optional YYYY-MM-DD

    let startOfDay = new Date();
    if (dateParam) {
      startOfDay = new Date(dateParam);
    }
    startOfDay.setHours(0, 0, 0, 0);

    let endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all completed orders for today
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paidAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        table: true,
        items: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalSales = completedOrders.reduce((sum, o) => sum + o.netAmount, 0);
    const totalDiscount = completedOrders.reduce((sum, o) => sum + o.discountAmount, 0);
    const totalGross = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = completedOrders.length;
    const avgPerBill = orderCount > 0 ? totalSales / orderCount : 0;

    // Payment breakdown
    const cashSales = completedOrders
      .filter((o) => o.paymentMethod === 'CASH')
      .reduce((sum, o) => sum + o.netAmount, 0);
    const promptPaySales = completedOrders
      .filter((o) => o.paymentMethod === 'PROMPTPAY')
      .reduce((sum, o) => sum + o.netAmount, 0);

    // Top selling items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of completedOrders) {
      for (const item of order.items) {
        const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.name, existing);
      }
    }

    const topSellingItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      date: startOfDay.toISOString().split('T')[0],
      totalSales,
      totalDiscount,
      totalGross,
      orderCount,
      avgPerBill,
      cashSales,
      promptPaySales,
      cashCount: completedOrders.filter((o) => o.paymentMethod === 'CASH').length,
      promptPayCount: completedOrders.filter((o) => o.paymentMethod === 'PROMPTPAY').length,
      topSellingItems,
      recentBills: completedOrders.slice(0, 20),
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await requireSuperAdmin();

    const now = new Date();

    const [
      totalStores,
      activeStores,
      trialStores,
      pendingStores,
      totalUsers,
      totalOrders,
      subscriptions,
    ] = await Promise.all([
      prisma.store.count(),
      prisma.store.count({ where: { status: 'ACTIVE' } }),
      prisma.store.count({ where: { status: 'TRIAL' } }),
      prisma.subscriptionHistory.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
      prisma.order.count(),
      prisma.subscriptionHistory.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = subscriptions._sum.amount || 0;

    return NextResponse.json({
      totalStores,
      activeStores,
      trialStores,
      pendingStores,
      totalUsers,
      totalOrders,
      totalRevenue,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message.includes('FORBIDDEN') ? 403 : 401 }
    );
  }
}

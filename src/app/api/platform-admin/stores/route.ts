import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        plan: true,
        users: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        _count: {
          select: { tables: true, orders: true, menuItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ stores });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, pointsRate: true, pointValue: true },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const rewards = await prisma.loyaltyReward.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { pointsRequired: 'asc' },
    });

    // Lookup specific member by phone
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const member = await prisma.customerMember.findUnique({
        where: {
          storeId_phone: {
            storeId: store.id,
            phone: cleanPhone,
          },
        },
      });

      return NextResponse.json({
        member: member || null,
        pointsRate: store.pointsRate,
        pointValue: store.pointValue,
        rewards,
      });
    }

    // List all members for store admin
    const members = await prisma.customerMember.findMany({
      where: { storeId: store.id },
      orderBy: { points: 'desc' },
      take: 100,
    });

    return NextResponse.json({ members, pointsRate: store.pointsRate, pointValue: store.pointValue, rewards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { phone, name, action, pointsDelta, pointsRate, pointValue } = body;

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Update store points rate settings
    if (action === 'UPDATE_SETTINGS' && (pointsRate !== undefined || pointValue !== undefined)) {
      const updatedStore = await prisma.store.update({
        where: { id: store.id },
        data: {
          ...(pointsRate !== undefined && { pointsRate: parseFloat(pointsRate) || 25 }),
          ...(pointValue !== undefined && { pointValue: parseFloat(pointValue) || 1 }),
        },
      });
      return NextResponse.json({ success: true, pointsRate: updatedStore.pointsRate, pointValue: updatedStore.pointValue });
    }

    if (!phone) return NextResponse.json({ error: 'กรุณาระบุเบอร์โทรศัพท์' }, { status: 400 });

    const cleanPhone = phone.replace(/\D/g, '');

    // Adjust points manually
    if (action === 'ADJUST_POINTS' && pointsDelta !== undefined) {
      const member = await prisma.customerMember.upsert({
        where: {
          storeId_phone: {
            storeId: store.id,
            phone: cleanPhone,
          },
        },
        update: {
          points: {
            increment: parseInt(pointsDelta) || 0,
          },
        },
        create: {
          storeId: store.id,
          phone: cleanPhone,
          name: name ? name.trim() : 'ลูกค้าทั่วไป',
          points: Math.max(0, parseInt(pointsDelta) || 0),
        },
      });

      return NextResponse.json({ success: true, member });
    }

    // Standard Upsert Member
    const member = await prisma.customerMember.upsert({
      where: {
        storeId_phone: {
          storeId: store.id,
          phone: cleanPhone,
        },
      },
      update: {
        name: name ? name.trim() : undefined,
      },
      create: {
        storeId: store.id,
        phone: cleanPhone,
        name: name ? name.trim() : 'ลูกค้าใหม่',
        points: 0,
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

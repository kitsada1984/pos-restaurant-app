import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, pointsRate: true, pointValue: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const rewards = await prisma.loyaltyReward.findMany({
      where: { storeId: store.id },
      orderBy: { pointsRequired: 'asc' },
    });

    // Also fetch store menu items for matching free item names
    const menuItems = await prisma.menuItem.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true, basePrice: true },
    });

    return NextResponse.json({
      rewards,
      pointsRate: store.pointsRate,
      pointValue: store.pointValue,
      menuItems,
    });
  } catch (error: any) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      pointsRequired,
      rewardType = 'DISCOUNT',
      discountAmount = 0,
      freeMenuItemId,
      description,
    } = body;

    if (!title || !pointsRequired) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อรางวัลและแต้มที่ต้องใช้' }, { status: 400 });
    }

    const reward = await prisma.loyaltyReward.create({
      data: {
        storeId: store.id,
        title: title.trim(),
        pointsRequired: parseInt(pointsRequired),
        rewardType,
        discountAmount: parseFloat(discountAmount) || 0,
        freeMenuItemId: freeMenuItemId || null,
        description: description?.trim() || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, reward });
  } catch (error: any) {
    console.error('Error creating reward:', error);
    return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, title, pointsRequired, rewardType, discountAmount, freeMenuItemId, isActive, description, pointsRate } = body;

    // Optional update store pointsRate
    if (pointsRate !== undefined) {
      await prisma.store.update({
        where: { id: store.id },
        data: { pointsRate: parseFloat(pointsRate) || 25 },
      });
    }

    if (id) {
      const updated = await prisma.loyaltyReward.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(pointsRequired !== undefined && { pointsRequired: parseInt(pointsRequired) }),
          ...(rewardType !== undefined && { rewardType }),
          ...(discountAmount !== undefined && { discountAmount: parseFloat(discountAmount) || 0 }),
          ...(freeMenuItemId !== undefined && { freeMenuItemId: freeMenuItemId || null }),
          ...(isActive !== undefined && { isActive }),
          ...(description !== undefined && { description: description?.trim() || null }),
        },
      });

      return NextResponse.json({ success: true, reward: updated });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating reward:', error);
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing reward id' }, { status: 400 });
    }

    await prisma.loyaltyReward.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting reward:', error);
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
  }
}
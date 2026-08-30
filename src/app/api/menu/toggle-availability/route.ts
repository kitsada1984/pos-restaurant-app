import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id, isAvailable } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: isAvailable ?? true },
    });

    broadcastEvent('MENU_UPDATED', { itemId: item.id, isAvailable: item.isAvailable });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error toggling menu availability:', error);
    return NextResponse.json({ error: 'Failed to update item availability' }, { status: 500 });
  }
}

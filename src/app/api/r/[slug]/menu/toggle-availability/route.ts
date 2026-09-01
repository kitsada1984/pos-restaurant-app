import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

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
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const { id, isAvailable } = await request.json();

    const item = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable },
    });

    broadcastEvent('MENU_UPDATED', { action: 'toggle-availability', item }, store.id);

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error toggling availability:', error);
    return NextResponse.json({ error: 'Failed to update item availability' }, { status: 500 });
  }
}

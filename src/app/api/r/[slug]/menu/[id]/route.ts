import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export async function PUT(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const { categoryId, name, description, basePrice, imageUrl, isAvailable } = body;

    const existing = await prisma.menuItem.findFirst({
      where: { id: params.id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบเมนูอาหาร' }, { status: 404 });
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        ...(categoryId && { categoryId }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: {
        options: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent('MENU_UPDATED', { action: 'update', item: updatedItem }, store.id);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const existing = await prisma.menuItem.findFirst({
      where: { id: params.id, storeId: store.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบเมนูอาหาร' }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id: params.id },
    });

    broadcastEvent('MENU_UPDATED', { action: 'delete', id: params.id }, store.id);

    return NextResponse.json({ success: true, message: 'ลบเมนูเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
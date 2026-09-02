import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { formatImageUrl } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, status: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              include: {
                choices: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
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
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const { categoryId, name, description, basePrice, imageUrl, options } = body;

    const newItem = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        categoryId,
        name,
        description,
        basePrice: parseFloat(basePrice),
        imageUrl: formatImageUrl(imageUrl) || null,
        isAvailable: true,
        options: options
          ? {
              create: options.map((group: any) => ({
                title: group.title,
                isRequired: group.isRequired || false,
                isMulti: group.isMulti || false,
                choices: {
                  create: group.choices.map((choice: any) => ({
                    name: choice.name,
                    extraPrice: parseFloat(choice.extraPrice || 0),
                  })),
                },
              })),
            }
          : undefined,
      },
      include: {
        options: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent('MENU_UPDATED', { action: 'create', item: newItem }, store.id);

    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

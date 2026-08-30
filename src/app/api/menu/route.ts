import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { ensureDatabaseSeeded } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let categories = await prisma.category.findMany({
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

    if (categories.length === 0) {
      await ensureDatabaseSeeded();
      categories = await prisma.category.findMany({
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
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Create Category
    if (action === 'CREATE_CATEGORY') {
      const { name } = body;
      const count = await prisma.category.count();
      const newCategory = await prisma.category.create({
        data: {
          name: name.trim(),
          sortOrder: count + 1,
        },
      });
      broadcastEvent('MENU_UPDATED', newCategory);
      return NextResponse.json(newCategory);
    }

    // Action 2: Create Menu Item
    const { categoryId, name, description, basePrice, imageUrl, options } = body;

    const item = await prisma.menuItem.create({
      data: {
        categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        basePrice: parseFloat(basePrice) || 0,
        imageUrl: imageUrl?.trim() || null,
        isAvailable: true,
        options: options && options.length > 0 ? {
          create: options.map((opt: any) => ({
            title: opt.title,
            isRequired: !!opt.isRequired,
            isMulti: !!opt.isMulti,
            choices: {
              create: (opt.choices || []).map((ch: any) => ({
                name: ch.name,
                extraPrice: parseFloat(ch.extraPrice) || 0,
              })),
            },
          })),
        } : undefined,
      },
      include: {
        options: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent('MENU_UPDATED', item);
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'item' or 'category'

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    if (type === 'category') {
      await prisma.category.delete({ where: { id } });
    } else {
      await prisma.menuItem.delete({ where: { id } });
    }

    broadcastEvent('MENU_UPDATED', { id, type });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu/category:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

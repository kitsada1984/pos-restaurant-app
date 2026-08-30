import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // e.g. 'active', 'kitchen', 'completed'
    const tableId = searchParams.get('tableId');

    let whereClause: any = {};

    if (tableId) {
      whereClause.tableId = parseInt(tableId, 10);
    }

    if (status === 'kitchen') {
      whereClause.status = { in: ['PENDING', 'COOKING', 'READY'] };
    } else if (status === 'active') {
      whereClause.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (status === 'completed') {
      whereClause.status = 'COMPLETED';
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, items, orderType, customerLineId, customerName, note } = body;

    const tId = parseInt(tableId, 10);
    if (isNaN(tId)) {
      return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    // Calculate total
    let totalAmount = 0;
    const formattedItems = items.map((item: any) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 1;
      totalAmount += price * quantity;

      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: price,
        quantity: quantity,
        selectedOptions: typeof item.selectedOptions === 'object' ? JSON.stringify(item.selectedOptions) : item.selectedOptions,
        specialNote: item.specialNote?.trim() || null,
        status: 'PENDING',
      };
    });

    // Create Order with Items
    const order = await prisma.order.create({
      data: {
        tableId: tId,
        orderType: orderType || 'DINE_IN',
        totalAmount,
        discountAmount: 0,
        netAmount: totalAmount,
        paymentStatus: 'UNPAID',
        customerLineId: customerLineId || null,
        customerName: customerName || null,
        note: note?.trim() || null,
        status: 'PENDING',
        items: {
          create: formattedItems,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Update table status to OCCUPIED
    await prisma.table.update({
      where: { id: tId },
      data: { status: 'OCCUPIED' },
    });

    // Broadcast to Kitchen & POS
    broadcastEvent('ORDER_CREATED', order);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

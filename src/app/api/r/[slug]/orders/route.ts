import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const tableIdParam = searchParams.get('tableId');
    const statusParam = searchParams.get('status');

    const where: any = { storeId: store.id };

    if (tableIdParam) {
      const tNo = parseInt(tableIdParam);
      where.OR = [
        { tableId: tableIdParam },
        { tableNo: isNaN(tNo) ? undefined : tNo },
      ];
    }

    if (statusParam) {
      where.status = statusParam;
    } else {
      where.status = {
        in: ['PENDING', 'COOKING', 'READY', 'SERVED'],
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const { tableId, items, orderType, note, customerName, customerLineId } = body;

    const tableNo = parseInt(tableId || 1);

    // Upsert table for this store
    const table = await prisma.table.upsert({
      where: {
        storeId_tableNo: {
          storeId: store.id,
          tableNo,
        },
      },
      update: {
        status: 'OCCUPIED',
      },
      create: {
        storeId: store.id,
        tableNo,
        name: `โต๊ะ ${tableNo}`,
        status: 'OCCUPIED',
      },
    });

    // Calculate total amount
    let totalAmount = 0;
    const orderItemsData = items.map((item: any) => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;

      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
        specialNote: item.specialNote || null,
        status: 'PENDING',
      };
    });

    const newOrder = await prisma.order.create({
      data: {
        storeId: store.id,
        tableId: table.id,
        tableNo: table.tableNo,
        orderType: orderType || 'DINE_IN',
        totalAmount,
        netAmount: totalAmount,
        note,
        customerName,
        customerLineId,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Broadcast SSE realtime events
    broadcastEvent('ORDER_CREATED', newOrder, store.id);
    broadcastEvent('TABLE_UPDATED', { tableNo: table.tableNo, status: 'OCCUPIED' }, store.id);

    return NextResponse.json(newOrder);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}

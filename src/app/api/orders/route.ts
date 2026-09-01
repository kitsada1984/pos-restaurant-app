import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { ensureDatabaseSeeded } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

async function getDefaultStore() {
  await ensureDatabaseSeeded();
  let store = await prisma.store.findFirst({ where: { slug: 'lung-pa' } });
  if (!store) store = await prisma.store.findFirst();
  return store;
}

export async function GET(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json([]);

    const { searchParams } = new URL(req.url);
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

    if (statusParam === 'kitchen') {
      where.status = {
        in: ['PENDING', 'COOKING', 'READY'],
      };
    } else if (statusParam) {
      where.status = statusParam;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'asc' },
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
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await req.json();
    const { tableId, items, orderType, note, customerName, customerLineId } = body;

    const tableNo = parseInt(tableId || 1);

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

    let totalAmount = 0;
    const orderItemsData = (items || []).map((item: any) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      totalAmount += itemTotal;

      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
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

    broadcastEvent('ORDER_CREATED', newOrder, store.id);
    broadcastEvent('TABLE_UPDATED', { tableNo: table.tableNo, status: 'OCCUPIED' }, store.id);

    return NextResponse.json(newOrder);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}

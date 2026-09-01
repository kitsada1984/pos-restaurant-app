import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

async function getDefaultStore() {
  let store = await prisma.store.findFirst({ where: { slug: 'lung-pa' } });
  if (!store) store = await prisma.store.findFirst();
  return store;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: true,
          },
        },
      },
    });

    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    return NextResponse.json(table);
  } catch (error) {
    console.error('Error fetching table details:', error);
    return NextResponse.json({ error: 'Failed to fetch table' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await req.json();
    const { name, status } = body;
    const tableNo = parseInt(params.id);

    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
    });

    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const updated = await prisma.table.update({
      where: { id: table.id },
      data: {
        name: name !== undefined ? name : table.name,
        status: status !== undefined ? status : table.status,
      },
    });

    broadcastEvent('TABLE_UPDATED', { action: 'update', table: updated }, store.id);
    return NextResponse.json({ success: true, table: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const tableNo = parseInt(params.id);
    const table = await prisma.table.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: params.id }, { tableNo: isNaN(tableNo) ? undefined : tableNo }],
      },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
            paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          },
        },
      },
    });

    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    if (table.orders.length > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบ ${table.name} ได้เนื่องจากมีออเดอร์ค้างอยู่` },
        { status: 400 }
      );
    }

    await prisma.table.delete({ where: { id: table.id } });
    broadcastEvent('TABLE_UPDATED', { action: 'delete', tableNo: table.tableNo }, store.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

export async function GET() {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json([]);

    const tables = await prisma.table.findMany({
      where: { storeId: store.id },
      orderBy: { tableNo: 'asc' },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const formattedTables = tables.map((t) => {
      const activeOrders = t.orders;
      const totalAmount = activeOrders.reduce((sum, order) => sum + order.netAmount, 0);
      const totalItems = activeOrders.reduce(
        (sum, order) => sum + order.items.reduce((iSum, item) => iSum + item.quantity, 0),
        0
      );

      let calculatedStatus = t.status;
      if (activeOrders.length === 0) {
        calculatedStatus = 'AVAILABLE';
      } else {
        const hasPaymentPending = activeOrders.some(
          (o) => o.paymentStatus === 'PENDING_CONFIRMATION' || t.status === 'PAYMENT_PENDING'
        );
        if (hasPaymentPending) {
          calculatedStatus = 'PAYMENT_PENDING';
        } else {
          calculatedStatus = 'OCCUPIED';
        }
      }

      return {
        id: t.tableNo,
        tableNo: t.tableNo,
        tableId: t.id,
        name: t.name,
        status: calculatedStatus,
        activeOrdersCount: activeOrders.length,
        totalItems,
        totalAmount,
        activeOrders,
        firstOrderAt: activeOrders.length > 0 ? activeOrders[0].createdAt : null,
      };
    });

    return NextResponse.json(formattedTables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await req.json();
    const action = body.action;

    // Single Table Creation
    if (action === 'CREATE_TABLE' || (!action && (body.id !== undefined || body.tableNo !== undefined || body.name))) {
      let targetTableNo = parseInt(body.tableNo || body.id);
      const inputName = body.name ? body.name.trim() : '';

      if (isNaN(targetTableNo) && inputName) {
        const numMatch = inputName.match(/\d+/);
        if (numMatch) {
          targetTableNo = parseInt(numMatch[0]);
        }
      }

      if (isNaN(targetTableNo) || targetTableNo <= 0) {
        const highest = await prisma.table.findFirst({
          where: { storeId: store.id },
          orderBy: { tableNo: 'desc' },
        });
        targetTableNo = (highest?.tableNo || 0) + 1;
      }

      const existing = await prisma.table.findUnique({
        where: {
          storeId_tableNo: {
            storeId: store.id,
            tableNo: targetTableNo,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `หมายเลขโต๊ะ ${targetTableNo} มีอยู่ในระบบแล้ว กรุณาใช้หมายเลขอื่น` },
          { status: 400 }
        );
      }

      const finalName = inputName || `โต๊ะ ${targetTableNo}`;

      const newTable = await prisma.table.create({
        data: {
          storeId: store.id,
          tableNo: targetTableNo,
          name: finalName,
          status: 'AVAILABLE',
        },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'create', table: newTable }, store.id);

      return NextResponse.json({ success: true, table: newTable, message: `เพิ่ม ${finalName} สำเร็จแล้ว` });
    }

    // Batch Create
    if (action === 'BATCH_CREATE') {
      const count = parseInt(body.count) || 1;
      const existingTables = await prisma.table.findMany({
        where: { storeId: store.id },
        select: { tableNo: true },
      });
      const existingNos = new Set(existingTables.map((t) => t.tableNo));

      const createdTables = [];
      let candidate = 1;
      while (createdTables.length < count) {
        if (!existingNos.has(candidate)) {
          const t = await prisma.table.create({
            data: {
              storeId: store.id,
              tableNo: candidate,
              name: `โต๊ะ ${candidate}`,
              status: 'AVAILABLE',
            },
          });
          createdTables.push(t);
          existingNos.add(candidate);
        }
        candidate++;
      }

      broadcastEvent('TABLE_UPDATED', { action: 'batch_create' }, store.id);

      return NextResponse.json({ success: true, tables: createdTables });
    }

    // Clear Table
    if (action === 'CLEAR_TABLE') {
      const tableNo = parseInt(body.tableId || body.tableNo);
      const table = await prisma.table.findUnique({
        where: { storeId_tableNo: { storeId: store.id, tableNo } },
      });
      if (table) {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: 'AVAILABLE', currentSessionId: null },
        });
        broadcastEvent('TABLE_UPDATED', { action: 'clear', tableNo }, store.id);
      }
      return NextResponse.json({ success: true });
    }

    // Move Table
    if (action === 'MOVE_TABLE') {
      const fromTableNo = parseInt(body.fromTableId || body.fromTableNo);
      const toTableNo = parseInt(body.toTableId || body.toTableNo);

      const [fromTable, toTable] = await Promise.all([
        prisma.table.findUnique({ where: { storeId_tableNo: { storeId: store.id, tableNo: fromTableNo } } }),
        prisma.table.findUnique({ where: { storeId_tableNo: { storeId: store.id, tableNo: toTableNo } } }),
      ]);

      if (fromTable && toTable) {
        await prisma.order.updateMany({
          where: { storeId: store.id, tableId: fromTable.id, status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] } },
          data: { tableId: toTable.id, tableNo: toTable.tableNo },
        });
        await prisma.table.update({ where: { id: fromTable.id }, data: { status: 'AVAILABLE' } });
        await prisma.table.update({ where: { id: toTable.id }, data: { status: 'OCCUPIED' } });
        broadcastEvent('TABLE_UPDATED', { action: 'move', from: fromTableNo, to: toTableNo }, store.id);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

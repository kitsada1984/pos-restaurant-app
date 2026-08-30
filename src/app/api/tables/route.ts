import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import { ensureDatabaseSeeded } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let tables = await prisma.table.findMany({
      orderBy: { id: 'asc' },
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

    if (tables.length === 0) {
      await ensureDatabaseSeeded();
      tables = await prisma.table.findMany({
        orderBy: { id: 'asc' },
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
    }

    const formattedTables = tables.map((t) => {
      const activeOrders = t.orders;
      const totalAmount = activeOrders.reduce((sum, order) => sum + order.netAmount, 0);
      const totalItems = activeOrders.reduce(
        (sum, order) => sum + order.items.reduce((iSum, item) => iSum + item.quantity, 0),
        0
      );

      // Determine accurate real-time table status
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
        id: t.id,
        name: t.name,
        status: calculatedStatus,
        activeOrdersCount: activeOrders.length,
        totalItems,
        totalAmount,
        activeOrders,
        firstOrderAt: activeOrders.length > 0 ? activeOrders[0].createdAt : null,
      };
    });

    if (formattedTables.length === 0) {
      const fallback10Tables = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `โต๊ะ ${i + 1}`,
        status: 'AVAILABLE',
        activeOrdersCount: 0,
        totalItems: 0,
        totalAmount: 0,
        activeOrders: [],
        firstOrderAt: null,
      }));
      return NextResponse.json(fallback10Tables);
    }

    return NextResponse.json(formattedTables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    const fallback10Tables = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `โต๊ะ ${i + 1}`,
      status: 'AVAILABLE',
      activeOrdersCount: 0,
      totalItems: 0,
      totalAmount: 0,
      activeOrders: [],
      firstOrderAt: null,
    }));
    return NextResponse.json(fallback10Tables);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'SEED_DEFAULTS') {
      await ensureDatabaseSeeded();
      broadcastEvent('TABLE_UPDATED', { type: 'TABLE_SEEDED' });
      return NextResponse.json({ success: true });
    }

    // Action: Create New Table
    if (action === 'CREATE_TABLE') {
      const maxTable = await prisma.table.findFirst({ orderBy: { id: 'desc' } });
      const nextId = (maxTable?.id || 0) + 1;
      const tableName = body.name?.trim() || `โต๊ะ ${nextId}`;

      const newTable = await prisma.table.create({
        data: {
          id: nextId,
          name: tableName,
          status: 'AVAILABLE',
        },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'CREATE', table: newTable });
      return NextResponse.json(newTable);
    }

    // Action: Delete Table
    if (action === 'DELETE_TABLE') {
      const { tableId } = body;
      const tId = Number(tableId);

      await prisma.order.deleteMany({
        where: { tableId: tId },
      });

      await prisma.table.delete({
        where: { id: tId },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'DELETE', tableId: tId });
      return NextResponse.json({ success: true, message: `ลบโต๊ะ ${tId} เรียบร้อย` });
    }

    // Action 1: Move Table
    if (action === 'MOVE_TABLE') {
      const { fromTableId, toTableId } = body;
      const fromId = Number(fromTableId);
      const toId = Number(toTableId);

      if (!fromId || !toId || fromId === toId) {
        return NextResponse.json({ error: 'Invalid source or target table' }, { status: 400 });
      }

      // Reassign all active orders to the target table
      await prisma.order.updateMany({
        where: {
          tableId: fromId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        data: {
          tableId: toId,
        },
      });

      // Update statuses
      await prisma.table.update({
        where: { id: fromId },
        data: { status: 'AVAILABLE', currentSessionId: null },
      });
      await prisma.table.update({
        where: { id: toId },
        data: { status: 'OCCUPIED' },
      });

      broadcastEvent('TABLE_UPDATED', { fromTableId: fromId, toTableId: toId, action: 'MOVE' });
      return NextResponse.json({ success: true, message: `ย้ายจากโต๊ะ ${fromId} ไปโต๊ะ ${toId} สำเร็จ` });
    }

    // Action 2: Merge Tables
    if (action === 'MERGE_TABLES') {
      const { sourceTableId, targetTableId } = body;
      const sourceId = Number(sourceTableId);
      const targetId = Number(targetTableId);

      if (!sourceId || !targetId || sourceId === targetId) {
        return NextResponse.json({ error: 'Invalid source or target table' }, { status: 400 });
      }

      await prisma.order.updateMany({
        where: {
          tableId: sourceId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        data: {
          tableId: targetId,
        },
      });

      await prisma.table.update({
        where: { id: sourceId },
        data: { status: 'AVAILABLE', currentSessionId: null },
      });

      broadcastEvent('TABLE_UPDATED', { sourceTableId: sourceId, targetTableId: targetId, action: 'MERGE' });
      return NextResponse.json({ success: true, message: `รวมโต๊ะ ${sourceId} เข้ากับโต๊ะ ${targetId} สำเร็จ` });
    }

    // Action 3: Clear / Reset Table
    if (action === 'CLEAR_TABLE') {
      const { tableId } = body;
      const tId = Number(tableId);

      await prisma.table.update({
        where: { id: tId },
        data: { status: 'AVAILABLE', currentSessionId: null },
      });

      // Mark any dangling unpaid orders as cancelled if forced clear
      if (body.cancelUnpaid) {
        await prisma.order.updateMany({
          where: {
            tableId: tId,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      broadcastEvent('TABLE_UPDATED', { tableId: tId, action: 'CLEAR' });
      return NextResponse.json({ success: true, message: `เคลียร์โต๊ะ ${tId} เรียบร้อย` });
    }

    // Action 4: Customer Call Bill / Request Payment
    if (action === 'CALL_BILL') {
      const { tableId, slipUrl } = body;
      const tId = Number(tableId);

      await prisma.table.update({
        where: { id: tId },
        data: { status: 'PAYMENT_PENDING' },
      });

      if (slipUrl) {
        await prisma.order.updateMany({
          where: {
            tableId: tId,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          data: {
            paymentStatus: 'PENDING_CONFIRMATION',
            paymentMethod: 'PROMPTPAY',
            slipUrl: slipUrl,
          },
        });
      }

      broadcastEvent('TABLE_UPDATED', { tableId: tId, action: 'CALL_BILL', slipUrl });
      return NextResponse.json({ success: true, message: 'ส่งคำขอเช็คบิลไปยังแคชเชียร์เรียบร้อย' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error executing table action:', error);
    return NextResponse.json({ error: 'Failed to process table action' }, { status: 500 });
  }
}

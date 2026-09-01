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

    return NextResponse.json(formattedTables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || (body.name || body.id ? 'CREATE_TABLE' : null);

    if (action === 'SEED_DEFAULTS') {
      await ensureDatabaseSeeded();
      broadcastEvent('TABLE_UPDATED', { type: 'TABLE_SEEDED' });
      return NextResponse.json({ success: true });
    }

    // Action: Create Single Table (supports custom ID & Name)
    if (action === 'CREATE_TABLE' || action === 'CREATE') {
      let requestedId = body.id ? parseInt(body.id, 10) : null;
      const rawName = (body.name || '').trim();

      // If no explicit ID provided, check if name has a number (e.g. "12", "โต๊ะ 12")
      if (!requestedId && rawName) {
        const matchNum = rawName.match(/\d+/);
        if (matchNum) {
          const parsed = parseInt(matchNum[0], 10);
          if (parsed > 0) {
            const existing = await prisma.table.findUnique({ where: { id: parsed } });
            if (!existing) {
              requestedId = parsed;
            }
          }
        }
      }

      // If still no ID or requested ID is in use
      if (requestedId) {
        const existing = await prisma.table.findUnique({ where: { id: requestedId } });
        if (existing) {
          return NextResponse.json(
            { error: `โต๊ะหมายเลข ${requestedId} (${existing.name}) มีอยู่ในระบบแล้ว กรุณาระบุหมายเลขอื่น` },
            { status: 400 }
          );
        }
      } else {
        // Find highest existing ID or first unused ID
        const allTables = await prisma.table.findMany({ select: { id: true } });
        const existingIds = new Set(allTables.map((t) => t.id));
        let nextId = 1;
        while (existingIds.has(nextId)) {
          nextId++;
        }
        requestedId = nextId;
      }

      const tableName = rawName || `โต๊ะ ${requestedId}`;

      const newTable = await prisma.table.create({
        data: {
          id: requestedId,
          name: tableName,
          status: 'AVAILABLE',
        },
      });

      // Update tableCount in settings
      const totalCount = await prisma.table.count();
      await prisma.storeSetting.upsert({
        where: { id: 'default' },
        update: { tableCount: totalCount },
        create: { tableCount: totalCount },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'CREATE', table: newTable });
      return NextResponse.json(newTable);
    }

    // Action: Batch Create Tables
    if (action === 'BATCH_CREATE') {
      const countToAdd = Math.min(50, Math.max(1, parseInt(body.count, 10) || 1));
      const allTables = await prisma.table.findMany({ select: { id: true } });
      const existingIds = new Set(allTables.map((t) => t.id));

      const created: any[] = [];
      let currentId = 1;

      for (let i = 0; i < countToAdd; i++) {
        while (existingIds.has(currentId)) {
          currentId++;
        }
        const newTable = await prisma.table.create({
          data: {
            id: currentId,
            name: `โต๊ะ ${currentId}`,
            status: 'AVAILABLE',
          },
        });
        existingIds.add(currentId);
        created.push(newTable);
      }

      const totalCount = await prisma.table.count();
      await prisma.storeSetting.upsert({
        where: { id: 'default' },
        update: { tableCount: totalCount },
        create: { tableCount: totalCount },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'BATCH_CREATE', tables: created });
      return NextResponse.json({ success: true, count: created.length, tables: created });
    }

    // Action: Set Table Count (e.g. ensure 1..N tables exist)
    if (action === 'SET_TABLE_COUNT') {
      const targetCount = Math.min(100, Math.max(1, parseInt(body.targetCount || body.tableCount, 10) || 10));
      for (let i = 1; i <= targetCount; i++) {
        await prisma.table.upsert({
          where: { id: i },
          update: {},
          create: {
            id: i,
            name: `โต๊ะ ${i}`,
            status: 'AVAILABLE',
          },
        });
      }

      await prisma.storeSetting.upsert({
        where: { id: 'default' },
        update: { tableCount: targetCount },
        create: { tableCount: targetCount },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'SET_TABLE_COUNT', targetCount });
      return NextResponse.json({ success: true, targetCount });
    }

    // Action: Update Table Name / Status
    if (action === 'UPDATE_TABLE') {
      const { tableId, name, status } = body;
      const tId = Number(tableId);

      if (!tId) {
        return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
      }

      const updated = await prisma.table.update({
        where: { id: tId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(status ? { status } : {}),
        },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'UPDATE', table: updated });
      return NextResponse.json(updated);
    }

    // Action: Delete Table
    if (action === 'DELETE_TABLE') {
      const { tableId, force } = body;
      const tId = Number(tableId);

      if (!tId) {
        return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
      }

      // Check if table has active unpaid orders
      const activeOrders = await prisma.order.findMany({
        where: {
          tableId: tId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });

      if (activeOrders.length > 0 && !force) {
        return NextResponse.json(
          { error: `ไม่สามารถลบโต๊ะ ${tId} ได้เนื่องจากมีออเดอร์ที่ยังไม่ปิดบิล (${activeOrders.length} รายการ)` },
          { status: 400 }
        );
      }

      // Delete attached orders and order items to satisfy foreign key
      await prisma.order.deleteMany({
        where: { tableId: tId },
      });

      await prisma.table.delete({
        where: { id: tId },
      });

      // Update tableCount in settings
      const totalCount = await prisma.table.count();
      await prisma.storeSetting.upsert({
        where: { id: 'default' },
        update: { tableCount: totalCount },
        create: { tableCount: totalCount },
      });

      broadcastEvent('TABLE_UPDATED', { action: 'DELETE', tableId: tId });
      return NextResponse.json({ success: true, message: `ลบโต๊ะ ${tId} เรียบร้อย` });
    }

    // Action: Move Table
    if (action === 'MOVE_TABLE') {
      const { fromTableId, toTableId } = body;
      const fromId = Number(fromTableId);
      const toId = Number(toTableId);

      if (!fromId || !toId || fromId === toId) {
        return NextResponse.json({ error: 'Invalid source or target table' }, { status: 400 });
      }

      // Ensure target table exists
      await prisma.table.upsert({
        where: { id: toId },
        update: {},
        create: { id: toId, name: `โต๊ะ ${toId}`, status: 'AVAILABLE' },
      });

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

    // Action: Merge Tables
    if (action === 'MERGE_TABLES') {
      const { sourceTableId, targetTableId } = body;
      const sourceId = Number(sourceTableId);
      const targetId = Number(targetTableId);

      if (!sourceId || !targetId || sourceId === targetId) {
        return NextResponse.json({ error: 'Invalid source or target table' }, { status: 400 });
      }

      // Ensure target table exists
      await prisma.table.upsert({
        where: { id: targetId },
        update: {},
        create: { id: targetId, name: `โต๊ะ ${targetId}`, status: 'AVAILABLE' },
      });

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

    // Action: Clear / Reset Table
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

    // Action: Customer Call Bill / Request Payment
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
  } catch (error: any) {
    console.error('Error executing table action:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process table action' },
      { status: 500 }
    );
  }
}

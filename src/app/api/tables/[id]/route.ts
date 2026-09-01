import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePromptPayPayload } from '@/lib/promptpay';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tableId = parseInt(params.id, 10);
    if (isNaN(tableId)) {
      return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!table) {
      return NextResponse.json({
        table: { id: tableId, name: `โต๊ะ ${tableId}`, status: 'AVAILABLE', orders: [] },
        store: { storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง', promptPayId: '0812345678', promptPayName: 'สมใจ ขายดี' },
        activeOrders: [],
        totalAmount: 0,
        promptPayQrPayload: '',
      });
    }

    const store = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    const activeOrders = table.orders;
    const totalAmount = activeOrders.reduce((sum, order) => sum + order.netAmount, 0);

    // Generate Dynamic PromptPay QR Payload if there is an active bill
    let promptPayQrPayload = '';
    if (store?.promptPayId && totalAmount > 0) {
      promptPayQrPayload = generatePromptPayPayload(store.promptPayId, totalAmount);
    }

    return NextResponse.json({
      table,
      store,
      activeOrders,
      totalAmount,
      promptPayQrPayload,
    });
  } catch (error) {
    console.error('Error fetching table details:', error);
    const tableId = parseInt(params?.id || '1', 10) || 1;
    return NextResponse.json({
      table: { id: tableId, name: `โต๊ะ ${tableId}`, status: 'AVAILABLE', orders: [] },
      store: { storeName: 'กะเพราถาดยายสม & อาหารตามสั่ง', promptPayId: '0812345678', promptPayName: 'สมใจ ขายดี' },
      activeOrders: [],
      totalAmount: 0,
      promptPayQrPayload: '',
    });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(req, params);
}

async function handleUpdate(req: NextRequest, params: { id: string }) {
  try {
    const tableId = parseInt(params.id, 10);
    if (isNaN(tableId)) {
      return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, status } = body;

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
      },
    });

    broadcastEvent('TABLE_UPDATED', { action: 'UPDATE', table: updated });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update table' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tableId = parseInt(params.id, 10);
    if (isNaN(tableId)) {
      return NextResponse.json({ error: 'Invalid Table ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // Check active orders
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    if (activeOrders.length > 0 && !force) {
      return NextResponse.json(
        { error: `ไม่สามารถลบโต๊ะ ${tableId} ได้เนื่องจากมีออเดอร์ค้างอยู่` },
        { status: 400 }
      );
    }

    await prisma.order.deleteMany({
      where: { tableId },
    });

    await prisma.table.delete({
      where: { id: tableId },
    });

    const totalCount = await prisma.table.count();
    await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: { tableCount: totalCount },
      create: { tableCount: totalCount },
    });

    broadcastEvent('TABLE_UPDATED', { action: 'DELETE', tableId });
    return NextResponse.json({ success: true, message: `ลบโต๊ะ ${tableId} สำเร็จ` });
  } catch (error: any) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete table' },
      { status: 500 }
    );
  }
}

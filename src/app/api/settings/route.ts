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
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    return NextResponse.json({
      id: store.id,
      storeName: store.name,
      promptPayId: store.promptPayId,
      promptPayName: store.promptPayName,
      address: store.address,
      phone: store.phone,
      receiptFooter: store.receiptFooter,
      tableCount: store.tableCount,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await req.json();
    const { storeName, promptPayId, promptPayName, address, phone, receiptFooter, tableCount } = body;

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        name: storeName || store.name,
        promptPayId: promptPayId !== undefined ? promptPayId : store.promptPayId,
        promptPayName: promptPayName !== undefined ? promptPayName : store.promptPayName,
        address: address !== undefined ? address : store.address,
        phone: phone !== undefined ? phone : store.phone,
        receiptFooter: receiptFooter !== undefined ? receiptFooter : store.receiptFooter,
        tableCount: Number(tableCount) || store.tableCount,
      },
    });

    broadcastEvent('MENU_UPDATED', { type: 'SETTINGS_UPDATED' }, store.id);
    broadcastEvent('TABLE_UPDATED', { type: 'SETTINGS_UPDATED' }, store.id);

    return NextResponse.json({
      id: updated.id,
      storeName: updated.name,
      promptPayId: updated.promptPayId,
      promptPayName: updated.promptPayName,
      address: updated.address,
      phone: updated.phone,
      receiptFooter: updated.receiptFooter,
      tableCount: updated.tableCount,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

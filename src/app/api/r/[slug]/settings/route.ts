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
      include: {
        plan: true,
      },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    return NextResponse.json({
      id: store.id,
      slug: store.slug,
      storeName: store.name,
      promptPayId: store.promptPayId,
      promptPayName: store.promptPayName,
      address: store.address,
      phone: store.phone,
      receiptFooter: store.receiptFooter,
      tableCount: store.tableCount,
      status: store.status,
      trialEndsAt: store.trialEndsAt,
      subscriptionEnd: store.subscriptionEnd,
      plan: store.plan,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { storeName, promptPayId, promptPayName, address, phone, receiptFooter, tableCount } = body;

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        name: storeName !== undefined ? storeName : store.name,
        promptPayId: promptPayId !== undefined ? promptPayId : store.promptPayId,
        promptPayName: promptPayName !== undefined ? promptPayName : store.promptPayName,
        address: address !== undefined ? address : store.address,
        phone: phone !== undefined ? phone : store.phone,
        receiptFooter: receiptFooter !== undefined ? receiptFooter : store.receiptFooter,
        tableCount: tableCount ? parseInt(tableCount) : store.tableCount,
      },
      include: { plan: true },
    });

    broadcastEvent('TABLE_UPDATED', { action: 'settings_update' }, store.id);

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      storeName: updated.name,
      promptPayId: updated.promptPayId,
      promptPayName: updated.promptPayName,
      address: updated.address,
      phone: updated.phone,
      receiptFooter: updated.receiptFooter,
      tableCount: updated.tableCount,
      status: updated.status,
      trialEndsAt: updated.trialEndsAt,
      subscriptionEnd: updated.subscriptionEnd,
      plan: updated.plan,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

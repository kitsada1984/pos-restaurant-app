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
      linemanGp: store.linemanGp ?? 30,
      grabGp: store.grabGp ?? 30,
      shopeeGp: store.shopeeGp ?? 30,
      robinhoodGp: store.robinhoodGp ?? 20,
      deliveryWebhookSecret: store.deliveryWebhookSecret,
      slipAutoCheckout: store.slipAutoCheckout ?? false,
      slipProvider: store.slipProvider ?? 'HYBRID',
      slipApiKey: store.slipApiKey || '',
      slipBranchId: store.slipBranchId || '',
      bankWebhookKey: store.bankWebhookKey || (await ensureStoreBankKey(store.id)),
      bankAutoCheckout: store.bankAutoCheckout ?? true,
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
    const {
      storeName,
      promptPayId,
      promptPayName,
      address,
      phone,
      receiptFooter,
      tableCount,
      linemanGp,
      grabGp,
      shopeeGp,
      robinhoodGp,
      deliveryWebhookSecret,
      slipAutoCheckout,
      slipProvider,
      slipApiKey,
      slipBranchId,
      bankWebhookKey,
      bankAutoCheckout,
      regenerateBankKey,
    } = body;

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    let effectiveBankKey = store.bankWebhookKey;
    if (regenerateBankKey) {
      effectiveBankKey = generateRandomBankKey();
    } else if (bankWebhookKey !== undefined) {
      effectiveBankKey = bankWebhookKey;
    }

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
        linemanGp: linemanGp !== undefined ? parseFloat(linemanGp) : store.linemanGp,
        grabGp: grabGp !== undefined ? parseFloat(grabGp) : store.grabGp,
        shopeeGp: shopeeGp !== undefined ? parseFloat(shopeeGp) : store.shopeeGp,
        robinhoodGp: robinhoodGp !== undefined ? parseFloat(robinhoodGp) : store.robinhoodGp,
        deliveryWebhookSecret: deliveryWebhookSecret !== undefined ? deliveryWebhookSecret : store.deliveryWebhookSecret,
        slipAutoCheckout: slipAutoCheckout !== undefined ? Boolean(slipAutoCheckout) : store.slipAutoCheckout,
        slipProvider: slipProvider !== undefined ? slipProvider : store.slipProvider,
        slipApiKey: slipApiKey !== undefined ? slipApiKey : store.slipApiKey,
        slipBranchId: slipBranchId !== undefined ? slipBranchId : store.slipBranchId,
        bankWebhookKey: effectiveBankKey,
        bankAutoCheckout: bankAutoCheckout !== undefined ? Boolean(bankAutoCheckout) : store.bankAutoCheckout,
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
      linemanGp: updated.linemanGp,
      grabGp: updated.grabGp,
      shopeeGp: updated.shopeeGp,
      robinhoodGp: updated.robinhoodGp,
      deliveryWebhookSecret: updated.deliveryWebhookSecret,
      slipAutoCheckout: updated.slipAutoCheckout,
      slipProvider: updated.slipProvider,
      slipApiKey: updated.slipApiKey,
      slipBranchId: updated.slipBranchId,
      bankWebhookKey: updated.bankWebhookKey,
      bankAutoCheckout: updated.bankAutoCheckout,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateRandomBankKey(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

async function ensureStoreBankKey(storeId: string): Promise<string> {
  const newKey = generateRandomBankKey();
  await prisma.store.update({
    where: { id: storeId },
    data: { bankWebhookKey: newKey },
  }).catch(() => {});
  return newKey;
}


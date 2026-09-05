import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, linemanGp: true, deliveryWebhookSecret: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check optional webhook secret header if configured
    const authHeader = request.headers.get('x-lineman-signature') || request.headers.get('authorization');
    if (store.deliveryWebhookSecret && authHeader && !authHeader.includes(store.deliveryWebhookSecret)) {
      return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
    }

    const payload = await request.json();

    // Parse LINE MAN order payload
    const deliveryOrderId = payload.orderId || payload.order_id || payload.id || `LM-${Date.now().toString().slice(-4)}`;
    const riderName = payload.rider?.name || payload.driver?.name || 'LINE MAN Rider';
    const riderPhone = payload.rider?.phone || payload.driver?.phone || null;
    const customerName = payload.customer?.name || 'ลูกค้า LINE MAN';
    const note = payload.note || payload.remarks || '';

    const rawItems = payload.items || payload.order_items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    // Match store menu items by name or ID
    const storeMenuItems = await prisma.menuItem.findMany({
      where: { storeId: store.id },
      include: { recipes: { include: { ingredient: true } } },
    });

    let totalAmount = 0;
    const orderItemsData: any[] = [];
    const stockDeductions: { ingredientId: string; qty: number; cost: number }[] = [];
    let totalCost = 0;

    for (const item of rawItems) {
      const itemName = item.name || item.title || 'อาหารตามสั่ง';
      const itemPrice = parseFloat(item.price || item.unit_price || 50);
      const quantity = parseInt(item.quantity || item.qty || 1);
      const itemTotal = itemPrice * quantity;
      totalAmount += itemTotal;

      const matchedMenuItem = storeMenuItems.find(
        (m) => m.name.toLowerCase().trim() === itemName.toLowerCase().trim() || m.id === item.menuItemId
      );

      orderItemsData.push({
        menuItemId: matchedMenuItem?.id || null,
        name: itemName,
        price: itemPrice,
        quantity,
        selectedOptions: item.options ? JSON.stringify(item.options) : null,
        specialNote: item.instruction || item.special_note || null,
        status: 'PENDING',
      });

      if (matchedMenuItem?.recipes) {
        for (const r of matchedMenuItem.recipes) {
          const deductQty = r.quantity * quantity;
          const cost = deductQty * (r.ingredient?.costPerUnit || 0);
          totalCost += cost;
          stockDeductions.push({ ingredientId: r.ingredientId, qty: deductQty, cost });
        }
      }
    }

    const gpPercent = store.linemanGp ?? 30;
    const gpAmount = (totalAmount * gpPercent) / 100;
    const netRevenue = totalAmount - gpAmount;

    // Create Order in Database
    const newOrder = await prisma.order.create({
      data: {
        storeId: store.id,
        tableNo: 0,
        orderType: 'TAKEAWAY',
        orderChannel: 'LINEMAN',
        deliveryOrderId,
        riderName,
        riderPhone,
        totalAmount,
        discountAmount: 0,
        netAmount: totalAmount,
        gpPercent,
        gpAmount,
        netRevenue,
        costAmount: totalCost,
        note,
        customerName,
        paymentMethod: 'PROMPTPAY',
        paymentStatus: 'PAID',
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Execute Recipe BOM stock deductions
    (async () => {
      try {
        for (const ded of stockDeductions) {
          await prisma.ingredient.update({
            where: { id: ded.ingredientId },
            data: { currentStock: { decrement: ded.qty } },
          });

          await prisma.stockLog.create({
            data: {
              storeId: store.id,
              ingredientId: ded.ingredientId,
              changeQty: -ded.qty,
              reason: 'ORDER',
              note: `ตัดสต็อกออเดอร์ LINE MAN (${deliveryOrderId})`,
              cost: ded.cost,
            },
          });
        }
      } catch (err) {
        console.error('Stock deduction error for LINE MAN:', err);
      }
    })();

    // Broadcast Real-time Event to Kitchen KDS & POS
    broadcastEvent('ORDER_CREATED', newOrder, store.id);

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      deliveryOrderId,
      status: 'ACCEPTED',
    });
  } catch (error: any) {
    console.error('LINE MAN Webhook Error:', error);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
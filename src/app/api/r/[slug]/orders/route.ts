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
      select: { id: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const { searchParams } = new URL(request.url);
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

    if (statusParam) {
      where.status = statusParam;
    } else {
      where.status = {
        in: ['PENDING', 'COOKING', 'READY', 'SERVED'],
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        pointsRate: true,
        linemanGp: true,
        grabGp: true,
        shopeeGp: true,
        robinhoodGp: true,
      },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const {
      tableId,
      items,
      orderType = 'DINE_IN',
      orderChannel = 'DINE_IN',
      deliveryOrderId,
      riderName,
      riderPhone,
      gpPercent: customGpPercent,
      note,
      customerName,
      customerLineId,
      memberPhone,
      promoCode,
      discountAmount = 0,
      pointsRedeemed = 0,
    } = body;

    // BUG-002 Guard: Reject empty orders
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    const isDelivery = ['LINEMAN', 'GRAB', 'SHOPEE_FOOD', 'ROBINHOOD'].includes(orderChannel);
    const tableNo = parseInt(tableId || (isDelivery ? 0 : 1));

    // Upsert table for this store if dine-in
    let table: any = null;
    if (tableNo > 0) {
      table = await prisma.table.upsert({
        where: {
          storeId_tableNo: {
            storeId: store.id,
            tableNo,
          },
        },
        update: {
          ...(orderChannel === 'DINE_IN' && { status: 'OCCUPIED' }),
        },
        create: {
          storeId: store.id,
          tableNo,
          name: `โต๊ะ ${tableNo}`,
          status: orderChannel === 'DINE_IN' ? 'OCCUPIED' : 'AVAILABLE',
        },
      });
    }

    // 1. Calculate total amount & order items
    let totalAmount = 0;
    const orderItemsData = items.map((item: any) => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;

      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
        specialNote: item.specialNote || null,
        status: 'PENDING',
      };
    });

    const netAmount = Math.max(0, totalAmount - Number(discountAmount));

    // Calculate GP% and Net Revenue for Delivery Channels
    let gpPercent = 0;
    if (customGpPercent !== undefined && !isNaN(Number(customGpPercent))) {
      gpPercent = Number(customGpPercent);
    } else if (orderChannel === 'LINEMAN') {
      gpPercent = store.linemanGp ?? 30;
    } else if (orderChannel === 'GRAB') {
      gpPercent = store.grabGp ?? 30;
    } else if (orderChannel === 'SHOPEE_FOOD') {
      gpPercent = store.shopeeGp ?? 30;
    } else if (orderChannel === 'ROBINHOOD') {
      gpPercent = store.robinhoodGp ?? 20;
    }

    const gpAmount = isDelivery ? (netAmount * gpPercent) / 100 : 0;
    const netRevenue = isDelivery ? netAmount - gpAmount : netAmount;

    // 2. Enterprise Recipe BOM & Real-time Stock Deduction
    const menuItemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    const recipes = await prisma.menuItemRecipe.findMany({
      where: { menuItemId: { in: menuItemIds } },
      include: { ingredient: true },
    });

    let totalCost = 0;
    const stockDeductions: { ingredientId: string; qty: number; cost: number }[] = [];

    for (const orderItem of items) {
      const itemRecipes = recipes.filter((r) => r.menuItemId === orderItem.menuItemId);
      for (const r of itemRecipes) {
        const deductQty = r.quantity * (orderItem.quantity || 1);
        const cost = deductQty * (r.ingredient?.costPerUnit || 0);
        totalCost += cost;
        stockDeductions.push({ ingredientId: r.ingredientId, qty: deductQty, cost });
      }
    }

    // 3. Create Order
    const newOrder = await prisma.order.create({
      data: {
        storeId: store.id,
        tableId: table?.id || null,
        tableNo: table?.tableNo || 0,
        orderType: orderType || (isDelivery ? 'TAKEAWAY' : 'DINE_IN'),
        orderChannel: orderChannel || 'DINE_IN',
        deliveryOrderId: deliveryOrderId || null,
        riderName: riderName || null,
        riderPhone: riderPhone || null,
        totalAmount,
        discountAmount: Number(discountAmount),
        netAmount,
        gpPercent,
        gpAmount,
        netRevenue,
        costAmount: totalCost,
        memberPhone: memberPhone ? memberPhone.replace(/\D/g, '') : null,
        promoCode: promoCode ? promoCode.toUpperCase().trim() : null,
        pointsRedeemed: Number(pointsRedeemed) || 0,
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

    // 4. Execute Real-time Stock Deductions & Depletion Triggers asynchronously
    (async () => {
      try {
        for (const ded of stockDeductions) {
          const updatedIng = await prisma.ingredient.update({
            where: { id: ded.ingredientId },
            data: { currentStock: { decrement: ded.qty } },
          });

          await prisma.stockLog.create({
            data: {
              storeId: store.id,
              ingredientId: ded.ingredientId,
              changeQty: -ded.qty,
              reason: 'ORDER',
              note: `ตัดสต็อกออเดอร์โต๊ะ ${table.tableNo} (#${newOrder.id.slice(-4)})`,
              cost: ded.cost,
            },
          });

          // Auto-disable dish if ingredient is completely out of stock
          if (updatedIng.currentStock <= 0) {
            const affectedItemIds = recipes
              .filter((r) => r.ingredientId === ded.ingredientId)
              .map((r) => r.menuItemId);

            if (affectedItemIds.length > 0) {
              await prisma.menuItem.updateMany({
                where: { id: { in: affectedItemIds } },
                data: { isAvailable: false },
              });
              broadcastEvent('MENU_UPDATED', { affectedItemIds, isAvailable: false }, store.id);
            }
          }
        }
      } catch (stockErr) {
        console.error('Error executing stock deduction:', stockErr);
      }
    })();

    // Broadcast SSE realtime events
    broadcastEvent('ORDER_CREATED', newOrder, store.id);
    broadcastEvent('TABLE_UPDATED', { tableNo: table.tableNo, status: 'OCCUPIED' }, store.id);

    return NextResponse.json(newOrder);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}

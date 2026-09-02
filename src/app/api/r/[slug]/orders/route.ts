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
      select: { id: true, name: true, pointsRate: true },
    });

    if (!store) return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });

    const body = await request.json();
    const {
      tableId,
      items,
      orderType,
      note,
      customerName,
      customerLineId,
      memberPhone,
      promoCode,
      discountAmount = 0,
      pointsRedeemed = 0,
    } = body;

    const tableNo = parseInt(tableId || 1);

    // Upsert table for this store
    const table = await prisma.table.upsert({
      where: {
        storeId_tableNo: {
          storeId: store.id,
          tableNo,
        },
      },
      update: {
        status: 'OCCUPIED',
      },
      create: {
        storeId: store.id,
        tableNo,
        name: `โต๊ะ ${tableNo}`,
        status: 'OCCUPIED',
      },
    });

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
        tableId: table.id,
        tableNo: table.tableNo,
        orderType: orderType || 'DINE_IN',
        totalAmount,
        discountAmount: Number(discountAmount),
        netAmount,
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

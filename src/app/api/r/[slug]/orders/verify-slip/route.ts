import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';
import {
  parseBankSlipQr,
  verifyWithSlipOK,
  verifyWithEasySlip,
  ParsedSlipData,
} from '@/lib/slip-verifier';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        promptPayId: true,
        pointsRate: true,
        pointValue: true,
        slipAutoCheckout: true,
        slipProvider: true,
        slipApiKey: true,
        slipBranchId: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
    }

    const body = await request.json();
    const {
      orderId,
      tableId,
      tableNo,
      qrPayload,
      slipImage,
      manualConfirm = false,
      note,
    } = body;

    // ค้นหาออเดอร์
    let order: any = null;
    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { table: true, items: true },
      });
    } else if (tableId || tableNo) {
      order = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          OR: [
            { tableId: tableId ? String(tableId) : undefined },
            { tableNo: tableNo ? parseInt(tableNo) : undefined },
          ],
          paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { table: true, items: true },
      });
    }

    if (!order || order.storeId !== store.id) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์ที่ต้องการตรวจสอบ' }, { status: 404 });
    }

    // ป้องกันการชำระเงินซ้ำ
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'ออเดอร์นี้ได้รับการชำระเงินเรียบร้อยแล้ว' },
        { status: 400 }
      );
    }

    let parsed: ParsedSlipData | null = null;

    // 1. ถอดรหัส Mini-QR จากสลิป
    if (qrPayload && typeof qrPayload === 'string' && qrPayload.trim().length > 5) {
      // ตรวจสอบผ่าน SlipOK หรือ EasySlip ถ้ามี API Key
      if (store.slipApiKey && store.slipProvider === 'SLIPOK') {
        parsed = await verifyWithSlipOK(store.slipApiKey, qrPayload, store.slipBranchId || undefined);
      } else if (store.slipApiKey && store.slipProvider === 'EASYSLIP') {
        parsed = await verifyWithEasySlip(store.slipApiKey, qrPayload);
      }

      // ถ้าไม่มี API Key หรือยิงไม่ผ่าน ให้ใช้ Built-in Local Parser
      if (!parsed) {
        parsed = parseBankSlipQr(qrPayload);
      }
    }

    // 2. ตรวจสอบการใช้สลิปซ้ำ (Anti-Fraud Duplicate Prevention)
    if (parsed && parsed.slipRef) {
      const duplicateOrder = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          slipRef: parsed.slipRef,
          id: { not: order.id },
          paymentStatus: 'PAID',
        },
      });

      if (duplicateOrder) {
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            error: `⚠️ สลิปนี้เคยถูกใช้งานและปิดบิลไปแล้วในระบบ (ออเดอร์ #${duplicateOrder.id.slice(-4)}) ไม่อนุญาตให้ใช้ซ้ำเพื่อความปลอดภัย`,
            parsed,
          },
          { status: 400 }
        );
      }
    }

    // 3. ตรวจสอบความถูกต้องของยอดเงิน
    let isAmountMismatch = false;
    if (parsed && parsed.amount !== undefined) {
      const diff = Math.abs(parsed.amount - order.netAmount);
      if (diff > 1) {
        isAmountMismatch = true;
        // หากไม่ใช่การกดยืนยันด้วยมือ ให้แจ้งเตือนยอดไม่ตรง
        if (!manualConfirm) {
          return NextResponse.json(
            {
              success: false,
              isAmountMismatch: true,
              slipAmount: parsed.amount,
              netAmount: order.netAmount,
              error: `⚠️ ยอดเงินในสลิป (฿${parsed.amount.toLocaleString()}) ไม่ตรงกับยอดบิลที่ต้องชำระ (฿${order.netAmount.toLocaleString()})`,
              parsed,
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. ตัดสินใจว่าจะปิดบิลอัตโนมัติ หรือ บันทึกรอแคชเชียร์ยืนยัน
    // ทำการปิดบิลทันทีเมื่อ:
    // - manualConfirm === true (แคชเชียร์กดปุ่ม "บันทึกมือ")
    // - หรือ store.slipAutoCheckout === true และสลิปผ่านการตรวจ (parsed.isValid && !isAmountMismatch)
    const shouldAutoClose =
      manualConfirm ||
      (store.slipAutoCheckout && parsed?.isValid && !isAmountMismatch);

    const effectiveSlipRef =
      parsed?.slipRef || (manualConfirm ? `MANUAL_${Date.now()}_${order.id.slice(-4)}` : null);

    if (shouldAutoClose) {
      // ปิดบิลทันที
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: 'PROMPTPAY',
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          slipUrl: slipImage || order.slipUrl,
          slipRef: effectiveSlipRef,
          slipAmount: parsed?.amount || order.netAmount,
          slipVerifiedAt: new Date(),
          slipVerifiedBy: manualConfirm ? 'MANUAL' : 'AUTO',
          slipRawData: parsed ? JSON.stringify(parsed) : null,
          paidAt: new Date(),
          note: note || order.note,
        },
        include: {
          table: true,
          items: true,
        },
      });

      // จัดการสะสมแต้มให้ลูกค้าสมาชิก
      if (updatedOrder.memberPhone && store.pointsRate > 0) {
        const pointsEarned = Math.floor(updatedOrder.netAmount / store.pointsRate);
        const pointsRedeemed = updatedOrder.pointsRedeemed || 0;
        const netPointsChange = pointsEarned - pointsRedeemed;

        await prisma.customerMember.upsert({
          where: {
            storeId_phone: {
              storeId: store.id,
              phone: updatedOrder.memberPhone,
            },
          },
          update: {
            points: { increment: netPointsChange },
            totalSpent: { increment: updatedOrder.netAmount },
            visitCount: { increment: 1 },
          },
          create: {
            storeId: store.id,
            phone: updatedOrder.memberPhone,
            name: updatedOrder.customerName || 'สมาชิก',
            points: Math.max(0, netPointsChange),
            totalSpent: updatedOrder.netAmount,
            visitCount: 1,
          },
        }).catch((err) => console.error('Error updating loyalty member:', err));
      }

      // เคลียร์สถานะโต๊ะเป็น AVAILABLE ถ้าไม่มีออเดอร์ค้างชำระอื่น
      if (updatedOrder.tableId) {
        const remainingOrders = await prisma.order.count({
          where: {
            storeId: store.id,
            tableId: updatedOrder.tableId,
            id: { not: updatedOrder.id },
            paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          },
        });

        if (remainingOrders === 0) {
          await prisma.table.update({
            where: { id: updatedOrder.tableId },
            data: {
              status: 'AVAILABLE',
              currentSessionId: null,
            },
          });
          broadcastEvent(
            'TABLE_UPDATED',
            { tableNo: updatedOrder.tableNo, status: 'AVAILABLE' },
            store.id
          );
        }
      }

      broadcastEvent('PAYMENT_RECEIVED', updatedOrder, store.id);
      broadcastEvent('ORDER_UPDATED', updatedOrder, store.id);

      return NextResponse.json({
        success: true,
        isPaid: true,
        message: manualConfirm
          ? 'บันทึกปิดบิลด้วยสลิปสำเร็จเรียบร้อยแล้ว ✅'
          : 'ตรวจสอบสลิปถูกต้อง และปิดบิลให้อัตโนมัติเรียบร้อยแล้ว 🎉',
        order: updatedOrder,
        parsed,
      });
    } else {
      // ยังไม่ปิดบิล: บันทึกรูปสลิปและผลตรวจเป็น PENDING_CONFIRMATION เพื่อรอแคชเชียร์ตรวจสอบ
      const pendingOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: 'PROMPTPAY',
          paymentStatus: 'PENDING_CONFIRMATION',
          slipUrl: slipImage || order.slipUrl,
          slipRef: effectiveSlipRef,
          slipAmount: parsed?.amount || null,
          slipRawData: parsed ? JSON.stringify(parsed) : null,
        },
        include: {
          table: true,
          items: true,
        },
      });

      // ส่งสัญญาณ SSE แจ้งเตือนหน้าจอ POS ของแคชเชียร์
      broadcastEvent(
        'SLIP_SUBMITTED',
        {
          orderId: order.id,
          tableNo: order.tableNo,
          slipUrl: slipImage || order.slipUrl,
          amount: parsed?.amount || order.netAmount,
          parsed,
        },
        store.id
      );
      broadcastEvent('ORDER_UPDATED', pendingOrder, store.id);

      return NextResponse.json({
        success: true,
        isPaid: false,
        isPendingConfirmation: true,
        message: 'ส่งสลิปเรียบร้อยแล้ว แจ้งเตือนแคชเชียร์เพื่อตรวจสอบแล้ว 🔔',
        order: pendingOrder,
        parsed,
      });
    }
  } catch (error: any) {
    console.error('Error verifying slip:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' },
      { status: 500 }
    );
  }
}

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
      discountAmount = 0,
      memberPhone,
      pointsRedeemed = 0,
      promoCode,
    } = body;

    // ค้นหาออเดอร์
    let order: any = null;
    const parsedTableNo = tableNo !== undefined && tableNo !== null && !isNaN(parseInt(String(tableNo), 10))
      ? parseInt(String(tableNo), 10)
      : undefined;

    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { table: true, items: true },
      });
    } else if (tableId || parsedTableNo !== undefined) {
      order = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          OR: [
            { tableId: tableId ? String(tableId) : undefined },
            { tableNo: parsedTableNo },
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

    // ป้องกันการชำระเงินซ้ำถ้าออเดอร์ปิดบิลไปแล้ว
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'ออเดอร์นี้ได้รับการชำระเงินเรียบร้อยแล้ว' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีออเดอร์ค้างชำระในโต๊ะนี้ทั้งหมดกี่รายการ (สำหรับโต๊ะที่สั่งอาหารหลายรอบ)
    let tableOrders: any[] = [order];
    if (order.tableId) {
      const activeInTable = await prisma.order.findMany({
        where: {
          storeId: store.id,
          tableId: order.tableId,
          paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          status: { in: ['PENDING', 'COOKING', 'READY', 'SERVED'] },
        },
        include: { table: true, items: true },
        orderBy: { createdAt: 'asc' },
      });
      if (activeInTable.length > 0) {
        tableOrders = activeInTable;
      }
    }
    const totalTableAmount = tableOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
    const numericDiscount = Number(discountAmount) || 0;
    const effectiveTableAmount = Math.max(0, totalTableAmount - numericDiscount);
    const effectiveOrderAmount = Math.max(0, order.netAmount - numericDiscount);

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

    // 2. ตรวจสอบการใช้สลิปซ้ำ (Anti-Fraud Duplicate Prevention - เช็คทั้ง PAID และ PENDING_CONFIRMATION)
    if (parsed && parsed.slipRef) {
      const currentOrderIds = tableOrders.map((o) => o.id);
      const duplicateOrder = await prisma.order.findFirst({
        where: {
          storeId: store.id,
          slipRef: parsed.slipRef,
          id: { notIn: currentOrderIds },
          paymentStatus: { in: ['PAID', 'PENDING_CONFIRMATION'] },
        },
      });

      if (duplicateOrder) {
        const isPaidDup = duplicateOrder.paymentStatus === 'PAID';
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            error: isPaidDup
              ? `⚠️ สลิปนี้เคยถูกใช้งานและปิดบิลไปแล้วในระบบ (ออเดอร์ #${duplicateOrder.id.slice(-4)}) ไม่อนุญาตให้ใช้ซ้ำเพื่อความปลอดภัย`
              : `⚠️ สลิปนี้มีประวัติถูกส่งเข้าระบบแล้ว (ออเดอร์ #${duplicateOrder.id.slice(-4)}) กำลังรอตรวจสอบ ไม่อนุญาตให้ส่งซ้ำ`,
            parsed,
          },
          { status: 400 }
        );
      }
    }

    // 3. ตรวจสอบบัญชีผู้รับเงิน (ป้องกันสลิปโอนไปบัญชีอื่น/คนอื่น)
    if (parsed?.receiverAccount && store.promptPayId) {
      const cleanStorePay = store.promptPayId.replace(/\D/g, '');
      const cleanSlipReceiver = parsed.receiverAccount.replace(/\D/g, '');
      if (cleanStorePay.length >= 4 && cleanSlipReceiver.length >= 4) {
        const isReceiverMatch =
          cleanStorePay.endsWith(cleanSlipReceiver) ||
          cleanSlipReceiver.endsWith(cleanStorePay) ||
          cleanStorePay.includes(cleanSlipReceiver) ||
          cleanSlipReceiver.includes(cleanStorePay);

        if (!isReceiverMatch && !manualConfirm) {
          return NextResponse.json(
            {
              success: false,
              isReceiverMismatch: true,
              error: `⚠️ บัญชีผู้รับเงินในสลิป (${parsed.receiverAccount} ${parsed.receiverName || ''}) ไม่ตรงกับเบอร์พร้อมเพย์ของร้าน (${store.promptPayId}) กรุณาตรวจทาน`,
              parsed,
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. ตรวจสอบความถูกต้องของยอดเงิน (เปรียบเทียบกับยอดบิลออเดอร์เดี่ยว หรือ ยอดรวมทั้งโต๊ะ หลังหักส่วนลด)
    let isAmountMismatch = false;
    let isTableSettlement = false;

    if (parsed && parsed.amount !== undefined) {
      const diffSingle = Math.abs(parsed.amount - effectiveOrderAmount);
      const diffTable = Math.abs(parsed.amount - effectiveTableAmount);

      if (diffTable <= 1 && tableOrders.length > 1) {
        // ยอดสลิปตรงกับยอดรวมทุกออเดอร์ของโต๊ะ
        isTableSettlement = true;
      } else if (diffSingle <= 1) {
        // ยอดสลิปตรงกับออเดอร์เดี่ยวนี้
        isTableSettlement = false;
      } else {
        isAmountMismatch = true;
        if (!manualConfirm) {
          const expectedStr =
            tableOrders.length > 1
              ? `฿${effectiveTableAmount.toLocaleString()} (ยอดรวมโต๊ะ${numericDiscount > 0 ? 'หักส่วนลด' : ''}) หรือ ฿${effectiveOrderAmount.toLocaleString()} (ยอดออเดอร์${numericDiscount > 0 ? 'หักส่วนลด' : ''})`
              : `฿${effectiveOrderAmount.toLocaleString()}`;
          return NextResponse.json(
            {
              success: false,
              isAmountMismatch: true,
              slipAmount: parsed.amount,
              netAmount: tableOrders.length > 1 ? effectiveTableAmount : effectiveOrderAmount,
              error: `⚠️ ยอดเงินในสลิป (฿${parsed.amount.toLocaleString()}) ไม่ตรงกับยอดบิลที่ต้องชำระ (${expectedStr})`,
              parsed,
            },
            { status: 400 }
          );
        }
      }
    } else if (tableOrders.length > 1) {
      // ไม่มีข้อมูล amount ในสลิป แต่เป็นการชำระโต๊ะที่มีหลายออเดอร์
      isTableSettlement = true;
    }

    // 5. ตัดสินใจว่าจะปิดบิลอัตโนมัติ หรือ บันทึกรอแคชเชียร์ยืนยัน
    const shouldAutoClose =
      manualConfirm ||
      (store.slipAutoCheckout && parsed?.isValid && !isAmountMismatch);

    const effectiveSlipRef =
      parsed?.slipRef || (manualConfirm ? `MANUAL_${Date.now()}_${order.id.slice(-4)}` : null);

    const ordersToProcess = (isTableSettlement && tableOrders.length > 1) ? tableOrders : [order];

    if (shouldAutoClose) {
      // ปิดบิลออเดอร์ที่เกี่ยวข้องทั้งหมด
      const updatedOrders: any[] = [];
      for (let i = 0; i < ordersToProcess.length; i++) {
        const o = ordersToProcess[i];
        const isPrimary = i === 0;
        const newDiscount = isPrimary && numericDiscount > 0
          ? (o.discountAmount || 0) + numericDiscount
          : (o.discountAmount || 0);
        const newNetAmount = Math.max(0, o.totalAmount - newDiscount);

        const updated = await prisma.order.update({
          where: { id: o.id },
          data: {
            paymentMethod: 'PROMPTPAY',
            paymentStatus: 'PAID',
            status: 'COMPLETED',
            discountAmount: newDiscount,
            netAmount: newNetAmount,
            memberPhone: isPrimary && memberPhone ? memberPhone.replace(/\D/g, '') : o.memberPhone,
            pointsRedeemed: isPrimary && Number(pointsRedeemed) ? Number(pointsRedeemed) : o.pointsRedeemed,
            promoCode: isPrimary && promoCode ? String(promoCode).toUpperCase().trim() : o.promoCode,
            slipUrl: slipImage || o.slipUrl,
            slipRef: effectiveSlipRef ? `${effectiveSlipRef}${ordersToProcess.length > 1 ? `_${i + 1}` : ''}` : null,
            slipAmount: ordersToProcess.length === 1 ? (parsed?.amount || newNetAmount) : newNetAmount,
            slipVerifiedAt: new Date(),
            slipVerifiedBy: manualConfirm ? 'MANUAL' : 'AUTO',
            slipRawData: parsed ? JSON.stringify(parsed) : null,
            paidAt: new Date(),
            note: o.id === order.id ? (note || o.note) : o.note,
          },
          include: {
            table: true,
            items: true,
          },
        });
        updatedOrders.push(updated);
      }

      const primaryUpdatedOrder = updatedOrders[0];

      // จัดการโปรโมชั่นการใช้งาน
      if (promoCode) {
        await prisma.promotion.updateMany({
          where: { storeId: store.id, code: String(promoCode).toUpperCase().trim() },
          data: { usageCount: { increment: 1 } },
        }).catch(() => {});
      }

      // จัดการแต้มสะสมสมาชิก (รวมยอดใช้จ่ายทั้งหมดที่ชำระในรอบนี้)
      const targetPhone = (memberPhone ? memberPhone.replace(/\D/g, '') : null) || updatedOrders.find((o) => o.memberPhone)?.memberPhone;
      if (targetPhone && store.pointsRate > 0) {
        const totalPaidNet = updatedOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0);
        const totalRedeemed = updatedOrders.reduce((sum, o) => sum + (o.pointsRedeemed || 0), 0);
        const pointsEarned = Math.floor(totalPaidNet / store.pointsRate);
        const netPointsChange = pointsEarned - totalRedeemed;

        await prisma.customerMember.upsert({
          where: {
            storeId_phone: {
              storeId: store.id,
              phone: targetPhone,
            },
          },
          update: {
            points: { increment: netPointsChange },
            totalSpent: { increment: totalPaidNet },
            visitCount: { increment: 1 },
          },
          create: {
            storeId: store.id,
            phone: targetPhone,
            name: primaryUpdatedOrder.customerName || 'สมาชิก',
            points: Math.max(0, netPointsChange),
            totalSpent: totalPaidNet,
            visitCount: 1,
          },
        }).catch((err) => console.error('Error updating loyalty member:', err));
      }

      // เคลียร์สถานะโต๊ะเป็น AVAILABLE ถ้าไม่มีออเดอร์ค้างชำระอื่นเหลืออยู่
      if (primaryUpdatedOrder.tableId) {
        const remainingOrders = await prisma.order.count({
          where: {
            storeId: store.id,
            tableId: primaryUpdatedOrder.tableId,
            id: { notIn: updatedOrders.map((o) => o.id) },
            paymentStatus: { in: ['UNPAID', 'PENDING_CONFIRMATION'] },
          },
        });

        if (remainingOrders === 0) {
          await prisma.table.update({
            where: { id: primaryUpdatedOrder.tableId },
            data: {
              status: 'AVAILABLE',
              currentSessionId: null,
            },
          });
          broadcastEvent(
            'TABLE_UPDATED',
            { tableNo: primaryUpdatedOrder.tableNo, status: 'AVAILABLE' },
            store.id
          );
        }
      }

      for (const o of updatedOrders) {
        broadcastEvent('PAYMENT_RECEIVED', o, store.id);
        broadcastEvent('ORDER_UPDATED', o, store.id);
      }

      return NextResponse.json({
        success: true,
        isPaid: true,
        message: manualConfirm
          ? `บันทึกปิดบิลด้วยสลิปสำเร็จเรียบร้อยแล้ว (${updatedOrders.length} รายการบิล) ✅`
          : `ตรวจสอบสลิปถูกต้อง และปิดบิลให้อัตโนมัติเรียบร้อยแล้ว (${updatedOrders.length} รายการบิล) 🎉`,
        order: primaryUpdatedOrder,
        orders: updatedOrders,
        parsed,
      });
    } else {
      // ยังไม่ปิดบิล: บันทึกรูปสลิปและผลตรวจเป็น PENDING_CONFIRMATION
      const pendingOrders: any[] = [];
      for (const o of ordersToProcess) {
        const pending = await prisma.order.update({
          where: { id: o.id },
          data: {
            paymentMethod: 'PROMPTPAY',
            paymentStatus: 'PENDING_CONFIRMATION',
            slipUrl: slipImage || o.slipUrl,
            slipRef: effectiveSlipRef,
            slipAmount: parsed?.amount || null,
            slipRawData: parsed ? JSON.stringify(parsed) : null,
          },
          include: {
            table: true,
            items: true,
          },
        });
        pendingOrders.push(pending);
      }

      const primaryPending = pendingOrders[0];

      // ส่งสัญญาณ SSE แจ้งเตือนหน้าจอ POS ของแคชเชียร์
      broadcastEvent(
        'SLIP_SUBMITTED',
        {
          orderId: primaryPending.id,
          tableNo: primaryPending.tableNo,
          slipUrl: slipImage || primaryPending.slipUrl,
          amount: parsed?.amount || (isTableSettlement ? totalTableAmount : primaryPending.netAmount),
          parsed,
        },
        store.id
      );

      for (const o of pendingOrders) {
        broadcastEvent('ORDER_UPDATED', o, store.id);
      }

      return NextResponse.json({
        success: true,
        isPaid: false,
        isPendingConfirmation: true,
        message: 'ส่งสลิปเรียบร้อยแล้ว แจ้งเตือนแคชเชียร์เพื่อตรวจสอบแล้ว 🔔',
        order: primaryPending,
        orders: pendingOrders,
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

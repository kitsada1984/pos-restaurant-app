import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'ไม่พบร้านค้านี้' }, { status: 404 });
    }

    const body = await request.json();
    const { tableNo, tableName, requestType, note } = body;

    const callPayload = {
      id: `call_${Date.now()}_${tableNo || 'table'}`,
      tableNo: Number(tableNo) || 1,
      tableName: tableName || (tableNo ? `โต๊ะ ${tableNo}` : 'โต๊ะอาหาร'),
      requestType: requestType || 'เรียกพนักงาน',
      note: note || '',
      timestamp: Date.now(),
    };

    // Broadcast event to store SSE subscribers (Cashier POS)
    broadcastEvent('SERVICE_CALLED', callPayload, store.id);

    return NextResponse.json({
      success: true,
      message: 'แจ้งพนักงานเรียบร้อยแล้ว พนักงานกำลังมาให้บริการครับ',
      call: callPayload,
    });
  } catch (error: any) {
    console.error('Error handling service call:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเรียกพนักงาน' },
      { status: 500 }
    );
  }
}

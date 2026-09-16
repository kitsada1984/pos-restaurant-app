import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

async function getDefaultStore() {
  let store = await prisma.store.findFirst({ where: { slug: 'lung-pa' } });
  if (!store) store = await prisma.store.findFirst();
  return store;
}

export async function GET() {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ calls: [] });

    const tables = await prisma.table.findMany({
      where: {
        storeId: store.id,
        currentSessionId: { contains: 'serviceCall' },
      },
      select: {
        tableNo: true,
        name: true,
        currentSessionId: true,
      },
      orderBy: { tableNo: 'asc' },
    });

    const calls: any[] = [];
    tables.forEach((t) => {
      if (t.currentSessionId) {
        try {
          const parsed = JSON.parse(t.currentSessionId);
          if (parsed && parsed.serviceCall) {
            calls.push(parsed.serviceCall);
          }
        } catch (e) {}
      }
    });

    return NextResponse.json({ success: true, calls });
  } catch (error) {
    return NextResponse.json({ calls: [] });
  }
}

export async function POST(request: Request) {
  try {
    const store = await getDefaultStore();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await request.json();

    if (body.action === 'DISMISS' || body.action === 'DISMISS_ALL') {
      if (body.tableNo) {
        await prisma.table.updateMany({
          where: {
            storeId: store.id,
            tableNo: Number(body.tableNo),
          },
          data: { currentSessionId: null },
        });
      } else {
        await prisma.table.updateMany({
          where: {
            storeId: store.id,
            currentSessionId: { contains: 'serviceCall' },
          },
          data: { currentSessionId: null },
        });
      }
      return NextResponse.json({ success: true });
    }

    const { tableNo, tableName, requestType, note } = body;
    const callPayload = {
      id: `call_${Date.now()}_${tableNo || 'table'}`,
      tableNo: Number(tableNo) || 1,
      tableName: tableName || (tableNo ? `โต๊ะ ${tableNo}` : 'โต๊ะอาหาร'),
      requestType: requestType || 'เรียกพนักงาน',
      note: note || '',
      timestamp: Date.now(),
    };

    await prisma.table.updateMany({
      where: {
        storeId: store.id,
        tableNo: Number(tableNo) || 1,
      },
      data: {
        currentSessionId: JSON.stringify({
          serviceCall: callPayload,
        }),
      },
    });

    broadcastEvent('SERVICE_CALLED', callPayload, store.id);

    return NextResponse.json({
      success: true,
      message: 'แจ้งพนักงานเรียบร้อยแล้ว',
      call: callPayload,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import {
  deleteAuthorizationRecords,
  recordAdminEvent,
} from '@/lib/admin-data';

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    receiptIds?: unknown;
  } | null;
  const requestedIds = Array.isArray(body?.receiptIds)
    ? body.receiptIds
        .filter((value): value is string => typeof value === 'string')
        .slice(0, 200)
    : [];

  if (requestedIds.length === 0) {
    return NextResponse.json({ error: '请先选择要删除的回执' }, { status: 400 });
  }

  const deletedCount = await deleteAuthorizationRecords(requestedIds);
  if (deletedCount === 0) {
    return NextResponse.json({ error: '没有找到可删除的回执' }, { status: 404 });
  }

  await recordAdminEvent(session.name, 'delete_receipts', deletedCount).catch(
    (error) => console.error('Unable to record receipt deletion:', error)
  );

  return NextResponse.json({ ok: true, deletedCount });
}

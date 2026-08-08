import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import {
  listAuthorizationRecords,
  recordAdminEvent,
} from '@/lib/admin-data';
import type { AuthorizationRecord } from '@/lib/db';

function escapeCsv(value: string): string {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function recordToRow(record: AuthorizationRecord): string[] {
  return [
    record.receipt_id,
    record.company_name,
    record.candidate_name,
    record.id_number ?? record.id_number_masked,
    record.phone_number ?? record.phone_masked,
    record.created_at,
    record.authorization_text,
  ];
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    receiptIds?: unknown;
  } | null;
  const requestedIds = Array.isArray(body?.receiptIds)
    ? body.receiptIds.filter(
        (value): value is string => typeof value === 'string'
      ).slice(0, 1000)
    : [];
  const requestedSet = new Set(requestedIds);
  const records = (await listAuthorizationRecords()).filter(
    (record) => requestedSet.size === 0 || requestedSet.has(record.receipt_id)
  );

  if (records.length === 0) {
    return NextResponse.json({ error: '没有可导出的回执' }, { status: 400 });
  }

  const headers = [
    '回执编号',
    '公司全称',
    '候选人姓名',
    '身份证号',
    '手机号',
    '签署时间',
    '授权声明',
  ];
  const csv = [headers, ...records.map(recordToRow)]
    .map((row) => row.map((value) => escapeCsv(value)).join(','))
    .join('\r\n');

  await recordAdminEvent(session.name, 'export_csv', records.length).catch(
    (error) => console.error('Unable to record CSV export:', error)
  );

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hr-receipts-${date}.csv"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

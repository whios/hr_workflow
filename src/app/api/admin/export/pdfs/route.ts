import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAdminSession } from '@/lib/admin-auth';
import {
  listAuthorizationRecords,
  recordAdminEvent,
} from '@/lib/admin-data';
import { generateAuthorizationPdf } from '@/lib/pdf';

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40) || 'candidate';
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
      ).slice(0, 200)
    : [];
  const requestedSet = new Set(requestedIds);
  const records = (await listAuthorizationRecords()).filter(
    (record) => requestedSet.size === 0 || requestedSet.has(record.receipt_id)
  );

  if (records.length === 0) {
    return NextResponse.json({ error: '没有可下载的回执' }, { status: 400 });
  }
  if (records.length > 200) {
    return NextResponse.json(
      { error: '单次最多批量下载 200 份 PDF' },
      { status: 400 }
    );
  }

  const zip = new JSZip();
  for (const record of records) {
    const pdf = await generateAuthorizationPdf(record);
    zip.file(
      `${safeFilename(record.candidate_name)}-${record.receipt_id}.pdf`,
      pdf
    );
  }
  const archive = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  await recordAdminEvent(session.name, 'export_pdfs', records.length).catch(
    (error) => console.error('Unable to record PDF export:', error)
  );

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="hr-pdfs-${date}.zip"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

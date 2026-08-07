import { NextRequest, NextResponse } from 'next/server';
import { findAuthorizationByReceiptId } from '@/lib/db';
import { readSignatureBuffer } from '@/lib/utils-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: receiptId } = await params;

  if (!receiptId) {
    return NextResponse.json({ error: '缺少回执编号' }, { status: 400 });
  }

  try {
    const auth = await findAuthorizationByReceiptId(receiptId);

    if (!auth) {
      return NextResponse.json({ error: '回执不存在' }, { status: 404 });
    }

    const buffer = await readSignatureBuffer(auth.signature_key);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Get signature error:', error);
    return NextResponse.json({ error: '获取签名失败' }, { status: 500 });
  }
}

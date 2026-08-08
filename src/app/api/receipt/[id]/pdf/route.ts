import { NextRequest, NextResponse } from 'next/server';
import { findAuthorizationByReceiptId } from '@/lib/db';
import { generateAuthorizationPdf } from '@/lib/pdf';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await findAuthorizationByReceiptId(id);
    if (!auth) {
      return NextResponse.json({ error: '回执不存在' }, { status: 404 });
    }

    const pdfBuffer = await generateAuthorizationPdf(auth);
    const filename = `authorization-${auth.receipt_id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    return NextResponse.json({ error: '生成 PDF 失败' }, { status: 500 });
  }
}

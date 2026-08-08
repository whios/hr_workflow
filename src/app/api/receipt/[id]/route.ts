import { NextRequest, NextResponse } from 'next/server';
import { findAuthorizationByReceiptId } from '@/lib/db';

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

    return NextResponse.json(
      {
        receiptId: auth.receipt_id,
        companyName: auth.company_name,
        candidateName: auth.candidate_name,
        idNumber: auth.id_number ?? auth.id_number_masked,
        phoneMasked: auth.phone_masked,
        authorizationText: auth.authorization_text,
        createdAt: auth.created_at,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          Pragma: 'no-cache',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        },
      }
    );
  } catch (error) {
    console.error('Get receipt error:', error);
    return NextResponse.json({ error: '查询回执失败' }, { status: 500 });
  }
}

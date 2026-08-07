import { NextRequest, NextResponse } from 'next/server';
import {
  generateReceiptId,
  validateIdNumber,
  validatePhone,
  maskIdNumber,
  maskPhone,
  saveSignatureToStorage,
} from '@/lib/utils-server';
import { insertAuthorization } from '@/lib/db';
import { buildAuthorizationText } from '@/lib/auth-text';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const companyName = (formData.get('companyName') as string)?.trim();
    const candidateName = (formData.get('candidateName') as string)?.trim();
    const idNumber = (formData.get('idNumber') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const signatureFile = formData.get('signature') as File | null;

    // Validate required fields
    if (!companyName || !candidateName) {
      return NextResponse.json(
        { error: '公司全称和授权人姓名不能为空' },
        { status: 400 }
      );
    }

    if (!idNumber || !validateIdNumber(idNumber)) {
      return NextResponse.json(
        { error: '请输入有效的18位身份证号码' },
        { status: 400 }
      );
    }

    if (!phone || !validatePhone(phone)) {
      return NextResponse.json(
        { error: '请输入有效的11位手机号码' },
        { status: 400 }
      );
    }

    if (!signatureFile || !(signatureFile instanceof File) || signatureFile.size === 0) {
      return NextResponse.json(
        { error: '请手写电子签名' },
        { status: 400 }
      );
    }

    // Generate receipt ID
    const receiptId = generateReceiptId();

    // Mask sensitive data
    const idNumberMasked = maskIdNumber(idNumber);
    const phoneMasked = maskPhone(phone);

    // Save signature to object storage
    const signatureBuffer = Buffer.from(await signatureFile.arrayBuffer());
    const signatureKey = await saveSignatureToStorage(receiptId, signatureBuffer);

    // Authorization text (full declarations)
    const authorizationText = buildAuthorizationText(
      candidateName,
      idNumberMasked,
      companyName
    );

    // Save to database
    await insertAuthorization({
      receipt_id: receiptId,
      company_name: companyName,
      candidate_name: candidateName,
      id_number_masked: idNumberMasked,
      phone_masked: phoneMasked,
      signature_key: signatureKey,
      authorization_text: authorizationText,
    });

    return NextResponse.json({ receiptId }, { status: 201 });
  } catch (error) {
    console.error('Submit authorization error:', error);
    return NextResponse.json(
      { error: '提交授权失败，请稍后重试' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { findAuthorizationByReceiptId } from '@/lib/db';
import { readSignatureBuffer } from '@/lib/utils-server';
import { jsPDF } from 'jspdf';
import path from 'path';
import fs from 'fs';

const FONT_PATH = path.join(process.cwd(), 'fonts', 'wqy-microhei-regular.ttf');

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

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 25;

    if (fs.existsSync(FONT_PATH)) {
      const fontData = fs.readFileSync(FONT_PATH);
      const base64 = fontData.toString('base64');
      doc.addFileToVFS('wqy-microhei.ttf', base64);
      doc.addFont('wqy-microhei.ttf', 'WenQuanYi', 'normal');
      doc.setFont('WenQuanYi');
    }

    doc.setFontSize(18);
    doc.text('Background Check Authorization', pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(14);
    doc.text('HR 背景调查授权确认书', pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(11);
    const lineHeight = 7;
    const fields: [string, string][] = [
      ['Receipt No / 回执编号', auth.receipt_id],
      ['Company / 公司全称', auth.company_name],
      ['Candidate / 授权人', auth.candidate_name],
      ['ID Number / 身份证号', auth.id_number ?? auth.id_number_masked],
      ['Phone / 手机号', auth.phone_masked],
      ['Date / 签署日期', auth.created_at],
    ];

    for (const [label, value] of fields) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(label, margin, y);
      y += lineHeight - 2;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(value, margin, y);
      y += lineHeight + 2;
    }

    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Authorization Text / 授权声明', margin, y);
    y += lineHeight;

    doc.setFontSize(11);
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(auth.authorization_text, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 10;

    // Load signature from object storage
    try {
      const sigBuffer = await readSignatureBuffer(auth.signature_key);
      const sigBase64 = sigBuffer.toString('base64');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Signature / 电子签名', margin, y);
      y += 3;
      doc.addImage(`data:image/png;base64,${sigBase64}`, 'PNG', margin, y, 50, 20);
      y += 25;
    } catch {
      doc.text('[Signature Image]', margin, y + 5);
      y += 25;
    }

    y = Math.max(y + 10, 250);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated: ${new Date().toISOString()} | Receipt: ${auth.receipt_id}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `authorization-${auth.receipt_id}.pdf`;

    return new NextResponse(pdfBuffer, {
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

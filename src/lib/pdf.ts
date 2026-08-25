import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import type { AuthorizationRecord } from '@/lib/db';
import { readSignatureBuffer } from '@/lib/utils-server';

const FONT_PATH = path.join(process.cwd(), 'fonts', 'wqy-microhei-regular.ttf');

export async function generateAuthorizationPdf(
  auth: AuthorizationRecord
): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const footerLineY = pageHeight - 20;
  const footerTextY = pageHeight - 15;
  const contentBottomY = footerLineY - 10;
  let y = 25;

  if (fs.existsSync(FONT_PATH)) {
    const fontData = fs.readFileSync(FONT_PATH);
    const base64 = fontData.toString('base64');
    doc.addFileToVFS('wqy-microhei.ttf', base64);
    doc.addFont('wqy-microhei.ttf', 'WenQuanYi', 'normal');
    doc.setFont('WenQuanYi');
  }

  const startNewPage = () => {
    doc.addPage();
    if (fs.existsSync(FONT_PATH)) {
      doc.setFont('WenQuanYi');
    }
    y = margin;
  };

  const ensureSpace = (height: number) => {
    if (y + height > contentBottomY) {
      startNewPage();
    }
  };

  const drawFooter = () => {
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerLineY, pageWidth - margin, footerLineY);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated: ${new Date().toISOString()} | Receipt: ${auth.receipt_id}`,
      pageWidth / 2,
      footerTextY,
      { align: 'center' }
    );
  };

  doc.setFontSize(18);
  doc.text('Background Check Authorization', pageWidth / 2, y, {
    align: 'center',
  });
  y += 10;
  doc.setFontSize(14);
  doc.text('HR 背景调查授权确认书', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const lineHeight = 7;
  const fields: [string, string][] = [
    ['Receipt No / 回执编号', auth.receipt_id],
    ['Company / 公司全称', auth.company_name],
    ['Candidate / 授权人', auth.candidate_name],
    ['ID Number / 身份证号', auth.id_number ?? auth.id_number_masked],
    ['Phone / 手机号', auth.phone_number ?? auth.phone_masked],
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
  for (const line of lines) {
    ensureSpace(lineHeight);
    doc.text(line, margin, y);
    y += lineHeight;
  }
  y += 10;

  try {
    ensureSpace(28);
    const sigBuffer = await readSignatureBuffer(auth.signature_key);
    const sigBase64 = sigBuffer.toString('base64');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Signature / 电子签名', margin, y);
    y += 3;
    doc.addImage(`data:image/png;base64,${sigBase64}`, 'PNG', margin, y, 50, 20);
    y += 25;
  } catch {
    ensureSpace(25);
    doc.text('[Signature Image]', margin, y + 5);
    y += 25;
  }
  drawFooter();

  return Buffer.from(doc.output('arraybuffer'));
}

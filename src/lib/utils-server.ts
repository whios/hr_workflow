import crypto from 'crypto';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage();

// --- Token & ID generation ---

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateReceiptId(): string {
  const date = new Date();
  const dateStr =
    date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BG${dateStr}-${random}`;
}

// --- Input validation ---

export function validateIdNumber(idNumber: string): boolean {
  return /^\d{17}[\dXx]$/.test(idNumber);
}

export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// --- Data masking ---

export function maskIdNumber(idNumber: string): string {
  if (idNumber.length < 8) return '****';
  return idNumber.slice(0, 4) + '**********' + idNumber.slice(-4);
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return '****';
  return phone.slice(0, 3) + '******' + phone.slice(-2);
}

// --- Signature file storage (S3) ---

export async function saveSignatureToStorage(
  receiptId: string,
  buffer: Buffer
): Promise<string> {
  const fileName = `${receiptId}.png`;
  const actualKey = await storage.uploadFile({
    fileContent: buffer,
    fileName,
    contentType: 'image/png',
  });
  return actualKey;
}

export async function getSignatureUrl(fileKey: string): Promise<string> {
  return storage.generatePresignedUrl({ key: fileKey, expireTime: 3600 });
}

export async function readSignatureBuffer(fileKey: string): Promise<Buffer> {
  return storage.readFile({ fileKey });
}

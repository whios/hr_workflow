import crypto from 'crypto';
import { del, get, put } from '@vercel/blob';

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
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
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

// --- Signature file storage ---

export async function saveSignatureToStorage(
  receiptId: string,
  buffer: Buffer
): Promise<string> {
  const pathname = `signatures/${receiptId}.png`;
  const blob = await put(pathname, buffer, {
    access: 'private',
    allowOverwrite: false,
    contentType: 'image/png',
    cacheControlMaxAge: 60,
  });
  return blob.pathname;
}

export async function removeSignatureFromStorage(fileKey: string): Promise<void> {
  await del(fileKey);
}

export async function readSignatureBuffer(fileKey: string): Promise<Buffer> {
  const result = await get(fileKey, {
    access: 'private',
    useCache: false,
  });

  if (!result || result.statusCode !== 200) {
    throw new Error('Signature not found');
  }

  const arrayBuffer = await new Response(result.stream).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

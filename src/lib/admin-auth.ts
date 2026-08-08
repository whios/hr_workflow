import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { AdminSession } from '@/lib/admin-types';

export const ADMIN_SESSION_COOKIE = 'hr_admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function getSessionSecret(): string {
  return process.env.HR_SESSION_SECRET ?? '';
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.HR_ADMIN_PASSWORD && getSessionSecret());
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.HR_ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

export function createAdminSessionToken(name: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    name,
    issuedAt,
    expiresAt: issuedAt + ADMIN_SESSION_MAX_AGE,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function parseAdminSessionToken(token: string): AdminSession | null {
  if (!getSessionSecret()) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra || !safeEqual(signature, sign(encoded))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as AdminSession;
    const now = Math.floor(Date.now() / 1000);
    if (
      !payload.name ||
      !Number.isFinite(payload.issuedAt) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= now
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return token ? parseAdminSessionToken(token) : null;
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  };
}

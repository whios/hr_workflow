import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from '@/lib/admin-auth';
import { recordAdminEvent } from '@/lib/admin-data';

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'HR 后台尚未配置登录密码' },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    password?: string;
  } | null;
  const name = body?.name?.replace(/\s+/g, ' ').trim().slice(0, 30) ?? '';
  const password = body?.password ?? '';

  if (!name || !verifyAdminPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json(
      { error: '姓名或密码不正确' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(name),
    adminCookieOptions()
  );
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');

  await recordAdminEvent(name, 'login').catch((error) => {
    console.error('Unable to record admin login:', error);
  });
  return response;
}

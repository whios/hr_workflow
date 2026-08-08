import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  getAdminSession,
} from '@/lib/admin-auth';
import { recordAdminEvent } from '@/lib/admin-data';

export async function POST() {
  const session = await getAdminSession();
  if (session) {
    await recordAdminEvent(session.name, 'logout').catch((error) => {
      console.error('Unable to record admin logout:', error);
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...adminCookieOptions(),
    maxAge: 0,
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

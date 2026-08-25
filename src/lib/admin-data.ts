import crypto from 'crypto';
import { del, get, list, put } from '@vercel/blob';
import type { AuthorizationRecord } from '@/lib/db';
import type {
  AdminAuditAction,
  AdminAuditEvent,
  AdminReceiptSummary,
} from '@/lib/admin-types';

interface StoredAuditEvent {
  id: string;
  admin_name: string;
  action: AdminAuditAction;
  record_count: number;
  created_at: string;
}

async function listPathnames(prefix: string): Promise<string[]> {
  const pathnames: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    pathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return pathnames;
}

async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Unable to read private blob ${pathname}:`, error);
    return null;
  }
}

async function readManyPrivateJson<T>(pathnames: string[]): Promise<T[]> {
  const values: T[] = [];
  for (let index = 0; index < pathnames.length; index += 20) {
    const batch = await Promise.all(
      pathnames.slice(index, index + 20).map(readPrivateJson<T>)
    );
    for (const value of batch) {
      if (value !== null) values.push(value as T);
    }
  }
  return values;
}

export async function listAuthorizationRecords(): Promise<AuthorizationRecord[]> {
  const pathnames = await listPathnames('receipts/');
  const records = await readManyPrivateJson<AuthorizationRecord>(pathnames);
  return records.sort((left, right) =>
    right.created_at.localeCompare(left.created_at)
  );
}

export async function deleteAuthorizationRecords(
  receiptIds: string[]
): Promise<number> {
  const requestedSet = new Set(receiptIds);
  if (requestedSet.size === 0) return 0;

  const records = (await listAuthorizationRecords()).filter((record) =>
    requestedSet.has(record.receipt_id)
  );

  for (const record of records) {
    await del(`receipts/${record.receipt_id}.json`);
    await del(record.signature_key).catch((error) => {
      console.error(
        `Unable to delete signature blob ${record.signature_key}:`,
        error
      );
    });
  }

  return records.length;
}

export function toAdminReceiptSummary(
  record: AuthorizationRecord
): AdminReceiptSummary {
  return {
    receiptId: record.receipt_id,
    companyName: record.company_name,
    candidateName: record.candidate_name,
    idNumber: record.id_number ?? record.id_number_masked,
    phoneNumber: record.phone_number ?? record.phone_masked,
    createdAt: record.created_at,
  };
}

export async function recordAdminEvent(
  adminName: string,
  action: AdminAuditAction,
  recordCount = 0
): Promise<void> {
  const event: StoredAuditEvent = {
    id: crypto.randomUUID(),
    admin_name: adminName,
    action,
    record_count: recordCount,
    created_at: new Date().toISOString(),
  };
  await put(
    `admin-audit/${Date.now()}-${event.id}.json`,
    JSON.stringify(event),
    {
      access: 'private',
      allowOverwrite: false,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60,
    }
  );
}

export async function listAdminAuditEvents(
  limit = 30
): Promise<AdminAuditEvent[]> {
  const pathnames = await listPathnames('admin-audit/');
  const events = await readManyPrivateJson<StoredAuditEvent>(pathnames);
  return events
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      adminName: event.admin_name,
      action: event.action,
      recordCount: event.record_count,
      createdAt: event.created_at,
    }));
}

import { get, put } from '@vercel/blob';

export interface AuthorizationRecord {
  id: number;
  receipt_id: string;
  company_name: string;
  candidate_name: string;
  id_number_masked: string;
  phone_masked: string;
  signature_key: string;
  authorization_text: string;
  created_at: string;
}

export async function insertAuthorization(data: {
  receipt_id: string;
  company_name: string;
  candidate_name: string;
  id_number_masked: string;
  phone_masked: string;
  signature_key: string;
  authorization_text: string;
}): Promise<AuthorizationRecord> {
  const record: AuthorizationRecord = {
    id: 0,
    ...data,
    created_at: new Date().toISOString(),
  };

  await put(
    `receipts/${data.receipt_id}.json`,
    JSON.stringify(record),
    {
      access: 'private',
      allowOverwrite: false,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60,
    },
  );

  return record;
}

export async function findAuthorizationByReceiptId(
  receiptId: string
): Promise<AuthorizationRecord | null> {
  const result = await get(`receipts/${receiptId}.json`, {
    access: 'private',
    useCache: false,
  });

  if (!result || result.statusCode !== 200) return null;

  const json = await new Response(result.stream).text();
  return JSON.parse(json) as AuthorizationRecord;
}

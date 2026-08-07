import { getSupabaseClient } from '@/storage/database/supabase-client';

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
  const client = getSupabaseClient();
  const { data: result, error } = await client
    .from('authorizations')
    .insert({
      receipt_id: data.receipt_id,
      company_name: data.company_name,
      candidate_name: data.candidate_name,
      id_number_masked: data.id_number_masked,
      phone_masked: data.phone_masked,
      signature_key: data.signature_key,
      authorization_text: data.authorization_text,
    })
    .select()
    .single();
  if (error) throw new Error(`插入授权记录失败: ${error.message}`);
  return result as AuthorizationRecord;
}

export async function findAuthorizationByReceiptId(
  receiptId: string
): Promise<AuthorizationRecord | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('authorizations')
    .select('*')
    .eq('receipt_id', receiptId)
    .maybeSingle();
  if (error) throw new Error(`查询授权记录失败: ${error.message}`);
  return (data as AuthorizationRecord) ?? null;
}

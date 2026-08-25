export interface AdminSession {
  name: string;
  issuedAt: number;
  expiresAt: number;
}

export type AdminAuditAction =
  | 'login'
  | 'logout'
  | 'export_csv'
  | 'export_pdfs'
  | 'delete_receipts';

export interface AdminAuditEvent {
  id: string;
  adminName: string;
  action: AdminAuditAction;
  recordCount: number;
  createdAt: string;
}

export interface AdminReceiptSummary {
  receiptId: string;
  companyName: string;
  candidateName: string;
  idNumber: string;
  phoneNumber: string;
  createdAt: string;
}

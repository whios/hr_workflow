import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import {
  listAdminAuditEvents,
  listAuthorizationRecords,
  toAdminReceiptSummary,
} from '@/lib/admin-data';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [records, auditEvents] = await Promise.all([
    listAuthorizationRecords(),
    listAdminAuditEvents(),
  ]);

  return (
    <AdminDashboard
      adminName={session.name}
      records={records.map(toAdminReceiptSummary)}
      auditEvents={auditEvents}
    />
  );
}

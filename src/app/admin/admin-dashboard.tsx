'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  ExternalLink,
  FileArchive,
  LogOut,
  Search,
} from 'lucide-react';
import type {
  AdminAuditAction,
  AdminAuditEvent,
  AdminReceiptSummary,
} from '@/lib/admin-types';

interface AdminDashboardProps {
  adminName: string;
  records: AdminReceiptSummary[];
  auditEvents: AdminAuditEvent[];
}

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  login: '登录后台',
  logout: '退出后台',
  export_csv: '导出表格',
  export_pdfs: '批量下载 PDF',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminDashboard({
  adminName,
  records,
  auditEvents,
}: AdminDashboardProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyAction, setBusyAction] = useState<'csv' | 'pdfs' | ''>('');
  const [message, setMessage] = useState('');

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return records.filter((record) => {
      const timestamp = new Date(record.createdAt).getTime();
      if (from !== null && timestamp < from) return false;
      if (to !== null && timestamp > to) return false;
      if (!normalized) return true;
      return [
        record.receiptId,
        record.companyName,
        record.candidateName,
        record.idNumber,
        record.phoneNumber,
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [fromDate, query, records, toDate]);

  const allFilteredSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((record) => selected.has(record.receiptId));

  const toggleRecord = (receiptId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(receiptId)) next.delete(receiptId);
      else next.add(receiptId);
      return next;
    });
  };

  const toggleFiltered = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const record of filteredRecords) {
        if (allFilteredSelected) next.delete(record.receiptId);
        else next.add(record.receiptId);
      }
      return next;
    });
  };

  const exportRecords = async (kind: 'csv' | 'pdfs') => {
    const selectedRecords =
      selected.size > 0
        ? records.filter((record) => selected.has(record.receiptId))
        : filteredRecords;
    if (selectedRecords.length === 0) return;

    setBusyAction(kind);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/export/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptIds: selectedRecords.map((record) => record.receiptId),
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setMessage(data.error ?? '导出失败');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(
        await response.blob(),
        kind === 'csv' ? `hr-receipts-${date}.csv` : `hr-pdfs-${date}.zip`
      );
      setMessage(`已导出 ${selectedRecords.length} 条回执`);
      router.refresh();
    } catch {
      setMessage('网络错误，请稍后重试');
    } finally {
      setBusyAction('');
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/admin/login');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#1a1a2e]">
      <header className="border-b border-[#dfe5ec] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-[#1e3a5f]">HR 回执后台</h1>
            <p className="mt-0.5 text-xs text-[#64748b]">
              当前登录：{adminName}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d8dee8] px-3 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            退出
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <section className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#dfe5ec] bg-[#dfe5ec] sm:max-w-md">
          <div className="bg-white px-4 py-3">
            <p className="text-xs text-[#64748b]">全部回执</p>
            <p className="mt-1 text-xl font-semibold text-[#1e3a5f]">{records.length}</p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-xs text-[#64748b]">当前结果</p>
            <p className="mt-1 text-xl font-semibold text-[#1e3a5f]">
              {filteredRecords.length}
            </p>
          </div>
        </section>

        <section aria-label="回执筛选和导出" className="mb-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_auto_auto]">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94a3b8]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="姓名、公司、回执号、证件号、手机号"
                className="h-10 w-full rounded-md border border-[#d8dee8] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              aria-label="开始日期"
              className="h-10 rounded-md border border-[#d8dee8] bg-white px-3 text-sm outline-none focus:border-[#1e3a5f]"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              aria-label="结束日期"
              className="h-10 rounded-md border border-[#d8dee8] bg-white px-3 text-sm outline-none focus:border-[#1e3a5f]"
            />
            <button
              type="button"
              onClick={() => exportRecords('csv')}
              disabled={filteredRecords.length === 0 || busyAction !== ''}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1e3a5f] px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {busyAction === 'csv' ? '导出中...' : '导出表格'}
            </button>
            <button
              type="button"
              onClick={() => exportRecords('pdfs')}
              disabled={filteredRecords.length === 0 || busyAction !== ''}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#1e3a5f] bg-white px-4 text-sm font-medium text-[#1e3a5f] disabled:opacity-50"
            >
              <FileArchive className="h-4 w-4" aria-hidden="true" />
              {busyAction === 'pdfs' ? '打包中...' : '批量 PDF'}
            </button>
          </div>
          {message && (
            <p className="mt-2 text-sm text-[#475569]" role="status">
              {message}
            </p>
          )}
        </section>

        <section aria-labelledby="receipt-list-title">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="receipt-list-title" className="text-base font-semibold text-[#1e3a5f]">
              回执列表
            </h2>
            {selected.size > 0 && (
              <span className="text-xs text-[#64748b]">已选择 {selected.size} 条</span>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#dfe5ec] bg-white">
            <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs text-[#64748b]">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleFiltered}
                      aria-label="选择当前结果"
                      className="h-4 w-4 accent-[#1e3a5f]"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">候选人</th>
                  <th className="px-3 py-3 font-medium">公司</th>
                  <th className="px-3 py-3 font-medium">身份证号</th>
                  <th className="px-3 py-3 font-medium">手机号</th>
                  <th className="px-3 py-3 font-medium">签署时间</th>
                  <th className="px-3 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f4]">
                {filteredRecords.map((record) => (
                  <tr key={record.receiptId} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(record.receiptId)}
                        onChange={() => toggleRecord(record.receiptId)}
                        aria-label={`选择 ${record.candidateName}`}
                        className="h-4 w-4 accent-[#1e3a5f]"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{record.candidateName}</td>
                    <td className="max-w-56 px-3 py-3 text-[#475569]">
                      {record.companyName}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{record.idNumber}</td>
                    <td className="px-3 py-3 font-mono text-xs">{record.phoneNumber}</td>
                    <td className="px-3 py-3 text-xs text-[#64748b]">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/r/${record.receiptId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#1e3a5f] hover:underline"
                        >
                          查看
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                        <a
                          href={`/api/receipt/${record.receiptId}/pdf`}
                          className="text-sm font-medium text-[#475569] hover:underline"
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#64748b]">
                      没有符合条件的回执
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="audit-title" className="mt-8 pb-8">
          <h2 id="audit-title" className="mb-2 text-base font-semibold text-[#1e3a5f]">
            最近操作记录
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[#dfe5ec] bg-white">
            <table className="min-w-[640px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs text-[#64748b]">
                <tr>
                  <th className="px-4 py-3 font-medium">操作人</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                  <th className="px-4 py-3 font-medium">回执数量</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f4]">
                {auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 font-medium">{event.adminName}</td>
                    <td className="px-4 py-3">{ACTION_LABELS[event.action]}</td>
                    <td className="px-4 py-3 text-[#475569]">{event.recordCount || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[#64748b]">
                      {formatDate(event.createdAt)}
                    </td>
                  </tr>
                ))}
                {auditEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#64748b]">
                      暂无操作记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

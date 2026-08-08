'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ReceiptData {
  receiptId: string;
  companyName: string;
  candidateName: string;
  idNumber: string;
  phoneMasked: string;
  authorizationText: string;
  createdAt: string;
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const receiptId = params.id;

  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/receipt/${receiptId}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('回执不存在');
        return res.json();
      })
      .then((d: ReceiptData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('回执不存在或已失效');
        setLoading(false);
      });
  }, [receiptId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <p className="text-sm text-[#64748b]">加载中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="text-center">
          <p className="text-lg font-medium text-[#1a1a2e]">{error || '回执不存在'}</p>
          <p className="mt-1 text-sm text-[#64748b]">请确认回执链接是否正确</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="mx-auto max-w-[480px] px-4 py-6">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-lg font-bold text-[#1e3a5f]">
            HR 背景调查授权确认书
          </h1>
          <p className="mt-0.5 text-xs text-[#64748b]">
            回执编号：{data.receiptId}
          </p>
        </div>

        <div className="mb-4 rounded-md border border-[#f59e0b]/40 bg-[#fffbeb] px-3 py-2.5 text-xs leading-relaxed text-[#92400e]">
          本回执包含完整身份证号。回执链接等同于查看凭证，请仅限指定 HR 使用，不要转发给无关人员。
        </div>

        {/* Authorization Details */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <InfoRow label="公司全称" value={data.companyName} />
            <InfoRow label="授权人" value={data.candidateName} />
            <InfoRow label="身份证号" value={data.idNumber} />
            <InfoRow label="手机号" value={data.phoneMasked} />
            <InfoRow label="签署日期" value={data.createdAt} />
          </div>

          <div className="mt-4 border-t border-[#e2e8f0] pt-4">
            <p className="mb-2 text-sm font-medium text-[#1a1a2e]">授权声明</p>
            <p className="text-[13px] leading-relaxed text-[#475569]">
              {data.authorizationText}
            </p>
          </div>

          {/* Signature Image */}
          <div className="mt-4 border-t border-[#e2e8f0] pt-4">
            <p className="mb-2 text-sm font-medium text-[#1a1a2e]">电子签名</p>
            <div className="rounded-md border border-[#e2e8f0] bg-[#fafbfc] p-2">
              <img
                src={`/api/receipt/${receiptId}/signature`}
                alt="电子签名"
                className="h-20 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-3 pb-6">
          <a
            href={`/api/receipt/${receiptId}/pdf`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white transition-opacity active:opacity-80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出授权书 PDF
          </a>
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-lg border border-[#e2e8f0] py-3 text-sm font-medium text-[#1a1a2e] transition-opacity active:opacity-80"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-[#64748b]">{label}</span>
      <span className="text-right text-sm font-medium text-[#1a1a2e]">{value}</span>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function SuccessPage() {
  const params = useParams<{ receiptId: string }>();
  const receiptId = params.receiptId;

  const [receiptUrl, setReceiptUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const origin = window.location.origin;
    setReceiptUrl(`${origin}/r/${receiptId}`);
  }, [receiptId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text for manual copy
      const el = document.getElementById('receipt-url-text');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="mx-auto max-w-[480px] px-4 py-8">
        {/* Success Icon */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a]/10">
            <svg className="h-7 w-7 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1a1a2e]">授权提交成功</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            请复制下方回执链接，发送给 HR 完成确认
          </p>
        </div>

        {/* Receipt Link Card */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-[#1a1a2e]">回执链接</p>
          <div className="rounded-md bg-[#f8fafc] p-3 break-all">
            <span
              id="receipt-url-text"
              className="text-sm text-[#1e3a5f] select-all"
            >
              {receiptUrl}
            </span>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-medium text-white transition-opacity active:opacity-80"
            >
              {copied ? '已复制' : '复制回执链接'}
            </button>
            <a
              href={`/r/${receiptId}`}
              className="flex-1 rounded-lg border border-[#1e3a5f] py-2.5 text-center text-sm font-medium text-[#1e3a5f] transition-opacity active:opacity-80"
            >
              查看授权书
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-[#1a1a2e]">更多操作</p>
          <a
            href={`/api/receipt/${receiptId}/pdf`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] py-2.5 text-sm font-medium text-[#1a1a2e] transition-opacity active:opacity-80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出授权书 PDF
          </a>
        </div>

        {/* Receipt ID */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[#94a3b8]">
            回执编号：{receiptId}
          </p>
        </div>
      </div>
    </div>
  );
}

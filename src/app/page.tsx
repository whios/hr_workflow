'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SignaturePad, { type SignaturePadHandle } from '@/components/signature-pad';
import { Suspense } from 'react';
import { AUTH_SCOPE_ITEMS, buildAuthSummary } from '@/lib/auth-text';
import { Eraser } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Link Generator (HR section at top)                                 */
/* ------------------------------------------------------------------ */
function LinkGenerator() {
  const [hrCompany, setHrCompany] = useState('');
  const [hrCandidate, setHrCandidate] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!hrCompany.trim() || !hrCandidate.trim()) return;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      c: hrCompany.trim(),
      n: hrCandidate.trim(),
    });
    setGeneratedUrl(`${base}/?${params.toString()}`);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
      const el = document.getElementById('generated-url');
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
    <div className="mb-4 rounded-lg border border-dashed border-[#1e3a5f]/30 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-[#1e3a5f]">
        HR 生成填写链接
      </p>
      <div className="space-y-2">
        <input
          type="text"
          value={hrCompany}
          onChange={(e) => setHrCompany(e.target.value)}
          placeholder="公司全称"
          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm text-[#1a1a2e] outline-none focus:border-[#1e3a5f]"
        />
        <input
          type="text"
          value={hrCandidate}
          onChange={(e) => setHrCandidate(e.target.value)}
          placeholder="候选人姓名"
          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm text-[#1a1a2e] outline-none focus:border-[#1e3a5f]"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!hrCompany.trim() || !hrCandidate.trim()}
          className="w-full rounded-md bg-[#1e3a5f] py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          生成链接
        </button>
      </div>
      {generatedUrl && (
        <div className="mt-3">
          <p
            id="generated-url"
            className="break-all rounded bg-[#f5f7fa] p-2 text-xs text-[#1e3a5f] select-all"
          >
            {generatedUrl}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 w-full rounded-md border border-[#1e3a5f] py-1.5 text-xs font-medium text-[#1e3a5f] active:bg-[#1e3a5f] active:text-white"
          >
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Authorization Declaration (Section 2 + 3)                          */
/* ------------------------------------------------------------------ */
function AuthDeclaration() {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      {/* Section 2 */}
      <p className="mb-1.5 text-sm font-semibold text-[#1e3a5f]">
        2 授权范围（逐项列明）
      </p>
      <p className="mb-2 text-[13px] leading-relaxed text-[#475569]">
        本人自愿授权对以下事项进行核实，范围以本清单为限，不作扩大解释：
      </p>
      <ol className="mb-4 space-y-1 pl-4 text-[13px] leading-relaxed text-[#1a1a2e] list-decimal">
        {AUTH_SCOPE_ITEMS.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>

      {/* Section 3 */}
      <p className="mb-1.5 text-sm font-semibold text-[#1e3a5f]">
        3 授权目的与信息使用
      </p>
      <p className="mb-1 text-[13px] leading-relaxed text-[#1a1a2e]">
        <span className="font-medium">授权目的：</span>
        仅用于本次录用决策前的风险审查与岗位适配性判断，不作授权范围以外用途。
      </p>
      <p className="text-[13px] leading-relaxed text-[#1a1a2e]">
        <span className="font-medium">使用与保密：</span>
        核查信息严格保密，仅限 HR 及必要决策人员内部使用；录用/未录用后按档案制度规定的期限销毁或返还。
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#1a1a2e]">
        <span className="font-medium">敏感信息处理：</span>
        完整身份证号和手机号将随授权回执保存，并供指定 HR 进行身份核验与必要联络；回执链接不得向无关人员转发。
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Form                                                          */
/* ------------------------------------------------------------------ */
function HomeContent() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sigRef = useRef<SignaturePadHandle>(null);

  // Read URL params from window.location to avoid useSearchParams SSR bailout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    const n = params.get('n');
    if (c) setCompanyName(c);
    if (n) setCandidateName(n);
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = '请填写公司全称';
    if (!candidateName.trim()) errs.candidateName = '请填写授权人姓名';
    if (!/^\d{17}[\dXx]$/.test(idNumber.trim())) errs.idNumber = '请输入有效的18位身份证号码';
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) errs.phone = '请输入有效的11位手机号码';
    if (sigRef.current?.isEmpty()) errs.signature = '请手写电子签名';
    if (!agreed) errs.agreed = '请阅读并同意授权声明';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [companyName, candidateName, idNumber, phone, agreed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const sigBlob = sigRef.current?.toBlob();
      if (!sigBlob) {
        setErrors({ signature: '签名获取失败，请重新签名' });
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('companyName', companyName.trim());
      formData.append('candidateName', candidateName.trim());
      formData.append('idNumber', idNumber.trim());
      formData.append('phone', phone.trim());
      formData.append('signature', sigBlob, 'signature.png');

      const res = await fetch('/api/submit', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error || '提交失败，请重试' });
        setSubmitting(false);
        return;
      }

      router.push(`/success/${data.receiptId}`);
    } catch {
      setErrors({ form: '网络错误，请检查网络后重试' });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="mx-auto max-w-[480px] px-4 py-6">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-[#1e3a5f]">
            HR 背景调查授权确认
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            请如实填写以下信息并签署授权声明
          </p>
        </div>

        {/* Link Generator (HR) */}
        <LinkGenerator />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              公司全称 <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="请输入公司全称"
              className="w-full rounded-md border border-[#e2e8f0] px-3 py-2.5 text-[15px] text-[#1a1a2e] outline-none transition-colors focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-[#dc2626]">{errors.companyName}</p>
            )}
          </div>

          {/* Candidate Name */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              授权人姓名 <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="请输入您的真实姓名"
              className="w-full rounded-md border border-[#e2e8f0] px-3 py-2.5 text-[15px] text-[#1a1a2e] outline-none transition-colors focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
            />
            {errors.candidateName && (
              <p className="mt-1 text-xs text-[#dc2626]">{errors.candidateName}</p>
            )}
          </div>

          {/* ID Number & Phone */}
          <div className="rounded-lg bg-white p-4 shadow-sm space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
                身份证号 <span className="text-[#dc2626]">*</span>
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/[^\dXx]/g, '').slice(0, 18))}
                placeholder="18位身份证号码"
                maxLength={18}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2.5 text-[15px] text-[#1a1a2e] outline-none transition-colors focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">
                完整号码将保存在授权回执中，仅用于指定 HR 进行身份核验。
              </p>
              {errors.idNumber && (
                <p className="mt-1 text-xs text-[#dc2626]">{errors.idNumber}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
                手机号码 <span className="text-[#dc2626]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="11位手机号码"
                maxLength={11}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2.5 text-[15px] text-[#1a1a2e] outline-none transition-colors focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">
                完整号码将保存在授权回执中，仅供指定 HR 必要联络使用。
              </p>
              {errors.phone && (
                <p className="mt-1 text-xs text-[#dc2626]">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Authorization Declaration (Section 2 + 3) */}
          <AuthDeclaration />

          {/* Signature */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-[#1a1a2e]">
                手写签名 <span className="text-[#dc2626]">*</span>
              </label>
              <button
                type="button"
                onClick={() => sigRef.current?.clear()}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-[#64748b] active:bg-[#f1f5f9]"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                清除重签
              </button>
            </div>
            <SignaturePad
              ref={sigRef}
              onDraw={() => {
                setErrors((current) => {
                  if (!current.signature) return current;
                  const next = { ...current };
                  delete next.signature;
                  return next;
                });
              }}
            />
            {errors.signature && (
              <p className="mt-1 text-xs text-[#dc2626]">{errors.signature}</p>
            )}
          </div>

          {/* Authorization Agreement */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="rounded-md bg-[#f8fafc] p-3 text-[13px] leading-relaxed text-[#475569]">
              <p className="font-medium text-[#1a1a2e] mb-1">授权声明</p>
              <p>
                {companyName && candidateName
                  ? buildAuthSummary(companyName, candidateName)
                  : '本人确认与上述公司存在入职/合作背景调查关系，自愿授权该公司或其委托的第三方机构按照本页面所列授权范围进行核实，相关信息仅用于本次录用决策前的风险审查，核查结果严格保密。本人承诺所提供信息真实完整，并理解虚假信息可能导致录用资格被取消。'}
              </p>
            </div>
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#e2e8f0] accent-[#1e3a5f]"
              />
              <span className="text-sm text-[#1a1a2e]">
                我已阅读并同意上述授权声明
              </span>
            </label>
            {errors.agreed && (
              <p className="mt-1 text-xs text-[#dc2626]">{errors.agreed}</p>
            )}
          </div>

          {/* Form-level error */}
          {errors.form && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-[#dc2626]">
              {errors.form}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#1e3a5f] py-3 text-[15px] font-medium text-white transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {submitting ? '提交中...' : '确认提交授权'}
          </button>

          <p className="pb-4 text-center text-xs text-[#94a3b8]">
            身份证号和手机号将完整保存在授权回执中
          </p>
        </form>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomeContent />;
}

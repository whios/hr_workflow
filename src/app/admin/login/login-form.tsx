'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LogIn } from 'lucide-react';

export default function AdminLoginForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !password) return;
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? '登录失败');
        setSubmitting(false);
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('网络错误，请稍后重试');
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-8">
      <section className="w-full max-w-sm rounded-lg border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-[#1e3a5f]">HR 回执后台</h1>
          <p className="mt-1 text-sm text-[#64748b]">仅限授权 HR 登录使用</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              HR 姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 30))}
              autoComplete="name"
              placeholder="请输入姓名"
              className="w-full rounded-md border border-[#d8dee8] px-3 py-2.5 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              登录密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="请输入后台密码"
              className="w-full rounded-md border border-[#d8dee8] px-3 py-2.5 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[#b91c1c]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !password || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {submitting ? '登录中...' : '登录后台'}
          </button>
        </form>
      </section>
    </main>
  );
}

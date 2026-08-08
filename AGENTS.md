# 项目上下文

## 项目概述

HR 背景调查授权确认系统。候选人打开首页即可直接填写授权信息，提交后获得回执链接，可复制发给 HR 或查看/导出授权书 PDF。`hr-admin` 分支新增受密码保护的 HR 后台，用于回执查询与批量导出，不改变候选人公开填写流程。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Storage**: Vercel Blob（私有回执与签名存储）
- **PDF**: jsPDF (含 WenQuanYi 中文字体)

## 目录结构

```
├── fonts/                  # 中文字体（PDF 导出用）
├── public/                 # 静态资源
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── page.tsx        # 首页（公开填写表单）
│   │   ├── success/[receiptId]/ # 提交成功页
│   │   ├── r/[id]/         # 回执查看页
│   │   ├── admin/          # HR 登录与回执后台
│   │   └── api/            # API 路由
│   ├── components/         # 组件（含 signature-pad）
│   └── lib/                # 工具库
└── package.json
```

## API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/submit` | POST | 提交授权（multipart/form-data） |
| `/api/receipt/[id]` | GET | 查询回执信息 |
| `/api/receipt/[id]/pdf` | GET | 导出授权书 PDF |
| `/api/receipt/[id]/signature` | GET | 获取签名图片 |
| `/api/admin/login` | POST | HR 后台登录 |
| `/api/admin/logout` | POST | HR 后台退出 |
| `/api/admin/export/csv` | POST | 导出回执 CSV |
| `/api/admin/export/pdfs` | POST | 批量打包回执 PDF |

## 页面路由

| 路由 | 说明 |
|------|------|
| `/` | 首页 — 公开填写表单（支持 `?c=公司名&n=姓名` 预填） |
| `/success/[receiptId]` | 提交成功 — 显示回执链接、复制按钮、PDF 导出 |
| `/r/[id]` | 回执查看 — 完整授权书 + PDF 导出 |
| `/admin/login` | HR 后台登录 |
| `/admin` | 回执列表、筛选、导出与审计记录 |

## 安全设计

- URL 仅含短回执编号（如 `BG260807-3A9F1B`），不携带任何敏感信息
- `hr-plaintext` 分支会明文存储完整身份证号和手机号，同时保留脱敏字段以兼容旧回执
- 回执与签名存储在 Vercel 私有 Blob 中
- 回执链接会显示完整身份证号和手机号，链接本身等同于查看凭证
- 回执、签名和 PDF 响应禁止缓存，并禁止搜索引擎索引
- 后台密码仅通过 `HR_ADMIN_PASSWORD` 环境变量配置，不写入仓库
- 后台会话使用 `HR_SESSION_SECRET` 签名的 HttpOnly Cookie，8 小时后失效
- 登录、退出和导出操作记录存储在 Vercel 私有 Blob 中

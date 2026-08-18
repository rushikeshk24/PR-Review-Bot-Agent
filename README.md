# PR Review Bot — AI-Powered PR Review & Merge Enforcement Agent

> **Developed by Rushi Karlekar**  
> An enterprise-grade, multi-language GitHub App and AI Code Review platform powered by **Google Gemini 2.0 (Structured Reasoning)**. Automatically analyzes pull requests, enforces merge controls via GitHub Checks, tracks issue lifecycles across multi-commit pushes, and provides a full codebase security & health audit dashboard.

🌐 **Live Demo:** https://your-frontend-url.onrender.com

---

## 🌟 Architecture & Workflow

```
Developer creates PR or pushes new commit (synchronize)
        ↓
GitHub Webhook (POST /webhooks/github)
        ↓
Fastify Webhook Receiver (HMAC-SHA256 verified)
        ↓
BullMQ Async Queue (Redis)
        ↓
Review Worker:
  ├── 1. Fetch PR diff & file contents via GitHub REST API
  ├── 2. Create GitHub Check Run ("in_progress")
  ├── 3. Google Gemini AI Analysis (JSON Schema structured output)
  ├── 4. Compute Finding Fingerprints: SHA256(file + category + normalized title)
  ├── 5. Issue Tracking State Engine:
  │       ├── Correlate previous iteration findings
  │       ├── Issues resolved in this push → status: RESOLVED in iteration #N
  │       ├── Unfixed issues → status: OPEN (BLOCKING)
  │       └── Newly detected issues → status: OPEN
  ├── 6. Post inline review comments on GitHub with suggested code fixes
  ├── 7. Merge Enforcement:
  │       ├── Active blocking issues > 0 → GitHub Check: FAILURE (❌ Block Merge)
  │       └── Active blocking issues == 0 → GitHub Check: SUCCESS (✅ Allow Merge)
  └── 8. Persist Review Iteration and Findings to PostgreSQL Database
```

---

## 🚀 Key Features

### 1. 🤖 Intelligent Multi-Language Code Review
- Powered by **Google Gemini AI** with JSON schema-constrained structured output.
- Analyzes TypeScript, JavaScript, Python, Go, Rust, Java, C#, SQL, Shell, Dockerfiles, and more.
- Detects security vulnerabilities, performance regressions, code smells, and syntax/logic bugs.
- Generates concrete, line-level code replacements (`suggestedFix`).

### 2. 🔄 Multi-Commit Issue Tracking & Fingerprinting
- **Stable Fingerprints**: Generates unique SHA-256 hashes (`file + category + title`) for every detected issue.
- **Cross-Commit Reconciliation**: Automatically compares findings across pushes (`Iteration #1 → Iteration #2 → Iteration #3`).
- **Resolved Issue Recognition**: When a developer fixes an issue and pushes new commits, the bot marks the finding as `✓ RESOLVED in Iteration #N`.

### 3. 🛑 GitHub Checks & Merge Enforcement
- **Merge Blocking**: If blocking issues exist, the GitHub Check Run is marked as `failure` (`❌ CodeLens Review: 2 Blocking Issues Found`), blocking the PR from merging.
- **Merge Allowed**: Once all blocking issues are resolved, the check transitions to `success` (`✅ CodeLens Review: Passed — Ready to Merge`).

### 4. 🔍 Full Codebase Security & Health Audit
- Audit any public GitHub repository directly from the dashboard (no PR required).
- Fetches all source files via GitHub Git Trees API.
- Generates a **Repository Health Score (0–100)**, Executive Summary, Severity Breakdown (Critical, Error, Warning, Info), and actionable remediation steps.

### 5. 🛡️ 1-Click Administrative Override
- Authorized collaborators can override blocked PRs directly via the Dashboard or via GitHub comments (`/codelens override [reason]`).
- Bypasses the blocking check with an immutable audit log recording the author, timestamp, and reason.

### 6. 📊 Modern Next.js 14 Dashboard
- **PR Details View**: Visual timeline of review iterations, commit SHAs, health scores, and filterable issue lifecycle tabs (`All`, `❌ Blocking`, `✅ Resolved`).
- **Repository Management**: Per-repo settings (severity threshold, strict mode, ignored globs, custom rules).

---

## 🏗️ Monorepo Structure

```
PR-Review-Bot/
├── apps/
│   ├── api/                      # NestJS 10 + Fastify API & Review Worker
│   │   ├── src/
│   │   │   ├── ai/               # Gemini AI engine with structured JSON schema
│   │   │   ├── github/           # Octokit client & GitHub Checks / Comments integration
│   │   │   ├── manual/           # Full codebase audit & manual review endpoints
│   │   │   ├── review/           # Issue tracker, fingerprinting & override services
│   │   │   └── webhooks/         # GitHub webhook receiver & HMAC verification
│   └── web/                      # Next.js 14 App Router dashboard
│       └── src/app/
│           ├── dashboard/        # Repos, PR timeline, Codebase Audit & Settings
│           ├── login/            # Sign In page
│           └── signup/           # Sign Up page
├── packages/
│   ├── database/                 # Prisma ORM schema & PostgreSQL tenant client
│   ├── shared/                   # Zod schemas, TypeScript types, language hints
│   └── tsconfig/                 # Shared TypeScript base configs
├── docker-compose.yml            # Local PostgreSQL 16 & Redis 7
├── render.yaml                   # 1-click Render deployment blueprint
├── pnpm-workspace.yaml
└── package.json
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS / Custom Design System, Lucide Icons
- **Backend**: NestJS 10, Fastify, BullMQ (Redis queue)
- **Database**: PostgreSQL 16 with Prisma ORM 5.22
- **AI Engine**: Google Gemini AI (`@google/generative-ai`)
- **GitHub Integration**: Octokit, GitHub Apps API, Webhooks, Checks API
- **Build System**: pnpm workspaces + Nx Monorepo Tools

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20+`
- **pnpm**: `v9+`
- **Docker Desktop**: For running PostgreSQL & Redis

### 2. Start Local Database & Redis
```bash
docker compose up -d
```
This starts:
- **PostgreSQL 16** on `localhost:5432` (`codelens:codelens_dev_password`)
- **Redis 7** on `localhost:6379`

### 3. Environment Setup
Copy `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
# Database & Redis
DATABASE_URL="postgresql://codelens:codelens_dev_password@localhost:5432/codelens?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379

# Google Gemini AI
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-flash-latest"

# GitHub App Credentials
GITHUB_APP_ID="4615691"
GITHUB_CLIENT_ID="your_client_id"
GITHUB_CLIENT_SECRET="your_client_secret"
GITHUB_WEBHOOK_SECRET="rushi_pr_bot_webhook_secret_2026"
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Next.js & Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super_secret_jwt_key_2026"
NEXT_PUBLIC_API_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
```

### 4. Install Dependencies & Push Database Schema
```bash
pnpm install
pnpm db:generate
pnpm db:push
```

### 5. Start the Development Stack
```bash
pnpm run dev
```

- 🌐 **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- ⚡ **Backend API**: [http://localhost:4000](http://localhost:4000)

---

## 🤖 GitHub App Setup Guide

1. Go to **GitHub Settings > Developer Settings > GitHub Apps > New GitHub App**.
2. **App Name**: `Rushi-PR-Review-Bot` (or your chosen name).
3. **Webhook URL**: `https://your-domain.com/webhooks/github` (use `smee.io` or `localtunnel` for local testing).
4. **Webhook Secret**: Must match `GITHUB_WEBHOOK_SECRET` in `.env`.
5. **Repository Permissions**:
   - `Pull requests`: **Read & Write**
   - `Checks`: **Read & Write**
   - `Contents`: **Read-only**
   - `Metadata`: **Read-only**
6. **Subscribe to Webhook Events**:
   - `Pull request`
   - `Issue comment`
   - `Check run`
   - `Installation` & `Installation repositories`
7. Generate and download a **Private Key (`.pem`)** and set `GITHUB_PRIVATE_KEY` in `.env`.
8. Install the GitHub App on your repositories via **Install App**.

---

## ☁️ Deployment on Render

This repository includes a [`render.yaml`](./render.yaml) blueprint for 1-click deployment.

### Steps:
1. Push your repository to GitHub.
2. Open **[dashboard.render.com](https://dashboard.render.com)**.
3. Click **New +** → **Blueprint** → Select your repository.
4. Render will automatically provision:
   - 🐘 **PostgreSQL Database** (`codelens-db`)
   - ⚡ **Backend API Service** (`codelens-api`)
   - 🌐 **Frontend Web Service** (`codelens-web`)
5. In the **Environment** settings for `codelens-api`, enter your `GEMINI_API_KEY`, `GITHUB_APP_ID`, and `GITHUB_PRIVATE_KEY`.
6. Update your GitHub App's **Webhook URL** to your Render API URL: `https://your-api.onrender.com/webhooks/github`.

---

## 📜 License

MIT License © 2026 **Rushi Karlekar**. All rights reserved.

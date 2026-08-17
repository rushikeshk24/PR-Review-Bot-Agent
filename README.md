# CodeLens AI — PR-based Code Review Bot

An intelligent, multi-language GitHub App that automatically reviews Pull Requests using **Google Gemini 2.0 (Structured Output)**, posts inline comments with suggested fixes, sets **required GitHub Check Runs** to block bad merges, and provides maintainers with a **1-click override command** and a full-featured admin dashboard.

---

## 🌟 Key Architecture & Capabilities

```
GitHub Webhook (PR Open / Synchronize)
  └──> Fastify Webhook Receiver (HMAC-SHA256 verified)
        └──> BullMQ Async Queue (Redis)
              └──> Review Worker
                    ├──> Fetch PR diff + full context from GitHub REST API
                    ├──> Filter out ignored files & lockfiles
                    ├──> Inject language-specific hints (15+ languages)
                    ├──> Google Gemini 2.0 (JSON Schema constrained output)
                    ├──> Deduplicate & map lines to valid diff hunks
                    ├──> Post PR Review (summary + inline comments)
                    └──> Update Check Run (success | failure | neutral)
```

1. **Multi-Language LLM Reasoning**: Works out-of-the-box on TypeScript, JavaScript, Python, Go, Rust, Java, C#, SQL, Shell, Dockerfiles, etc.
2. **Merge Blocking & Check Runs**: Creates a `CodeLens AI Review` Check Run. In Strict Mode, failing reviews block the PR merge via standard GitHub branch protection rules.
3. **Override Flow**: Maintainers with `write` permission can comment `/codelens override [optional reason]` to transition the check to `neutral`, unlocking the PR with an immutable audit log.
4. **Admin Dashboard**: Next.js 14 web app for per-repo configuration (strict vs advisory, severity threshold, ignored globs, custom rules), review history, and billing.
5. **GitHub Marketplace Billing**: Built-in webhook handling for `marketplace_purchase` events (Free, Pro, Team tiers).

---

## 🏗️ Monorepo Structure

```
codelens-ai/
├── apps/
│   ├── api/                      # NestJS + Fastify webhook receiver & review worker
│   └── web/                      # Next.js 14 App Router admin console
├── packages/
│   ├── shared/                   # Zod schemas, types, language hints, constants
│   ├── database/                 # Prisma ORM schema & PostgreSQL tenant client
│   └── tsconfig/                 # Shared TypeScript base configs
├── docker-compose.yml            # Local PostgreSQL 16 + Redis 7
├── nx.json                       # Nx task runner & caching configuration
├── pnpm-workspace.yaml
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20+`
- **pnpm**: `v9+`
- **Docker**: For running Postgres and Redis

### 2. Start Local Infrastructure
```bash
docker compose up -d
```
This starts:
- **PostgreSQL 16** on `localhost:5432` (`codelens:codelens_dev_password`)
- **Redis 7** on `localhost:6379`

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
- `GEMINI_API_KEY`: From [Google AI Studio](https://aistudio.google.com/)
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`: From your GitHub App settings

### 4. Install Dependencies & Generate Database Client
```bash
pnpm install
pnpm db:generate
pnpm db:push
```

### 5. Start Development Servers
```bash
pnpm dev
```
- **API Server / Webhook Receiver**: `http://localhost:4000`
- **Admin Dashboard**: `http://localhost:3000`

---

## 🤖 GitHub App Registration Guide

To connect CodeLens AI to GitHub:

1. Go to **GitHub Settings > Developer Settings > GitHub Apps > New GitHub App**.
2. **App Name**: `CodeLens AI` (or your preferred name).
3. **Webhook URL**: `https://your-domain.com/webhooks/github` (use `smee.io` or `ngrok` for local dev).
4. **Webhook Secret**: Generate a random high-entropy string and set in `.env` as `GITHUB_WEBHOOK_SECRET`.
5. **Permissions**:
   - `Pull requests`: **Read & Write**
   - `Checks`: **Read & Write**
   - `Contents`: **Read-only**
   - `Metadata`: **Read-only**
6. **Subscribe to Webhook Events**:
   - `Pull request`
   - `Issue comment`
   - `Check run`
   - `Installation`
   - `Installation repositories`
   - `Marketplace purchase`
7. Generate and download a **Private Key (`.pem`)**, and record the **App ID**.

---

## 🛡️ Manual Override Command

If a review flags a false positive or intentional exception, any repository collaborator with `write` access can comment on the PR:

```
/codelens override Intentional design decision approved in RFC-42
```

The bot will immediately:
1. Validate collaborator permissions.
2. Update the Check Run from `failure` to `neutral`.
3. Record an audit log entry in the database.

---

## 📦 Production Hosting on Railway / Render

1. **Database & Redis**: Provision managed PostgreSQL and Redis instances on Railway/Render.
2. **API Service (`apps/api`)**:
   - Build Command: `pnpm --filter @codelens/api build`
   - Start Command: `node apps/api/dist/main.js`
   - Port: `4000`
3. **Web Service (`apps/web`)**:
   - Build Command: `pnpm --filter @codelens/web build`
   - Start Command: `pnpm --filter @codelens/web start`
   - Port: `3000`
"# PR-Review-Bot-Agent" 

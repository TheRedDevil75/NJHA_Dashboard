# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Acute Care Symptom Tracker — a web-based data collection tool for ~100 concurrent hospital reporters with an admin control panel. Built as a TypeScript monorepo (npm workspaces) with Express backend and React frontend.

## Commands

### Development
```bash
# Run both servers (two terminals)
npm run dev:api     # Express API on :3001
npm run dev:web     # Vite dev server on :5173

# Database
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Apply pending migrations (production)
npx prisma migrate dev --workspace=apps/api  # Create + apply migration (dev)
npm run db:seed       # Seed initial data (admin user, defaults, theme)
```

### Build & Deploy
```bash
npm run build:api   # Compile TypeScript → apps/api/dist/
npm run build:web   # tsc check + Vite bundle → apps/web/dist/
```

There is no lint or test script — no linter or test framework is configured.

## Architecture

### Monorepo Layout
- `apps/api/` — Express + Prisma backend
- `apps/web/` — React + Vite frontend
- `packages/shared/` — Shared TypeScript types (minimal)

### Backend (`apps/api/src/`)
- `index.ts` — Server entry point; mounts all middleware and route groups
- `middleware/auth.ts` — JWT sign/verify helpers and `requireAuth`/`requireAdmin` middleware
- `middleware/errorHandler.ts` — `ApiError` class; unified error response format
- `lib/prisma.ts` — Singleton Prisma client
- `routes/` — Route handlers grouped by `auth`, `submissions`, `fields`, `admin/*`
- `scheduler/periodScheduler.ts` — node-cron job (every minute) that auto-rotates `CollectionPeriod` records; supports both fixed-interval and day-of-week (`resetDays`) scheduling using native `Intl` API (no timezone library)

### Frontend (`apps/web/src/`)
- `context/AuthContext.tsx` — Login state, token storage in localStorage, permission checks
- `context/ThemeContext.tsx` — Loads theme from API; writes CSS variables to `document.documentElement`
- `context/PeriodContext.tsx` — Current collection period; polls API every 60 seconds
- `api/client.ts` — Axios instance with Bearer token injection interceptor and auto-redirect on 401; exports namespaced API objects (`authApi`, `adminUsersApi`, etc.)
- `App.tsx` — React Router v6 routes; `RequireAuth` and `RequireAdmin` guards
- `pages/` — One file per page; admin pages under `pages/admin/`

### Database Models (Prisma)
- `User` — username/passwordHash/role (ADMIN|USER)/assignedHospitalId/isActive/requiresPasswordChange
- `Hospital` — name/shortCode (both unique)/isActive
- `PatientField` — dynamic field definitions (label/key/sortOrder/isActive); seeded with Alcohol Related, Virus, MCI
- `IntervalConfig` — collection schedule config; `resetDays` (int[]) for weekday-based scheduling OR `intervalValue`+`intervalType` for fixed intervals; only one `isActive` at a time
- `CollectionPeriod` — time-bounded submission window; null `endedAt` = currently active; never deleted, archived instead
- `Submission` + `SubmissionValue` — normalized submission data (one row per field per submission)
- `ThemeConfig` — singleton row for app appearance (colors, fonts, button/card styles)
- `AuditLog` — immutable; records LOGIN_SUCCESS/FAILURE, LOGOUT, PASSWORD_CHANGED, PERIOD_ROTATED, etc.

### Key Patterns
- Vite proxies `/api` → `http://localhost:3001` in dev; frontend uses only relative `/api/...` paths
- All DB queries go through Prisma (no raw SQL)
- Zod schemas used for request validation on both frontend (React Hook Form) and backend route handlers
- Theme changes apply live via CSS variables without page reload
- Rate limiting on `/api/auth/login`: 10 req / 15 min per IP

## Environment Variables

Copy `.env.example` → `.env` in repo root (or `apps/api/`):

```
DATABASE_URL=postgresql://user:password@localhost:5432/njha_symptom_tracker
JWT_SECRET=<32+ char random string>
JWT_EXPIRY=8h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<initial admin password>
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Deployment

- Backend runs under PM2 as `njha-dashboard` (`node dist/index.js`)
- Frontend served as static files from `apps/web/dist/` (nginx)
- Prisma migrations must be applied before starting: `npm run db:migrate`
- Seed once on first deploy: `npm run db:seed`

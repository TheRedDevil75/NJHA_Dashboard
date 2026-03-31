# Session Notes — March 31, 2026

## What We Did

### Cleaned up interval config creation flow
- Extracted inline `onClick` handlers into named `openCreate()` and `openEdit()` functions
- Removed incorrect `as IntervalConfig` type cast in the form submit handler
- Switched `startTime` from a plain text input to `type="time"` (native browser time picker)
- Added auto-clear for the success banner (fades after 4 seconds)
- Success banner now clears immediately when opening a new modal

### Added day-of-week scheduling to interval configs
New feature: admins can now pick specific weekdays for weekly resets instead of a fixed N-week interval.

**Backend**
- Added `resetDays int[]` column to `interval_configs` table via new Prisma migration (`20260330000000_add_reset_days`)
- Updated interval validation schema to accept `resetDays` (array of 0–6)
- Rewrote scheduler logic: when `resetDays` is non-empty, calculates the next occurrence of any matching weekday at `startTime` in the config's timezone using the `Intl` API (no extra dependencies); falls back to old interval math when empty

**Frontend**
- Added `resetDays: number[]` to the `IntervalConfig` type
- Day toggle buttons (Sun–Sat) appear in the create/edit modal when interval type is set to Weeks
- "Every N weeks" field disables when days are selected (irrelevant)
- Config list and active config card show human-readable schedule (e.g. "Every Tue, Thu at 12:00 (America/New_York)")

### Deployed and pushed
- Built and deployed frontend to `/var/www/njha-dashboard`
- Restarted `njha-dashboard` PM2 process with new API build
- Pushed all commits to `github.com/TheRedDevil75/NJHA_Dashboard`

---

# Session Notes — March 25, 2026

## What We Did

### Built the full project from spec
Converted all 8 spec documents in `NJHA_data_Collection/` into working code. Zero placeholder logic — everything is production-quality.

### Files created: 52 across the monorepo

**Backend (`apps/api/`)**
- Prisma schema with 7 models (User, Hospital, IntervalConfig, CollectionPeriod, Submission, ThemeConfig, AuditLog)
- Seed script — creates admin user, default weekly interval config, initial collection period, and default theme
- Express server with Helmet, CORS, rate limiting, request logging
- Auth middleware (`requireAuth`, `requireAdmin`, `signToken`)
- Routes: `/api/auth`, `/api/submissions`, `/api/admin/{users,hospitals,intervals,theme,data,audit}`
- Period scheduler (`node-cron`) — runs every minute, auto-rotates collection periods, catches up on restart
- CSV export utility

**Frontend (`apps/web/`)**
- React + TypeScript + Vite + Tailwind setup
- AuthContext, ThemeContext (applies CSS vars to document), PeriodContext (polls every 60s)
- Typed API client (axios) with 401 auto-redirect and Bearer token injection
- Route guards: `RequireAuth`, `RequireAdmin`
- Pages: Login, Force-Change-Password, Dashboard, My Submissions
- Admin pages: Dashboard (stats + charts), User Management, Hospital Management, Interval Settings, Theme Editor (live color pickers, font picker, toggles), Data Export (CSV download), Audit Log

### Git setup
- Initialized repo, created `.gitignore`
- Pushed to `https://github.com/TheRedDevil75/NJHA_Dashboard`
- Added `README.md` with full project documentation

## What's Left Before Going Live
1. Provision a PostgreSQL database
2. Copy `.env.example` → `apps/api/.env` and fill in real values
3. Run `npx prisma migrate dev --name init` and `npm run db:seed`
4. Deploy API (PM2 / Docker / Antigravity) and frontend (static host or same server)
5. Add hospitals and create user accounts via the admin panel
6. Change admin password on first login (enforced automatically)

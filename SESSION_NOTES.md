# Session Notes — April 2, 2026

## What We Did

### Replaced "Submissions by Hospital" chart with Hospital Activity donut

**Backend**
- Added `GET /api/admin/data/reporter-activity` to `apps/api/src/routes/admin/data.ts`
- Counts active hospitals (not individual users) and checks which have at least one submission in the current period via `distinct: ['hospitalId']`
- Returns `{ submitted, notSubmitted, byHospital: { name, hasSubmitted }[] }`

**Frontend**
- Created `apps/web/src/components/ReporterActivityChart.tsx` — Recharts donut (submitted vs. not yet submitted) + scrollable per-hospital status table with "Done" (green) / "Not In" (amber) badges
- Added `adminDataApi.reporterActivity()` to `apps/web/src/api/client.ts`
- Wired into `AdminDashboard.tsx` — fetched in parallel with existing data calls; replaces the old horizontal progress-bar "by hospital" card

**Bugs fixed during session**
- Chart was silently hidden when `total === 0` — removed early return, now always renders with a grey "No hospitals" state
- Denominator was counting reporter users instead of hospitals — fixed to count distinct hospitals
- Chart was slightly cut off at the top — increased `ResponsiveContainer` height and shifted `cy` to `45%`
- "Pending" column label was confusing — replaced two numeric columns with a single "Status" column

### Deployment issue identified and logged
- Dashboard API runs on port **3002**, not 3001
- `njha-dashboard` is this project's PM2 process; `njhcc-server` (port 3001) is a completely separate app — do not restart it
- Memory updated to record this permanently

### Security review + hardening
Ran a full security review. Key finding: `.env` was **not** in git (false alarm from the review tool). All other issues fixed:

| Severity | Fix |
|---|---|
| High | Server now exits at startup if `JWT_SECRET` is missing or < 32 chars |
| High/Med | `FRONTEND_URL` validated as a valid URL at startup |
| High | Audit log `from`/`to` params now validated with Zod `datetime()` — invalid dates return 400 |
| Low | Audit `action` param validated against a strict enum of known action types |
| Medium | Rate limiter added to `POST /api/admin/users/import` (50 req/hr) |
| Medium | `logoUrl` in theme now restricted to `https://` or relative URLs only |
| Low | CSV export filename sanitized — `req.params.id` stripped to alphanumeric/dash/underscore |

**Remaining known issue:** JWT stored in `localStorage` (XSS risk). Migrating to httpOnly cookies is a larger refactor — deferred.

---

# Session Notes — April 1, 2026

## What We Did

### Added Submissions Over Time chart to Admin Dashboard
- Installed `recharts` (v3.8.1) as a frontend dependency
- Created `apps/web/src/components/SubmissionsOverTimeChart.tsx` — a line chart showing submission counts per collection period over time, using the theme's primary color
- Wired into `AdminDashboard`: fetches `/api/admin/data/periods` in parallel with existing current-period data; chart always renders (shows a placeholder message when no periods exist)
- Data comes from `GET /api/admin/data/periods` which already included `_count.submissions` via Prisma

### Deployment lesson: always copy dist to nginx root
The app is served by nginx from `/var/www/njha-dashboard/`, not from `apps/web/dist/`. Running `npm run build:web` alone is not enough — built files must be copied over:

```bash
npm run build:web
cp -r apps/web/dist/* /var/www/njha-dashboard/
```

Without the `cp` step, the browser keeps serving the old bundle regardless of hard refreshes. This caused significant confusion during debugging (the chart appeared not to render, when it was simply never deployed).

### Feature backlog created
Planned 8 UX/feature improvements for a future session. Saved to memory. See `FEATURE_BACKLOG.md` for full details.

**Quick wins (no schema changes):**
1. Duplicate submission warning for reporters
2. Persistent confirmation summary after submit
3. Last Login column in user management table
4. Non-submitters report on admin dashboard

**Medium features:**
5. Reporter edit/delete own submissions (while period is active)
6. Period-over-period delta comparison on admin dashboard
7. Date-range CSV export across multiple periods

**Larger feature (schema change):**
8. Per-field min/max validation (adds `minValue`/`maxValue` to `PatientField`)

---

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

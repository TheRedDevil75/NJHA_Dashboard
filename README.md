# Acute Care Symptom Tracker

A web-based data collection tool for gathering symptom reports across acute care hospital environments. Designed for ~100 concurrent reporters with a full admin control panel.

---

## Features

### For Reporters (Users)
- Simple login with personal credentials
- Submit symptom reports in under 30 seconds
- Three symptom categories: **Intoxication**, **Stomach Issues**, **Flu**
- Hospital selector (pre-fills assigned hospital)
- Optional severity and notes fields (admin-controlled)
- View your submission history for the current period
- Live countdown to next data reset

### For Administrators
- **User Management** — create, edit, deactivate, and reset passwords for up to 100 users
- **Hospital Management** — add and manage acute care hospital records
- **Collection Intervals** — configure automatic data reset periods (hourly / daily / weekly) with timezone support
- **Manual Reset** — force-end the current period at any time
- **Appearance Editor** — customize colors, fonts, button styles, app name, and branding live
- **Data & Export** — view submissions by period with filters, download CSV exports
- **Audit Log** — immutable log of all system events (logins, submissions, resets, password changes)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15+ |
| Auth | JWT + bcrypt |
| Scheduler | node-cron |

**Monorepo structure:**
```
/
├── apps/
│   ├── api/        # Express backend
│   └── web/        # React frontend
└── packages/
    └── shared/     # Shared types
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm 10+

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example apps/api/.env
```
Edit `apps/api/.env` with your database URL, JWT secret, and admin credentials.

### 3. Set up the database
```bash
cd apps/api
npx prisma migrate dev --name init
cd ../..
npm run db:seed
```

### 4. Run in development
```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:web
```

App runs at **http://localhost:5173**

### 5. First login
- Username: value of `ADMIN_USERNAME` in your `.env` (default: `admin`)
- Password: value of `ADMIN_PASSWORD` in your `.env`
- You will be prompted to change your password on first login

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/njha` |
| `JWT_SECRET` | Long random string for signing tokens | `your-32+-char-secret` |
| `JWT_EXPIRY` | Token lifetime | `8h` |
| `ADMIN_USERNAME` | Admin account username (seed only) | `admin` |
| `ADMIN_PASSWORD` | Admin initial password (seed only) | `SecurePass123!` |
| `NODE_ENV` | Environment | `development` / `production` |
| `PORT` | API port | `3001` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start API in watch mode |
| `npm run dev:web` | Start Vite dev server |
| `npm run build:api` | Compile API TypeScript |
| `npm run build:web` | Build frontend for production |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run pending migrations (production) |
| `npm run db:seed` | Seed admin user + defaults |

---

## Data Model Overview

- **Users** — reporter accounts with optional hospital assignment and role (USER / ADMIN)
- **Hospitals** — acute care facilities linked to submissions
- **IntervalConfig** — configures how collection periods work (hours / days / weeks)
- **CollectionPeriod** — bounded time windows; data belongs to a period, never deleted
- **Submissions** — individual symptom reports (Intoxication / Stomach Issues / Flu)
- **ThemeConfig** — singleton row controlling all UI appearance settings
- **AuditLog** — immutable record of all system events

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens signed HS256, expire per `JWT_EXPIRY`
- Admin routes protected server-side by role check middleware
- Rate limiting on `/api/auth/login` (10 requests / 15 min per IP)
- CORS restricted to `FRONTEND_URL` only
- Helmet sets secure HTTP headers
- No raw SQL — all queries via Prisma parameterized client

---

## License

Private project. All rights reserved.

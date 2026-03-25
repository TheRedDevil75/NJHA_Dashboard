# Acute Care Symptom Tracker — Setup Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+ (for workspaces)

---

## 1. Install Dependencies

From the project root:

```bash
npm install
```

---

## 2. Configure Environment

Copy `.env.example` to `.env` inside `apps/api/` and fill in:

```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/njha_symptom_tracker"
JWT_SECRET="your-long-random-secret-here"
JWT_EXPIRY="8h"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="YourSecurePassword123!"
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:5173"
```

---

## 3. Set Up the Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
cd apps/api && npx prisma migrate dev --name init

# Seed the database (creates admin user + default interval config + theme)
npm run db:seed
```

---

## 4. Run in Development

Open two terminals:

**Terminal 1 — API:**
```bash
npm run dev:api
```

**Terminal 2 — Web:**
```bash
npm run dev:web
```

The app will be at: http://localhost:5173

---

## 5. First Login

- URL: http://localhost:5173/login
- Username: `admin` (or whatever you set in `ADMIN_USERNAME`)
- Password: whatever you set in `ADMIN_PASSWORD`
- **You will be required to change your password on first login.**

---

## 6. Initial Configuration

After logging in as admin:

1. **Add Hospitals** → Admin → Hospitals → Add Hospital
2. **Create Users** → Admin → Users → Add User (assign to hospitals)
3. **Configure Interval** → Admin → Collection Intervals (default is weekly Monday reset)
4. **Customize Appearance** → Admin → Appearance

---

## Production Build

```bash
npm run build:api
npm run build:web
```

The web build outputs to `apps/web/dist/`. Serve it with Nginx or equivalent.
The API runs with `npm run start` inside `apps/api/`.

---

## Environment Variables (Production)

All env vars must be set on the server. Never commit `.env` to version control.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string (32+ chars) |
| `JWT_EXPIRY` | Token expiry e.g. `8h` |
| `ADMIN_USERNAME` | Admin account username (seed only) |
| `ADMIN_PASSWORD` | Admin initial password (seed only) |
| `NODE_ENV` | `production` |
| `PORT` | API port (default 3001) |
| `FRONTEND_URL` | Frontend origin for CORS |

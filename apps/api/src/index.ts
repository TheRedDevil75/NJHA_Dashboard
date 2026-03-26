import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
import submissionsRouter from './routes/submissions';
import fieldsRouter from './routes/fields';
import adminUsersRouter from './routes/admin/users';
import adminHospitalsRouter from './routes/admin/hospitals';
import adminIntervalsRouter from './routes/admin/intervals';
import adminThemeRouter from './routes/admin/theme';
import adminDataRouter from './routes/admin/data';
import adminAuditRouter from './routes/admin/audit';
import adminFieldsRouter from './routes/admin/fields';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './scheduler/periodScheduler';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ── Security middleware ────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Request logger ─────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Rate limiting on auth ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/fields', fieldsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/hospitals', adminHospitalsRouter);
app.use('/api/admin/intervals', adminIntervalsRouter);
app.use('/api/admin/theme', adminThemeRouter);
app.use('/api/admin/data', adminDataRouter);
app.use('/api/admin/audit', adminAuditRouter);
app.use('/api/admin/fields', adminFieldsRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error handler (must be last) ──────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  startScheduler();
});

export default app;

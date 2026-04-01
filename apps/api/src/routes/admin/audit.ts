import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';

const AUDIT_ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGED',
  'PERIOD_ROTATED', 'SUBMISSION_CREATED', 'SUBMISSION_DELETED',
  'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED',
  'HOSPITAL_CREATED', 'HOSPITAL_UPDATED', 'HOSPITAL_DEACTIVATED',
  'FIELD_CREATED', 'FIELD_UPDATED', 'FIELD_DELETED',
  'THEME_UPDATED', 'INTERVAL_CREATED', 'INTERVAL_UPDATED', 'INTERVAL_ACTIVATED',
] as const;

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  userId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

const router = Router();
router.use(requireAdmin);

// GET /api/admin/audit?page=1&action=&userId=&from=&to=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = auditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid query parameters.', parsed.error.flatten());
    }

    const { page: rawPage, action, userId, from, to } = parsed.data;
    const page = rawPage ?? 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

export default router;

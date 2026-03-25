import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/audit?page=1&action=&userId=&from=&to=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = 50;
    const skip = (page - 1) * limit;
    const action = req.query.action as string | undefined;
    const userId = req.query.userId as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

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

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/fields — active fields for the submission form
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await prisma.patientField.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ fields });
  } catch (err) { next(err); }
});

export default router;

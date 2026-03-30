import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';
import { rotatePeriod } from '../../scheduler/periodScheduler';

const router = Router();
router.use(requireAdmin);

const intervalSchema = z.object({
  name: z.string().min(1).max(100),
  intervalType: z.enum(['HOURS', 'DAYS', 'WEEKS']),
  intervalValue: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime must be HH:MM'),
  timezone: z.string().min(1),
  resetDays: z.array(z.number().int().min(0).max(6)).default([]),
});

// GET /api/admin/intervals
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await prisma.intervalConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { periods: true } } },
    });
    res.json({ configs });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/intervals
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = intervalSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid interval data.', parsed.error.flatten());
    }

    const config = await prisma.intervalConfig.create({
      data: { ...parsed.data, isActive: false },
    });

    res.status(201).json({ config });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/intervals/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = intervalSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid interval data.', parsed.error.flatten());
    }

    const existing = await prisma.intervalConfig.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Interval config not found.');

    const config = await prisma.intervalConfig.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ config });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/intervals/:id/activate — set this config as the active one
router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.intervalConfig.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Interval config not found.');

    // Deactivate all others, activate this one
    await prisma.$transaction([
      prisma.intervalConfig.updateMany({ data: { isActive: false } }),
      prisma.intervalConfig.update({ where: { id: req.params.id }, data: { isActive: true } }),
    ]);

    res.json({ message: 'Interval config activated.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/intervals/trigger-reset — manual period reset
router.post('/trigger-reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rotatePeriod(req.user!.sub, req.ip);
    res.json({ message: 'Collection period reset. A new period has started.' });
  } catch (err) {
    next(err);
  }
});

export default router;

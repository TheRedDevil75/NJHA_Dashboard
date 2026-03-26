import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const submissionSchema = z.object({
  hospitalId: z.string().min(1),
  alcoholRelated: z.number().int().min(0),
  virus: z.number().int().min(0),
  mci: z.number().int().min(0),
  notes: z.string().max(1000).optional(),
});

// POST /api/submissions
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid submission data.', parsed.error.flatten());
    }

    const { hospitalId, alcoholRelated, virus, mci, notes } = parsed.data;

    // Verify active collection period exists
    const activePeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
    });
    if (!activePeriod) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'No active collection period. Please contact your administrator.');
    }

    // Verify hospital is active
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital || !hospital.isActive) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selected hospital is not active.');
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.sub,
        hospitalId,
        collectionPeriodId: activePeriod.id,
        alcoholRelated,
        virus,
        mci,
        notes: notes ?? null,
        submittedAt: new Date(),
      },
      include: {
        hospital: { select: { id: true, name: true, shortCode: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'SUBMISSION_CREATED',
        details: { submissionId: submission.id, alcoholRelated, virus, mci, hospitalId },
        ipAddress: req.ip,
      },
    });

    res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
});

// GET /api/submissions/my
router.get('/my', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activePeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
    });

    if (!activePeriod) {
      return res.json({ submissions: [], period: null });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: req.user!.sub,
        collectionPeriodId: activePeriod.id,
      },
      include: {
        hospital: { select: { id: true, name: true, shortCode: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ submissions, period: activePeriod });
  } catch (err) {
    next(err);
  }
});

export default router;

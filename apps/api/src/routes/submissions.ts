import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const submissionSchema = z.object({
  hospitalId: z.string().min(1),
  values: z.array(z.object({
    fieldId: z.string().min(1),
    value: z.number().int().min(0),
  })),
  notes: z.string().max(1000).optional(),
});

// POST /api/submissions
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid submission data.', parsed.error.flatten());
    }

    const { hospitalId, values, notes } = parsed.data;

    // Verify active collection period exists
    const activePeriod = await prisma.collectionPeriod.findFirst({ where: { isActive: true } });
    if (!activePeriod) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'No active collection period. Please contact your administrator.');
    }

    // Verify hospital is active
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital || !hospital.isActive) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selected hospital is not active.');
    }

    // Validate all fieldIds are active patient fields
    if (values.length > 0) {
      const fieldIds = values.map((v) => v.fieldId);
      const activeFields = await prisma.patientField.findMany({
        where: { id: { in: fieldIds }, isActive: true },
        select: { id: true },
      });
      const activeFieldIds = new Set(activeFields.map((f) => f.id));
      const invalid = fieldIds.find((id) => !activeFieldIds.has(id));
      if (invalid) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'One or more field IDs are invalid or inactive.');
      }
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.sub,
        hospitalId,
        collectionPeriodId: activePeriod.id,
        notes: notes ?? null,
        submittedAt: new Date(),
        values: {
          create: values.map(({ fieldId, value }) => ({ fieldId, value })),
        },
      },
      include: {
        hospital: { select: { id: true, name: true, shortCode: true } },
        values: { include: { field: true }, orderBy: { field: { sortOrder: 'asc' } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'SUBMISSION_CREATED',
        details: { submissionId: submission.id, hospitalId, valueCount: values.length },
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
    const activePeriod = await prisma.collectionPeriod.findFirst({ where: { isActive: true } });

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
        values: { include: { field: true }, orderBy: { field: { sortOrder: 'asc' } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ submissions, period: activePeriod });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { buildCsv } from '../../utils/csv';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/data/periods
router.get('/periods', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const periods = await prisma.collectionPeriod.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        intervalConfig: { select: { name: true, intervalType: true, intervalValue: true } },
        _count: { select: { submissions: true } },
      },
    });
    res.json({ periods });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/data/current
router.get('/current', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const period = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
      include: { intervalConfig: true },
    });

    if (!period) return res.json({ period: null, stats: null });

    const submissions = await prisma.submission.findMany({
      where: { collectionPeriodId: period.id },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        hospital: { select: { id: true, name: true, shortCode: true } },
      },
    });

    const byType = {
      INTOXICATION: submissions.filter((s) => s.symptomType === 'INTOXICATION').length,
      STOMACH_ISSUES: submissions.filter((s) => s.symptomType === 'STOMACH_ISSUES').length,
      FLU: submissions.filter((s) => s.symptomType === 'FLU').length,
    };

    const byHospital: Record<string, { name: string; count: number }> = {};
    for (const s of submissions) {
      const key = s.hospital.id;
      if (!byHospital[key]) byHospital[key] = { name: s.hospital.name, count: 0 };
      byHospital[key].count++;
    }

    // Top 5 users
    const userCounts: Record<string, { username: string; displayName: string | null; count: number }> = {};
    for (const s of submissions) {
      const key = s.user.id;
      if (!userCounts[key]) userCounts[key] = { username: s.user.username, displayName: s.user.displayName, count: 0 };
      userCounts[key].count++;
    }
    const topUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      period,
      stats: {
        total: submissions.length,
        byType,
        byHospital: Object.values(byHospital),
        topUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/data/periods/:id/submissions
router.get('/periods/:id/submissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = 50;
    const skip = (page - 1) * limit;
    const hospitalId = req.query.hospitalId as string | undefined;
    const symptomType = req.query.symptomType as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: Record<string, unknown> = { collectionPeriodId: req.params.id };
    if (hospitalId) where.hospitalId = hospitalId;
    if (symptomType) where.symptomType = symptomType;
    if (userId) where.userId = userId;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          hospital: { select: { id: true, name: true, shortCode: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({ submissions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/data/periods/:id/export
router.get('/periods/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = await prisma.collectionPeriod.findUnique({
      where: { id: req.params.id },
    });
    if (!period) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Period not found.' } });
      return;
    }

    const hospitalId = req.query.hospitalId as string | undefined;
    const symptomType = req.query.symptomType as string | undefined;

    const where: Record<string, unknown> = { collectionPeriodId: req.params.id };
    if (hospitalId) where.hospitalId = hospitalId;
    if (symptomType) where.symptomType = symptomType;

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        user: { select: { username: true, displayName: true } },
        hospital: { select: { name: true, shortCode: true } },
        collectionPeriod: { select: { startedAt: true, endedAt: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const csv = buildCsv(submissions, period);
    const filename = `submissions_period_${req.params.id}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;

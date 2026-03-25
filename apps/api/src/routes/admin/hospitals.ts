import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';

const router = Router();
router.use(requireAdmin);

const hospitalSchema = z.object({
  name: z.string().min(1).max(200),
  shortCode: z.string().min(1).max(6).regex(/^[A-Za-z0-9]+$/, 'Short code must be alphanumeric'),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
});

// GET /api/admin/hospitals
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, submissions: true },
        },
      },
    });
    res.json({ hospitals });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/hospitals
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = hospitalSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid hospital data.', parsed.error.flatten());
    }

    const { name, shortCode, address, city, state } = parsed.data;
    const normalizedCode = shortCode.toUpperCase();

    const [nameExists, codeExists] = await Promise.all([
      prisma.hospital.findUnique({ where: { name } }),
      prisma.hospital.findUnique({ where: { shortCode: normalizedCode } }),
    ]);
    if (nameExists) throw new ApiError(409, 'CONFLICT', 'A hospital with this name already exists.');
    if (codeExists) throw new ApiError(409, 'CONFLICT', 'A hospital with this short code already exists.');

    const hospital = await prisma.hospital.create({
      data: { name, shortCode: normalizedCode, address, city, state },
    });

    res.status(201).json({ hospital });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/hospitals/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = hospitalSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid hospital data.', parsed.error.flatten());
    }

    const existing = await prisma.hospital.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Hospital not found.');

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.shortCode !== undefined) data.shortCode = parsed.data.shortCode.toUpperCase();
    if (parsed.data.address !== undefined) data.address = parsed.data.address;
    if (parsed.data.city !== undefined) data.city = parsed.data.city;
    if (parsed.data.state !== undefined) data.state = parsed.data.state;

    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ hospital });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/hospitals/:id (soft deactivate)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.hospital.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Hospital not found.');

    await prisma.hospital.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Hospital deactivated.' });
  } catch (err) {
    next(err);
  }
});

export default router;

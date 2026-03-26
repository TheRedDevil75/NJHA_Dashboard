import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/fields
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await prisma.patientField.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { values: true } } },
    });
    res.json({ fields });
  } catch (err) { next(err); }
});

const createSchema = z.object({
  label: z.string().min(1).max(100),
  key: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, 'Key must start with a letter and contain only lowercase letters, numbers, and underscores'),
  sortOrder: z.number().int().min(0).optional(),
});

// POST /api/admin/fields
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid field data.', parsed.error.flatten());
    }
    const { label, key, sortOrder = 0 } = parsed.data;

    const existing = await prisma.patientField.findUnique({ where: { key } });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', `A field with key "${key}" already exists.`);
    }

    const field = await prisma.patientField.create({ data: { label, key, sortOrder } });
    res.status(201).json({ field });
  } catch (err) { next(err); }
});

const updateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/fields/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid update data.', parsed.error.flatten());
    }

    const field = await prisma.patientField.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({ field });
  } catch (err) { next(err); }
});

// DELETE /api/admin/fields/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valueCount = await prisma.submissionValue.count({ where: { fieldId: req.params.id } });
    if (valueCount > 0) {
      throw new ApiError(
        409, 'CONFLICT',
        'Cannot delete a field that has submission data. Deactivate it instead.'
      );
    }
    await prisma.patientField.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;

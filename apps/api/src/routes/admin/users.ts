import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';

const router = Router();
router.use(requireAdmin);

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[a-zA-Z]/)
  .regex(/[0-9]/);

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  password: passwordSchema,
  displayName: z.string().max(100).optional(),
  assignedHospitalId: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

const updateUserSchema = z.object({
  displayName: z.string().max(100).optional(),
  assignedHospitalId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

// GET /api/admin/users?page=1&search=&hospitalId=&role=&status=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = 25;
    const skip = (page - 1) * limit;
    const search = String(req.query.search ?? '');
    const hospitalId = req.query.hospitalId as string | undefined;
    const roleFilter = req.query.role as string | undefined;
    const statusFilter = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (hospitalId) where.assignedHospitalId = hospitalId;
    if (roleFilter === 'ADMIN' || roleFilter === 'USER') where.role = roleFilter;
    if (statusFilter === 'active') where.isActive = true;
    if (statusFilter === 'inactive') where.isActive = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          assignedHospitalId: true,
          assignedHospital: { select: { id: true, name: true, shortCode: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid user data.', parsed.error.flatten());
    }

    const { username, password, displayName, assignedHospitalId, role } = parsed.data;
    const normalizedUsername = username.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (exists) throw new ApiError(409, 'CONFLICT', 'Username already taken.');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        displayName,
        assignedHospitalId: assignedHospitalId || null,
        role,
      },
      select: {
        id: true, username: true, displayName: true, role: true,
        isActive: true, assignedHospitalId: true, createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'ACCOUNT_CREATED',
        details: { createdUserId: user.id, username: user.username },
        ipAddress: req.ip,
      },
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, username: true, displayName: true, role: true,
        isActive: true, lastLoginAt: true, assignedHospitalId: true,
        assignedHospital: { select: { id: true, name: true, shortCode: true } },
        createdAt: true, updatedAt: true,
        _count: { select: { submissions: true } },
      },
    });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid data.', parsed.error.flatten());
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User not found.');

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.displayName !== undefined && { displayName: parsed.data.displayName }),
        ...(parsed.data.assignedHospitalId !== undefined && { assignedHospitalId: parsed.data.assignedHospitalId }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        ...(parsed.data.role !== undefined && { role: parsed.data.role }),
      },
      select: {
        id: true, username: true, displayName: true, role: true,
        isActive: true, assignedHospitalId: true, updatedAt: true,
      },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id (soft deactivate)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.sub) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Cannot deactivate your own account.');
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User not found.');

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'ACCOUNT_DEACTIVATED',
        details: { targetUserId: req.params.id, username: existing.username },
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/import
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rowSchema = z.object({
      username: z.string().min(1).max(50),
      password: passwordSchema,
      displayName: z.string().max(100).optional(),
      assignedHospitalCode: z.string().optional(),
      role: z.enum(['USER', 'ADMIN']).default('USER'),
    });

    const bodySchema = z.object({ users: z.array(z.unknown()).min(1) });
    const bodyParsed = bodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Expected { users: [...] }');
    }

    // Pre-load hospitals for code lookup
    const hospitals = await prisma.hospital.findMany({ select: { id: true, shortCode: true } });
    const hospitalByCode = new Map(hospitals.map((h) => [h.shortCode.toUpperCase(), h.id]));

    const results: { row: number; username: string; status: 'created' | 'skipped'; reason?: string }[] = [];

    for (let i = 0; i < bodyParsed.data.users.length; i++) {
      const row = bodyParsed.data.users[i];
      const parsed = rowSchema.safeParse(row);
      if (!parsed.success) {
        results.push({ row: i + 1, username: String((row as Record<string, unknown>)?.username ?? ''), status: 'skipped', reason: 'Validation failed' });
        continue;
      }
      const { username, password, displayName, assignedHospitalCode, role } = parsed.data;
      const normalizedUsername = username.toLowerCase();

      const exists = await prisma.user.findUnique({ where: { username: normalizedUsername } });
      if (exists) {
        results.push({ row: i + 1, username, status: 'skipped', reason: 'Username already taken' });
        continue;
      }

      let assignedHospitalId: string | null = null;
      if (assignedHospitalCode) {
        assignedHospitalId = hospitalByCode.get(assignedHospitalCode.toUpperCase()) ?? null;
        if (!assignedHospitalId) {
          results.push({ row: i + 1, username, status: 'skipped', reason: `Hospital code '${assignedHospitalCode}' not found` });
          continue;
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: { username: normalizedUsername, passwordHash, displayName, assignedHospitalId, role },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.sub,
          action: 'ACCOUNT_CREATED',
          details: { importedUsername: normalizedUsername, via: 'bulk_import' },
          ipAddress: req.ip,
        },
      });

      results.push({ row: i + 1, username, status: 'created' });
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    res.status(201).json({ results, created, skipped });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({ newPassword: passwordSchema }).safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid password.', parsed.error.flatten());
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User not found.');

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash, requiresPasswordChange: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'PASSWORD_RESET_BY_ADMIN',
        details: { targetUserId: req.params.id, username: existing.username },
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Password reset.' });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, signToken } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body.', parsed.error.flatten());
    }

    const { username, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    // Generic error to prevent username enumeration
    const invalidCreds = new ApiError(401, 'UNAUTHORIZED', 'Invalid username or password.');

    if (!user || !user.isActive) {
      // Log failed attempt without revealing which field is wrong
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILURE',
          details: { attemptedUsername: username.toLowerCase() },
          ipAddress: req.ip,
        },
      });
      throw invalidCreds;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILURE',
          details: { reason: 'bad_password' },
          ipAddress: req.ip,
        },
      });
      throw invalidCreds;
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      requiresPasswordChange: user.requiresPasswordChange,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.ip,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        assignedHospitalId: user.assignedHospitalId,
        requiresPasswordChange: user.requiresPasswordChange,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user!.sub,
        action: 'LOGOUT',
        ipAddress: req.ip,
      },
    });
    res.json({ message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        assignedHospitalId: true,
        requiresPasswordChange: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User not found or inactive.');
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password
router.put('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body.', parsed.error.flatten());
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Current password is incorrect.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, requiresPasswordChange: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        ipAddress: req.ip,
      },
    });

    // Issue a fresh token with requiresPasswordChange: false
    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      requiresPasswordChange: false,
    });

    res.json({ message: 'Password changed.', token });
  } catch (err) {
    next(err);
  }
});

export default router;

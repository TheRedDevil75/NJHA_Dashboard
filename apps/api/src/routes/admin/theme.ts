import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import { ApiError } from '../../middleware/errorHandler';

const router = Router();

const themeSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  headerBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  headerTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.enum(['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Nunito', 'Source Sans Pro']).optional(),
  fontSizeBase: z.number().int().min(14).max(18).optional(),
  buttonStyle: z.enum(['rounded', 'square', 'pill']).optional(),
  cardStyle: z.enum(['flat', 'raised', 'bordered']).optional(),
  showSeverityField: z.boolean().optional(),
  showNotesField: z.boolean().optional(),
  loginMessage: z.string().max(1000).nullable().optional(),
  dashboardMessage: z.string().max(1000).nullable().optional(),
});

// GET /api/admin/theme — public (needed before login for login page styling)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let theme = await prisma.themeConfig.findFirst();
    if (!theme) {
      // Auto-create if missing (shouldn't happen after seed)
      theme = await prisma.themeConfig.create({ data: {} });
    }
    res.json({ theme });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/theme — admin only
router.put('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = themeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid theme data.', parsed.error.flatten());
    }

    let theme = await prisma.themeConfig.findFirst();
    if (!theme) {
      theme = await prisma.themeConfig.create({ data: {} });
    }

    const updated = await prisma.themeConfig.update({
      where: { id: theme.id },
      data: parsed.data,
    });

    res.json({ theme: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

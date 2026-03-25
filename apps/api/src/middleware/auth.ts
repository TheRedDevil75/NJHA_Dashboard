import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'ADMIN' | 'USER';
  requiresPasswordChange: boolean;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (req.user?.role !== 'ADMIN') {
      return next(new ApiError(403, 'FORBIDDEN', 'Admin access required.'));
    }
    next();
  });
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRY ?? '8h') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

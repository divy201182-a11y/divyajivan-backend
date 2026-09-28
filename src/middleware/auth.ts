import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { sendError } from '../utils/response';

// ── Types ──────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  userType: 'admin' | 'patient';
  role?: string;
}

// Extend the Express Request type so req.user is available everywhere
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Extract the Bearer token from the Authorization header.
 * Returns the token string, or null if the header is missing/malformed.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

// ── Middleware ──────────────────────────────────────────────────────

/**
 * Require a valid JWT.
 * On success, attaches the decoded payload to `req.user`.
 * On failure, responds with 401.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = extractToken(req);

  if (!token) {
    sendError(res, 'Authentication required. Please provide a valid token.', 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token.', 401);
  }
};

/**
 * Require the user to be an admin.
 * Calls `authenticate` first, then checks `userType`.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  authenticate(req, res, () => {
    if (!req.user || req.user.userType !== 'admin') {
      sendError(res, 'Access denied. Admin privileges required.', 403);
      return;
    }
    next();
  });
};

/**
 * Require the user to be a patient.
 * Calls `authenticate` first, then checks `userType`.
 */
export const requirePatient = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  authenticate(req, res, () => {
    if (!req.user || req.user.userType !== 'patient') {
      sendError(res, 'Access denied. Patient access required.', 403);
      return;
    }
    next();
  });
};

/**
 * Factory that creates middleware requiring one of the given roles.
 *
 * Usage:
 *   router.get('/reports', authenticate, requireRole('super_admin', 'manager'), handler);
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      sendError(res, `Access denied. Required role: ${roles.join(' or ')}.`, 403);
      return;
    }
    next();
  };
};

/**
 * Like `authenticate`, but does NOT fail when no token is present.
 * If a valid token exists it attaches the payload; otherwise req.user stays undefined.
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = extractToken(req);

  if (!token) {
    // No token — that's fine, just continue
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
  } catch {
    // Invalid token on an optional route — ignore it
    req.user = undefined;
  }

  next();
};

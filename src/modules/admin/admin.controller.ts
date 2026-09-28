import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { hashPassword, verifyPassword } from '../auth/auth.service';

// ─── Validation Schemas ────────────────────────────

const createAdminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'SUPPORT']),
});

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'SUPPORT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ─── Super Admin: Get All Admin Users ──────────────

export const getAdmins = asyncHandler(async (req: Request, res: Response) => {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, admins);
});

// ─── Super Admin: Create Admin User ────────────────

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { name, email, phone, password, role } = parsed.data;

  // Check if email already exists
  const existingEmail = await prisma.admin.findUnique({ where: { email } });
  if (existingEmail) {
    return sendError(res, 'Email is already in use', 409);
  }

  // Check if phone already exists (if provided)
  if (phone) {
    const existingPhone = await prisma.admin.findUnique({ where: { phone } });
    if (existingPhone) {
      return sendError(res, 'Phone number is already in use', 409);
    }
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.admin.create({
    data: { name, email, phone, passwordHash, role },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  // Fetch current admin name for activity log
  const currentAdmin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    currentAdmin?.name || 'Admin',
    'CREATE',
    'admins',
    admin.id,
    undefined,
    JSON.stringify({ name, email, role }),
    req.ip
  );

  return sendSuccess(res, admin, 'Admin user created', 201);
});

// ─── Super Admin: Update Admin User ────────────────

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updateAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Admin user not found', 404);
  }

  // Check email uniqueness if changing
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return sendError(res, 'Email is already in use', 409);
    }
  }

  // Check phone uniqueness if changing
  if (parsed.data.phone && parsed.data.phone !== existing.phone) {
    const phoneTaken = await prisma.admin.findUnique({ where: { phone: parsed.data.phone } });
    if (phoneTaken) {
      return sendError(res, 'Phone number is already in use', 409);
    }
  }

  const admin = await prisma.admin.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  const currentAdmin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    currentAdmin?.name || 'Admin',
    'UPDATE',
    'admins',
    id,
    JSON.stringify({ name: existing.name, email: existing.email, role: existing.role }),
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, admin, 'Admin user updated');
});

// ─── Super Admin: Delete Admin User ────────────────

export const deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Cannot delete self
  if (id === req.user!.userId) {
    return sendError(res, 'You cannot delete your own account', 400);
  }

  const existing = await prisma.admin.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Admin user not found', 404);
  }

  await prisma.admin.delete({ where: { id } });

  const currentAdmin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    currentAdmin?.name || 'Admin',
    'DELETE',
    'admins',
    id,
    JSON.stringify({ name: existing.name, email: existing.email }),
    undefined,
    req.ip
  );

  return sendSuccess(res, null, 'Admin user deleted');
});

// ─── Admin: Get Activity Logs ──────────────────────

export const getActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const module = req.query.module as string | undefined;
  const adminId = req.query.adminId as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const where: Record<string, unknown> = {};
  if (module) {
    where.module = module;
  }
  if (adminId) {
    where.adminId = adminId;
  }
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.adminActivityLog.count({ where }),
  ]);

  return sendPaginated(res, logs, total, page, limit);
});

// ─── Admin: Get My Profile ─────────────────────────

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admin) {
    return sendError(res, 'Admin not found', 404);
  }

  return sendSuccess(res, admin);
});

// ─── Admin: Update My Profile ──────────────────────

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const adminId = req.user!.userId;
  const existing = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!existing) {
    return sendError(res, 'Admin not found', 404);
  }

  // Check email uniqueness if changing
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return sendError(res, 'Email is already in use', 409);
    }
  }

  // Check phone uniqueness if changing
  if (parsed.data.phone && parsed.data.phone !== existing.phone) {
    const phoneTaken = await prisma.admin.findUnique({ where: { phone: parsed.data.phone } });
    if (phoneTaken) {
      return sendError(res, 'Phone number is already in use', 409);
    }
  }

  const admin = await prisma.admin.update({
    where: { id: adminId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  return sendSuccess(res, admin, 'Profile updated');
});

// ─── Admin: Change Password ────────────────────────

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { currentPassword, newPassword } = parsed.data;
  const adminId = req.user!.userId;

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) {
    return sendError(res, 'Admin not found', 404);
  }

  // Verify current password
  const isValid = await verifyPassword(admin.passwordHash, currentPassword);
  if (!isValid) {
    return sendError(res, 'Current password is incorrect', 401);
  }

  // Hash and update
  const newHash = await hashPassword(newPassword);
  await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash: newHash },
  });

  return sendSuccess(res, null, 'Password changed successfully');
});

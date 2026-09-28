import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';

// ─── Validation Schemas ────────────────────────────

const createPointsRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  pointsValue: z.number().int().positive('Points value must be a positive integer'),
  description: z.string().optional(),
});

const updatePointsRuleSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  pointsValue: z.number().int().positive().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const awardPointsSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  points: z.number().int('Points must be an integer'),
  type: z.string().min(1, 'Type is required'),
  reference: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
});

// ─── Admin: Get Points Rules ───────────────────────

export const getPointsRules = asyncHandler(async (req: Request, res: Response) => {
  const rules = await prisma.pointsRule.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, rules);
});

// ─── Admin: Create Points Rule ─────────────────────

export const createPointsRule = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createPointsRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const rule = await prisma.pointsRule.create({
    data: parsed.data,
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Admin',
    'CREATE',
    'points_rules',
    rule.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, rule, 'Points rule created', 201);
});

// ─── Admin: Update Points Rule ─────────────────────

export const updatePointsRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updatePointsRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const existing = await prisma.pointsRule.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Points rule not found', 404);
  }

  const rule = await prisma.pointsRule.update({
    where: { id },
    data: parsed.data,
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Admin',
    'UPDATE',
    'points_rules',
    id,
    JSON.stringify({ name: existing.name, type: existing.type, pointsValue: existing.pointsValue }),
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, rule, 'Points rule updated');
});

// ─── Admin: Get Points Transactions ────────────────

export const getPointsTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const patientId = req.query.patientId as string | undefined;

  const where: Record<string, unknown> = {};
  if (patientId) {
    where.patientId = patientId;
  }

  const [transactions, total] = await Promise.all([
    prisma.pointsTransaction.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.pointsTransaction.count({ where }),
  ]);

  return sendPaginated(res, transactions, total, page, limit);
});

// ─── Admin: Award Points ───────────────────────────

export const awardPoints = asyncHandler(async (req: Request, res: Response) => {
  const parsed = awardPointsSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { patientId, points, type, reference, description } = parsed.data;

  // Verify patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return sendError(res, 'Patient not found', 404);
  }

  // Create transaction and update balance atomically
  const [transaction] = await prisma.$transaction([
    prisma.pointsTransaction.create({
      data: { patientId, points, type, reference, description },
    }),
    prisma.patient.update({
      where: { id: patientId },
      data: { pointsBalance: { increment: points } },
    }),
  ]);

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Admin',
    'AWARD_POINTS',
    'points',
    transaction.id,
    undefined,
    JSON.stringify({ patientId, points, type, description }),
    req.ip
  );

  return sendSuccess(res, transaction, 'Points awarded successfully');
});

// ─── Patient: Get My Points ────────────────────────

export const getMyPoints = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const [patient, transactions] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: { pointsBalance: true },
    }),
    prisma.pointsTransaction.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return sendSuccess(res, {
    balance: patient?.pointsBalance || 0,
    transactions,
  });
});

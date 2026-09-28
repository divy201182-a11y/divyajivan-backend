import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateTransactionNo } from '../../utils/generate';
import {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  purchaseMembershipSchema,
} from './memberships.validation';

// ─── Plans (Admin) ─────────────────────────────────

/**
 * GET /memberships/plans
 * List all membership plans.
 */
export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, { plans }, 'Membership plans fetched');
});

/**
 * POST /memberships/plans
 * Create a new membership plan. Admin only.
 */
export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createMembershipPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { name, price, duration, benefits } = parsed.data;

  const plan = await prisma.membershipPlan.create({
    data: { name, price, duration, benefits },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'CREATE',
    'membership_plans',
    plan.id,
    undefined,
    JSON.stringify({ name, price, duration }),
    req.ip
  );

  return sendSuccess(res, { plan }, 'Membership plan created', 201);
});

/**
 * PUT /memberships/plans/:id
 * Update a membership plan. Admin only.
 */
export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updateMembershipPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const existing = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Membership plan not found', 404, 'NOT_FOUND');
  }

  const plan = await prisma.membershipPlan.update({
    where: { id },
    data: parsed.data,
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'UPDATE',
    'membership_plans',
    plan.id,
    JSON.stringify({ name: existing.name, price: existing.price }),
    JSON.stringify({ name: plan.name, price: plan.price }),
    req.ip
  );

  return sendSuccess(res, { plan }, 'Membership plan updated');
});

// ─── Members (Admin) ───────────────────────────────

/**
 * GET /memberships
 * List all memberships with pagination and optional status filter. Admin only.
 */
export const getMemberships = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [memberships, total] = await Promise.all([
    prisma.membership.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true, email: true } },
        plan: { select: { id: true, name: true, price: true, duration: true } },
      },
    }),
    prisma.membership.count({ where }),
  ]);

  return sendPaginated(res, memberships, total, page, limit);
});

/**
 * GET /memberships/:id
 * Get a single membership by ID. Admin only.
 */
export const getMembershipById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const membership = await prisma.membership.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, phone: true, email: true } },
      plan: true,
      payment: true,
    },
  });

  if (!membership) {
    return sendError(res, 'Membership not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { membership }, 'Membership fetched');
});

/**
 * PATCH /memberships/:id/status
 * Update membership status. Admin only.
 */
export const updateMembershipStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['ACTIVE', 'CANCELLED'].includes(status)) {
    return sendError(res, 'Status must be ACTIVE or CANCELLED', 400, 'VALIDATION_ERROR');
  }

  const existing = await prisma.membership.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Membership not found', 404, 'NOT_FOUND');
  }

  const membership = await prisma.membership.update({
    where: { id },
    data: { status },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      plan: { select: { id: true, name: true } },
    },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'UPDATE_STATUS',
    'memberships',
    membership.id,
    JSON.stringify({ status: existing.status }),
    JSON.stringify({ status }),
    req.ip
  );

  return sendSuccess(res, { membership }, `Membership status updated to ${status}`);
});

// ─── Patient ───────────────────────────────────────

/**
 * GET /memberships/my
 * Get the authenticated patient's own memberships.
 */
export const getMyMembership = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const memberships = await prisma.membership.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: true,
    },
  });

  return sendSuccess(res, { memberships }, 'Memberships fetched');
});

/**
 * POST /memberships/purchase
 * Purchase a membership plan. Patient only.
 */
export const purchaseMembership = asyncHandler(async (req: Request, res: Response) => {
  const parsed = purchaseMembershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { planId } = parsed.data;
  const patientId = req.user!.userId;

  // Check plan exists and is active
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return sendError(res, 'Membership plan not found', 404, 'NOT_FOUND');
  }
  if (plan.status !== 'ACTIVE') {
    return sendError(res, 'This membership plan is no longer available', 400, 'PLAN_INACTIVE');
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + plan.duration);

  const transactionNo = generateTransactionNo();

  // Create membership and payment in a transaction
  const [membership] = await prisma.$transaction([
    prisma.membership.create({
      data: {
        patientId,
        planId,
        startDate: now,
        endDate,
        status: 'PENDING',
      },
      include: {
        plan: { select: { id: true, name: true, price: true, duration: true } },
      },
    }),
  ]);

  // Create payment linked to the membership
  await prisma.payment.create({
    data: {
      transactionNo,
      patientId,
      type: 'MEMBERSHIP',
      amount: plan.price,
      status: 'PENDING',
      membershipId: membership.id,
    },
  });

  return sendSuccess(res, { membership, transactionNo }, 'Membership purchased', 201);
});

import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateApplicationNo } from '../../utils/generate';
import {
  createPlanSchema,
  updatePlanSchema,
  applyInsuranceSchema,
  reviewApplicationSchema,
} from './insurance.validation';

// ─── Plans (Admin) ─────────────────────────────────

/**
 * GET /insurance/plans
 * List all insurance plans with pagination.
 */
export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [plans, total] = await Promise.all([
    prisma.insurancePlan.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.insurancePlan.count(),
  ]);

  return sendPaginated(res, plans, total, page, limit);
});

/**
 * POST /insurance/plans
 * Create a new insurance plan. Admin only.
 */
export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { name, description, premium, coverage, duration, features } = parsed.data;

  const plan = await prisma.insurancePlan.create({
    data: { name, description, premium, coverage, duration, features },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'CREATE',
    'insurance_plans',
    plan.id,
    undefined,
    JSON.stringify({ name, premium, coverage }),
    req.ip
  );

  return sendSuccess(res, { plan }, 'Insurance plan created', 201);
});

/**
 * PUT /insurance/plans/:id
 * Update an insurance plan. Admin only.
 */
export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updatePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const existing = await prisma.insurancePlan.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Insurance plan not found', 404, 'NOT_FOUND');
  }

  const plan = await prisma.insurancePlan.update({
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
    'insurance_plans',
    plan.id,
    JSON.stringify({ name: existing.name, premium: existing.premium }),
    JSON.stringify({ name: plan.name, premium: plan.premium }),
    req.ip
  );

  return sendSuccess(res, { plan }, 'Insurance plan updated');
});

/**
 * PATCH /insurance/plans/:id/deactivate
 * Deactivate an insurance plan. Admin only.
 */
export const deactivatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.insurancePlan.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Insurance plan not found', 404, 'NOT_FOUND');
  }

  const plan = await prisma.insurancePlan.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'DEACTIVATE',
    'insurance_plans',
    plan.id,
    JSON.stringify({ status: existing.status }),
    JSON.stringify({ status: 'INACTIVE' }),
    req.ip
  );

  return sendSuccess(res, { plan }, 'Insurance plan deactivated');
});

// ─── Applications (Admin) ──────────────────────────

/**
 * GET /insurance/applications
 * List all applications with pagination and optional status filter. Admin only.
 */
export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [applications, total] = await Promise.all([
    prisma.insuranceApplication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true, email: true } },
        plan: { select: { id: true, name: true, premium: true, coverage: true } },
      },
    }),
    prisma.insuranceApplication.count({ where }),
  ]);

  return sendPaginated(res, applications, total, page, limit);
});

/**
 * GET /insurance/applications/:id
 * Get a single application by ID. Admin only.
 */
export const getApplicationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const application = await prisma.insuranceApplication.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, phone: true, email: true } },
      plan: true,
      documents: true,
    },
  });

  if (!application) {
    return sendError(res, 'Application not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { application }, 'Application fetched');
});

/**
 * PATCH /insurance/applications/:id/review
 * Review an insurance application. Admin only.
 * Validates status transitions:
 *   SUBMITTED     -> UNDER_REVIEW
 *   UNDER_REVIEW  -> APPROVED | REJECTED
 *   APPROVED      -> ACTIVE
 */
export const reviewApplication = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = reviewApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { status, rejectionReason, policyNumber, startDate, endDate } = parsed.data;

  const application = await prisma.insuranceApplication.findUnique({
    where: { id },
  });

  if (!application) {
    return sendError(res, 'Application not found', 404, 'NOT_FOUND');
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['ACTIVE'],
  };

  const allowed = validTransitions[application.status];
  if (!allowed || !allowed.includes(status)) {
    return sendError(
      res,
      `Cannot transition from ${application.status} to ${status}`,
      400,
      'INVALID_TRANSITION'
    );
  }

  // If approving, require policy details
  if (status === 'APPROVED') {
    if (!policyNumber || !startDate || !endDate) {
      return sendError(
        res,
        'Policy number, start date, and end date are required for approval',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = { status };

  if (status === 'UNDER_REVIEW') {
    updateData.reviewedBy = req.user!.userId;
  }

  if (status === 'APPROVED') {
    updateData.approvedBy = req.user!.userId;
    updateData.policyNumber = policyNumber;
    updateData.startDate = new Date(startDate!);
    updateData.endDate = new Date(endDate!);
  }

  if (status === 'REJECTED') {
    updateData.rejectionReason = rejectionReason || null;
  }

  const updated = await prisma.insuranceApplication.update({
    where: { id },
    data: updateData,
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
    'REVIEW',
    'insurance_applications',
    updated.id,
    JSON.stringify({ status: application.status }),
    JSON.stringify({ status }),
    req.ip
  );

  return sendSuccess(res, { application: updated }, `Application ${status.toLowerCase()}`);
});

// ─── Patient ───────────────────────────────────────

/**
 * GET /insurance/my
 * Get the authenticated patient's own insurance applications.
 */
export const getMyInsurance = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const applications = await prisma.insuranceApplication.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: true,
    },
  });

  return sendSuccess(res, { applications }, 'Insurance applications fetched');
});

/**
 * POST /insurance/apply
 * Apply for an insurance plan. Patient only.
 */
export const applyForInsurance = asyncHandler(async (req: Request, res: Response) => {
  const parsed = applyInsuranceSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { planId } = parsed.data;
  const patientId = req.user!.userId;

  // Check plan exists and is active
  const plan = await prisma.insurancePlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return sendError(res, 'Insurance plan not found', 404, 'NOT_FOUND');
  }
  if (plan.status !== 'ACTIVE') {
    return sendError(res, 'This insurance plan is no longer available', 400, 'PLAN_INACTIVE');
  }

  const applicationNo = generateApplicationNo();

  const application = await prisma.insuranceApplication.create({
    data: {
      applicationNo,
      patientId,
      planId,
      status: 'SUBMITTED',
    },
    include: {
      plan: { select: { id: true, name: true, premium: true, coverage: true } },
    },
  });

  // Create a pending payment for the premium
  const transactionNo = `TXN${Date.now()}`;
  await prisma.payment.create({
    data: {
      transactionNo,
      patientId,
      type: 'INSURANCE',
      amount: plan.premium,
      status: 'PENDING',
    },
  });

  return sendSuccess(res, { application }, 'Insurance application submitted', 201);
});

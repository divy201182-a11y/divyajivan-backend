import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';

// ─── Validation Schemas ────────────────────────────

const updatePaymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED']),
  method: z.string().optional(),
  providerRef: z.string().optional(),
});

const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

// ─── Admin: Get All Payments ───────────────────────

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const where: Record<string, unknown> = {};

  if (type) {
    where.type = type;
  }
  if (status) {
    where.status = status;
  }
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return sendPaginated(res, payments, total, page, limit);
});

// ─── Admin: Get Payment By ID ──────────────────────

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, name: true, phone: true, email: true },
      },
      order: true,
      appointment: true,
      labBooking: true,
      membership: true,
      telemedicine: true,
      refund: true,
    },
  });

  if (!payment) {
    return sendError(res, 'Payment not found', 404);
  }

  return sendSuccess(res, payment);
});

// ─── Admin: Update Payment Status ──────────────────

export const updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updatePaymentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Payment not found', 404);
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.method && { method: parsed.data.method }),
      ...(parsed.data.providerRef && { providerRef: parsed.data.providerRef }),
    },
  });

  // Fetch admin name for activity log
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Admin',
    'UPDATE',
    'payments',
    id,
    JSON.stringify({ status: existing.status }),
    JSON.stringify({ status: parsed.data.status }),
    req.ip
  );

  return sendSuccess(res, payment, 'Payment status updated');
});

// ─── Admin: Refund Payment ─────────────────────────

export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = refundPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { refund: true },
  });

  if (!payment) {
    return sendError(res, 'Payment not found', 404);
  }

  if (payment.refund) {
    return sendError(res, 'Payment has already been refunded', 400);
  }

  if (payment.status !== 'SUCCESSFUL') {
    return sendError(res, 'Only successful payments can be refunded', 400);
  }

  const refundAmount = parsed.data.amount || Number(payment.amount);

  if (refundAmount > Number(payment.amount)) {
    return sendError(res, 'Refund amount cannot exceed payment amount', 400);
  }

  const [refund] = await prisma.$transaction([
    prisma.refund.create({
      data: {
        paymentId: id,
        amount: refundAmount,
        reason: parsed.data.reason,
        issuedBy: req.user!.userId,
      },
    }),
    prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED' },
    }),
  ]);

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Admin',
    'REFUND',
    'payments',
    id,
    undefined,
    JSON.stringify({ refundAmount, reason: parsed.data.reason }),
    req.ip
  );

  return sendSuccess(res, refund, 'Payment refunded successfully');
});

// ─── Patient: Get My Payments ──────────────────────

export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { patientId: req.user!.userId };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return sendPaginated(res, payments, total, page, limit);
});

import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateConsultationNo, generateTransactionNo } from '../../utils/generate';
import {
  createConsultationSchema,
  updateConsultationStatusSchema,
} from './telemedicine.validation';

// ─── Valid status transitions ──────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// ─── Admin: Get all consultations ──────────────────

/**
 * GET /telemedicine
 * List all telemedicine consultations with pagination, status filter, and date filter.
 */
export const getConsultations = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const date = req.query.date as string | undefined;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.scheduledDate = { gte: startOfDay, lte: endOfDay };
  }

  const [consultations, total] = await Promise.all([
    prisma.telemedicineConsultation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, email: true },
        },
        doctor: {
          select: { id: true, name: true, specialization: true, phone: true },
        },
      },
    }),
    prisma.telemedicineConsultation.count({ where }),
  ]);

  return sendPaginated(res, consultations, total, page, limit);
});

// ─── Admin: Get consultation by ID ─────────────────

/**
 * GET /telemedicine/:id
 * Get full details of a single consultation.
 */
export const getConsultationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const consultation = await prisma.telemedicineConsultation.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          dateOfBirth: true,
          gender: true,
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
          specialization: true,
          qualification: true,
          phone: true,
          email: true,
          consultationFee: true,
        },
      },
      payment: true,
    },
  });

  if (!consultation) {
    return sendError(res, 'Consultation not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { consultation }, 'Consultation fetched');
});

// ─── Admin: Update consultation status ─────────────

/**
 * PATCH /telemedicine/:id/status
 * Update the status of a consultation. Validates transition rules.
 * When moving to IN_PROGRESS, a meetingLink can be set.
 */
export const updateConsultationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const parsed = updateConsultationStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { status, meetingLink, notes } = parsed.data;

  const consultation = await prisma.telemedicineConsultation.findUnique({
    where: { id },
  });

  if (!consultation) {
    return sendError(res, 'Consultation not found', 404, 'NOT_FOUND');
  }

  // Validate status transition
  const allowed = VALID_TRANSITIONS[consultation.status] || [];
  if (!allowed.includes(status)) {
    return sendError(
      res,
      `Cannot transition from ${consultation.status} to ${status}`,
      400,
      'INVALID_TRANSITION'
    );
  }

  const updateData: Record<string, unknown> = { status };

  if (meetingLink && status === 'IN_PROGRESS') {
    updateData.meetingLink = meetingLink;
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const updated = await prisma.telemedicineConsultation.update({
    where: { id },
    data: updateData,
    include: {
      patient: {
        select: { id: true, name: true, phone: true },
      },
      doctor: {
        select: { id: true, name: true, specialization: true },
      },
    },
  });

  // Fetch admin name for activity log
  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
    select: { name: true },
  });

  await logActivity(
    user.userId,
    admin?.name || 'Admin',
    'UPDATE',
    'telemedicine',
    id,
    JSON.stringify({ status: consultation.status }),
    JSON.stringify({ status }),
    req.ip
  );

  return sendSuccess(res, { consultation: updated }, 'Consultation status updated');
});

// ─── Patient: Get my consultations ─────────────────

/**
 * GET /telemedicine/my
 * List consultations for the authenticated patient.
 */
export const getMyConsultations = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = { patientId };

  if (status) {
    where.status = status;
  }

  const [consultations, total] = await Promise.all([
    prisma.telemedicineConsultation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledDate: 'desc' },
      include: {
        doctor: {
          select: { id: true, name: true, specialization: true, consultationFee: true },
        },
        payment: {
          select: { id: true, status: true, amount: true },
        },
      },
    }),
    prisma.telemedicineConsultation.count({ where }),
  ]);

  return sendPaginated(res, consultations, total, page, limit);
});

// ─── Patient: Create consultation ──────────────────

/**
 * POST /telemedicine
 * Book a new telemedicine consultation.
 */
export const createConsultation = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const parsed = createConsultationSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { doctorId, scheduledDate, scheduledTime, duration } = parsed.data;

  // Check that the doctor exists and is active
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, name: true, status: true, consultationFee: true },
  });

  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'DOCTOR_NOT_FOUND');
  }

  if (doctor.status !== 'ACTIVE') {
    return sendError(res, 'Doctor is not currently available', 400, 'DOCTOR_UNAVAILABLE');
  }

  const consultationNo = generateConsultationNo();
  const transactionNo = generateTransactionNo();

  // Create consultation and a PENDING payment in a transaction
  const consultation = await prisma.$transaction(async (tx) => {
    const newConsultation = await tx.telemedicineConsultation.create({
      data: {
        consultationNo,
        patientId,
        doctorId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration,
      },
      include: {
        doctor: {
          select: { id: true, name: true, specialization: true, consultationFee: true },
        },
      },
    });

    await tx.payment.create({
      data: {
        transactionNo,
        patientId,
        type: 'APPOINTMENT',
        amount: doctor.consultationFee,
        status: 'PENDING',
        telemedicineId: newConsultation.id,
      },
    });

    return newConsultation;
  });

  return sendSuccess(res, { consultation }, 'Consultation booked successfully', 201);
});

// ─── Patient: Cancel my consultation ───────────────

/**
 * PATCH /telemedicine/my/:id/cancel
 * Cancel a consultation that is still SCHEDULED.
 */
export const cancelMyConsultation = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const { id } = req.params;

  const consultation = await prisma.telemedicineConsultation.findUnique({
    where: { id },
  });

  if (!consultation) {
    return sendError(res, 'Consultation not found', 404, 'NOT_FOUND');
  }

  if (consultation.patientId !== patientId) {
    return sendError(res, 'Access denied', 403, 'FORBIDDEN');
  }

  if (consultation.status !== 'SCHEDULED') {
    return sendError(
      res,
      'Only scheduled consultations can be cancelled',
      400,
      'INVALID_STATUS'
    );
  }

  const updated = await prisma.telemedicineConsultation.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return sendSuccess(res, { consultation: updated }, 'Consultation cancelled');
});

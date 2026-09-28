import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';

// ─── Validation Schemas ────────────────────────────

const createNotificationSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID').optional(),
  type: z.enum([
    'ORDER_UPDATE',
    'APPOINTMENT_REMINDER',
    'LAB_REPORT_READY',
    'MEMBERSHIP',
    'INSURANCE',
    'GENERAL',
  ]),
  channel: z.enum(['PUSH', 'SMS', 'WHATSAPP', 'EMAIL']).default('PUSH'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
});

// ─── Admin: Get All Notifications ──────────────────

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const type = req.query.type as string | undefined;

  const where: Record<string, unknown> = {};
  if (type) {
    where.type = type;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
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
    prisma.notification.count({ where }),
  ]);

  return sendPaginated(res, notifications, total, page, limit);
});

// ─── Admin: Create Notification ────────────────────

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { patientId, type, channel, title, message } = parsed.data;

  // Verify patient exists if patientId is provided
  if (patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return sendError(res, 'Patient not found', 404);
    }
  }

  const notification = await prisma.notification.create({
    data: { patientId, type, channel, title, message },
  });

  return sendSuccess(res, notification, 'Notification created', 201);
});

// ─── Patient: Get My Notifications ─────────────────

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { patientId: req.user!.userId };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return sendPaginated(res, notifications, total, page, limit);
});

// ─── Authenticated: Mark Notification as Read ──────

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return sendError(res, 'Notification not found', 404);
  }

  // Patients can only mark their own notifications
  if (req.user!.userType === 'patient' && notification.patientId !== req.user!.userId) {
    return sendError(res, 'Access denied', 403);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return sendSuccess(res, updated, 'Notification marked as read');
});

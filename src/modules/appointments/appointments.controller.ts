import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateAppointmentNo, generateTransactionNo } from '../../utils/generate';
import {
  createAppointmentSchema,
  adminCreateAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleSchema,
} from './appointments.validation';

// ─── Admin: List appointments with pagination, search, filters ────

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const status = req.query.status as string | undefined;
  const date = req.query.date as string | undefined;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { patient: { name: { contains: search, mode: 'insensitive' } } },
      { doctor: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const start = new Date(parsed);
      start.setHours(0, 0, 0, 0);
      const end = new Date(parsed);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }
  }

  let appointments: unknown[];
  let total: number;

  try {
    [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true, specialization: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);
  } catch {
    const rawAppts: any[] = await prisma.$queryRawUnsafe(
      `SELECT a.id, a.appointmentNo, a.status, a.consultationType, a.reason, a.notes,
              CAST(a.date AS TEXT) as date, CAST(a.time AS TEXT) as time,
              a.createdAt, a.patientId, a.doctorId
       FROM appointments a ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`,
      limit, skip
    );
    const countResult: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM appointments');
    total = Number(countResult[0].c);

    appointments = await Promise.all(rawAppts.map(async (a: any) => {
      const pat: any[] = await prisma.$queryRawUnsafe('SELECT id, name, phone FROM patients WHERE id = ?', a.patientId);
      const doc: any[] = await prisma.$queryRawUnsafe('SELECT id, name, specialization FROM doctors WHERE id = ?', a.doctorId);
      return {
        ...a,
        patient: pat[0] ?? { id: a.patientId, name: 'Unknown', phone: '' },
        doctor: doc[0] ?? { id: a.doctorId, name: 'Unknown', specialization: '' },
      };
    }));
  }

  return sendPaginated(res, appointments, total, page, limit);
});

// ─── Admin: Get single appointment ────────────────────────────────

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  let appointment: any;
  try {
    appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            gender: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            qualification: true,
            consultationFee: true,
            hospital: true,
            availability: true,
          },
        },
        payment: true,
      },
    });
  } catch {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, appointmentNo, status, consultationType, reason, notes,
              CAST(date AS TEXT) as date, CAST(time AS TEXT) as time,
              cancelReason, createdAt, patientId, doctorId
       FROM appointments WHERE id = ?`, id
    );
    if (rows[0]) {
      const a = rows[0];
      const pat: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, name, phone, email, gender, dateOfBirth FROM patients WHERE id = ?', a.patientId
      );
      const doc: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, name, specialization, qualification, consultationFee, hospital, availability FROM doctors WHERE id = ?', a.doctorId
      );
      const pay: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM payments WHERE appointmentId = ?', a.id
      );
      appointment = { ...a, patient: pat[0] ?? null, doctor: doc[0] ?? null, payment: pay[0] ?? null };
    }
  }

  if (!appointment) {
    return sendError(res, 'Appointment not found', 404);
  }

  return sendSuccess(res, appointment);
});

// ─── Admin: Update appointment status ─────────────────────────────

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = updateAppointmentStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { status, cancelReason, notes } = parsed.data;

  let appointment: any;
  try {
    appointment = await prisma.appointment.findUnique({ where: { id } });
  } catch {
    const rows: any[] = await prisma.$queryRawUnsafe(
      'SELECT id, status, CAST(date AS TEXT) as date, CAST(time AS TEXT) as time, patientId, doctorId FROM appointments WHERE id = ?', id
    );
    appointment = rows[0] ?? null;
  }
  if (!appointment) {
    return sendError(res, 'Appointment not found', 404);
  }

  // Validate status transition
  const currentStatus = appointment.status;
  const validTransitions: Record<string, string[]> = {
    REQUESTED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: ['CANCELLED'],
    CANCELLED: [],
  };

  if (!validTransitions[currentStatus]?.includes(status)) {
    return sendError(
      res,
      `Cannot transition from ${currentStatus} to ${status}`,
      400
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status,
      ...(cancelReason && { cancelReason }),
      ...(notes && { notes }),
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'UPDATE_STATUS',
    'appointments',
    id,
    currentStatus,
    status,
    req.ip
  );

  return sendSuccess(res, updated, 'Appointment status updated');
});

// ─── Admin: Reschedule appointment ────────────────────────────────

export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = rescheduleSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { date, time } = parsed.data;

  let appointment: any;
  try {
    appointment = await prisma.appointment.findUnique({ where: { id } });
  } catch {
    const rows: any[] = await prisma.$queryRawUnsafe(
      'SELECT id, CAST(date AS TEXT) as date, CAST(time AS TEXT) as time FROM appointments WHERE id = ?', id
    );
    appointment = rows[0] ?? null;
  }
  if (!appointment) {
    return sendError(res, 'Appointment not found', 404);
  }

  const dateStr = appointment.date instanceof Date ? appointment.date.toISOString() : String(appointment.date);
  const oldDate = `${dateStr} ${appointment.time}`;

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      date: new Date(date),
      time,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'RESCHEDULE',
    'appointments',
    id,
    oldDate,
    `${date} ${time}`,
    req.ip
  );

  return sendSuccess(res, updated, 'Appointment rescheduled');
});

// ─── Admin: Book appointment on behalf of a patient ──────────────

export const adminCreateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = adminCreateAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { patientId, doctorId, date, time, consultationType, reason } = parsed.data;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return sendError(res, 'Patient not found', 404);
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    return sendError(res, 'Doctor not found', 404);
  }
  if (doctor.status !== 'ACTIVE') {
    return sendError(res, 'Doctor is currently not available', 400);
  }

  const appointmentNo = generateAppointmentNo();
  const transactionNo = generateTransactionNo();

  const appointment = await prisma.$transaction(async (tx) => {
    const newAppointment = await tx.appointment.create({
      data: {
        appointmentNo,
        patientId,
        doctorId,
        date: new Date(date),
        time,
        consultationType: consultationType || 'IN_PERSON',
        reason,
        status: 'CONFIRMED',
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, specialization: true, consultationFee: true } },
      },
    });

    await tx.payment.create({
      data: {
        transactionNo,
        patientId,
        type: 'APPOINTMENT',
        amount: doctor.consultationFee,
        status: 'PENDING',
        appointmentId: newAppointment.id,
      },
    });

    return newAppointment;
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'CREATE',
    'appointments',
    appointment.id,
    null,
    JSON.stringify({ patientId, doctorId, date, time }),
    req.ip
  );

  return sendSuccess(res, appointment, 'Appointment booked successfully', 201);
});

// ─── Patient: Get own appointments ────────────────────────────────

export const getMyAppointments = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { patientId };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            qualification: true,
            consultationFee: true,
            profileImage: true,
          },
        },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return sendPaginated(res, appointments, total, page, limit);
});

// ─── Patient: Create appointment ──────────────────────────────────

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const parsed = createAppointmentSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { doctorId, date, time, consultationType, reason } = parsed.data;

  // Check doctor exists and is active
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    return sendError(res, 'Doctor not found', 404);
  }
  if (doctor.status !== 'ACTIVE') {
    return sendError(res, 'Doctor is currently not available', 400);
  }

  const appointmentNo = generateAppointmentNo();
  const transactionNo = generateTransactionNo();

  const appointment = await prisma.$transaction(async (tx) => {
    const newAppointment = await tx.appointment.create({
      data: {
        appointmentNo,
        patientId,
        doctorId,
        date: new Date(date),
        time,
        consultationType: consultationType || 'IN_PERSON',
        reason,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            consultationFee: true,
          },
        },
      },
    });

    // Create payment record
    await tx.payment.create({
      data: {
        transactionNo,
        patientId,
        type: 'APPOINTMENT',
        amount: doctor.consultationFee,
        status: 'PENDING',
        appointmentId: newAppointment.id,
      },
    });

    return newAppointment;
  });

  return sendSuccess(res, appointment, 'Appointment created successfully', 201);
});

// ─── Patient: Cancel own appointment ──────────────────────────────

export const cancelMyAppointment = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const { id } = req.params;

  let appointment: any;
  try {
    appointment = await prisma.appointment.findUnique({ where: { id } });
  } catch {
    const rows: any[] = await prisma.$queryRawUnsafe(
      'SELECT id, status, patientId FROM appointments WHERE id = ?', id
    );
    appointment = rows[0] ?? null;
  }

  if (!appointment) {
    return sendError(res, 'Appointment not found', 404);
  }

  if (appointment.patientId !== patientId) {
    return sendError(res, 'Not authorized to cancel this appointment', 403);
  }

  if (appointment.status !== 'REQUESTED' && appointment.status !== 'CONFIRMED') {
    return sendError(
      res,
      'Only appointments with status REQUESTED or CONFIRMED can be cancelled',
      400
    );
  }

  const cancelReason = req.body.reason || 'Cancelled by patient';

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelReason,
    },
  });

  return sendSuccess(res, updated, 'Appointment cancelled');
});

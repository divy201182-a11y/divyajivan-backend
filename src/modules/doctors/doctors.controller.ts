import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import {
  createDoctorSchema,
  updateDoctorSchema,
  setAvailabilitySchema,
} from './doctors.validation';

// ═══════════════════════════════════════════════════
//  Doctor CRUD (including soft-delete)
// ═══════════════════════════════════════════════════

/**
 * DELETE /doctors/:id
 * Permanently remove a doctor (Admin)
 */
export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  await prisma.doctorAvailability.deleteMany({ where: { doctorId: id } });
  await prisma.doctor.delete({ where: { id } });

  await logActivity(
    req.user!.userId,
    'Admin',
    'DELETE',
    'doctors',
    id,
    JSON.stringify({ name: doctor.name, specialization: doctor.specialization }),
    null,
    req.ip
  );

  return sendSuccess(res, null, 'Doctor removed successfully');
});

/**
 * GET /doctors
 * List doctors with pagination, search, and status filter.
 * (Admin)
 */
export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const search = (req.query.search as string) || '';
  const status = req.query.status as string | undefined;

  // Build the where clause
  const where: any = {};

  // Search by name or specialization
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { specialization: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by status (ACTIVE, INACTIVE, SUSPENDED)
  if (status) {
    where.status = status;
  }

  // Run count and findMany in parallel for performance
  const [total, doctors] = await Promise.all([
    prisma.doctor.count({ where }),
    prisma.doctor.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        specialization: true,
        qualification: true,
        experience: true,
        phone: true,
        email: true,
        consultationFee: true,
        hospital: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return sendPaginated(res, doctors, total, page, limit);
});

/**
 * GET /doctors/:id
 * Get a single doctor with their availability schedule.
 * (Admin)
 */
export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      availability: {
        orderBy: { day: 'asc' },
      },
    },
  });

  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { doctor }, 'Doctor fetched successfully');
});

/**
 * POST /doctors
 * Create a new doctor.
 * (Admin only)
 */
export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const parsed = createDoctorSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check for duplicate phone
  const phoneExists = await prisma.doctor.findUnique({
    where: { phone: parsed.data.phone },
  });
  if (phoneExists) {
    return sendError(res, 'A doctor with this phone number already exists', 409, 'PHONE_EXISTS');
  }

  // Check for duplicate email (if provided)
  if (parsed.data.email) {
    const emailExists = await prisma.doctor.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailExists) {
      return sendError(res, 'A doctor with this email already exists', 409, 'EMAIL_EXISTS');
    }
  }

  const doctor = await prisma.doctor.create({
    data: {
      name: parsed.data.name,
      specialization: parsed.data.specialization,
      qualification: parsed.data.qualification,
      experience: parsed.data.experience,
      phone: parsed.data.phone,
      email: parsed.data.email,
      consultationFee: parsed.data.consultationFee,
      hospital: parsed.data.hospital,
      bio: parsed.data.bio,
    },
  });

  // Log the admin activity
  await logActivity(
    req.user!.userId,
    'Admin',
    'CREATE',
    'doctors',
    doctor.id,
    undefined,
    JSON.stringify({ name: doctor.name, phone: doctor.phone }),
    req.ip
  );

  return sendSuccess(res, { doctor }, 'Doctor created successfully', 201);
});

/**
 * PUT /doctors/:id
 * Update an existing doctor.
 * (Admin only)
 */
export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const parsed = updateDoctorSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check if doctor exists
  const existing = await prisma.doctor.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  // Check for duplicate phone if phone is being changed
  if (parsed.data.phone && parsed.data.phone !== existing.phone) {
    const phoneExists = await prisma.doctor.findUnique({
      where: { phone: parsed.data.phone },
    });
    if (phoneExists) {
      return sendError(res, 'A doctor with this phone number already exists', 409, 'PHONE_EXISTS');
    }
  }

  // Check for duplicate email if email is being changed
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailExists = await prisma.doctor.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailExists) {
      return sendError(res, 'A doctor with this email already exists', 409, 'EMAIL_EXISTS');
    }
  }

  const updated = await prisma.doctor.update({
    where: { id },
    data: parsed.data,
  });

  // Log the admin activity
  await logActivity(
    req.user!.userId,
    'Admin',
    'UPDATE',
    'doctors',
    id,
    JSON.stringify({ name: existing.name, phone: existing.phone, specialization: existing.specialization }),
    JSON.stringify({ name: updated.name, phone: updated.phone, specialization: updated.specialization }),
    req.ip
  );

  return sendSuccess(res, { doctor: updated }, 'Doctor updated successfully');
});

/**
 * PATCH /doctors/:id/deactivate
 * Deactivate a doctor.
 * (Admin only)
 */
export const deactivateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  if (doctor.status === 'INACTIVE') {
    return sendError(res, 'Doctor is already inactive', 400, 'ALREADY_INACTIVE');
  }

  await prisma.doctor.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'DEACTIVATE',
    'doctors',
    id,
    JSON.stringify({ status: doctor.status }),
    JSON.stringify({ status: 'INACTIVE' }),
    req.ip
  );

  return sendSuccess(res, null, 'Doctor deactivated successfully');
});

/**
 * PATCH /doctors/:id/activate
 * Activate a doctor.
 * (Admin only)
 */
export const activateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  if (doctor.status === 'ACTIVE') {
    return sendError(res, 'Doctor is already active', 400, 'ALREADY_ACTIVE');
  }

  await prisma.doctor.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'ACTIVATE',
    'doctors',
    id,
    JSON.stringify({ status: doctor.status }),
    JSON.stringify({ status: 'ACTIVE' }),
    req.ip
  );

  return sendSuccess(res, null, 'Doctor activated successfully');
});

// ═══════════════════════════════════════════════════
//  Doctor Availability
// ═══════════════════════════════════════════════════

/**
 * PUT /doctors/:id/availability
 * Replace a doctor's entire availability schedule.
 * Deletes existing records and creates new ones.
 * (Admin only)
 */
export const setAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const parsed = setAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check if doctor exists
  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  // Use a transaction: delete all existing slots, then create new ones
  const availability = await prisma.$transaction(async (tx) => {
    // Delete existing availability for this doctor
    await tx.doctorAvailability.deleteMany({ where: { doctorId: id } });

    // Create the new availability slots
    await tx.doctorAvailability.createMany({
      data: parsed.data.availability.map((slot) => ({
        doctorId: id,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      })),
    });

    // Return the newly created records
    return tx.doctorAvailability.findMany({
      where: { doctorId: id },
      orderBy: { day: 'asc' },
    });
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'SET_AVAILABILITY',
    'doctors',
    id,
    undefined,
    JSON.stringify({ slots: parsed.data.availability.length }),
    req.ip
  );

  return sendSuccess(res, { availability }, 'Availability updated successfully');
});

/**
 * GET /doctors/:id/availability
 * Get a doctor's availability schedule.
 * (Authenticated users)
 */
export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if doctor exists
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: { id: true, name: true, specialization: true },
  });

  if (!doctor) {
    return sendError(res, 'Doctor not found', 404, 'NOT_FOUND');
  }

  const availability = await prisma.doctorAvailability.findMany({
    where: { doctorId: id, isActive: true },
    orderBy: { day: 'asc' },
  });

  return sendSuccess(res, { doctor, availability }, 'Availability fetched successfully');
});

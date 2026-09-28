import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { createPatientSchema, updatePatientSchema, addFamilyMemberSchema } from './patients.validation';

// ═══════════════════════════════════════════════════
//  Admin Endpoints
// ═══════════════════════════════════════════════════

/**
 * POST /patients
 * Create a new patient from admin panel.
 * (Admin only)
 */
export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { phone, email } = parsed.data;

  const phoneExists = await prisma.patient.findUnique({ where: { phone } });
  if (phoneExists) {
    return sendError(res, 'Phone number is already registered', 409, 'PHONE_EXISTS');
  }

  if (email) {
    const emailExists = await prisma.patient.findUnique({ where: { email } });
    if (emailExists) {
      return sendError(res, 'Email is already registered', 409, 'EMAIL_EXISTS');
    }
  }

  const data: any = {
    ...parsed.data,
    status: 'ACTIVE',
    pointsBalance: 0,
  };
  if (data.dateOfBirth) {
    data.dateOfBirth = new Date(data.dateOfBirth);
  }

  const patient = await prisma.patient.create({ data });

  await logActivity(
    req.user!.userId,
    'Admin',
    'CREATE',
    'patients',
    patient.id,
    null,
    JSON.stringify({ name: patient.name, phone: patient.phone }),
    req.ip
  );

  return sendSuccess(res, { patient }, 'Patient created successfully', 201);
});

/**
 * GET /patients
 * List all patients with pagination, search, and status filter.
 * (Admin only)
 */
export const getPatients = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const search = (req.query.search as string) || '';
  const status = req.query.status as string | undefined;

  // Build the where clause
  const where: any = {};

  // Search by name, phone, or email
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by status (ACTIVE, INACTIVE, SUSPENDED)
  if (status) {
    where.status = status;
  }

  // Run count and findMany in parallel for performance
  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        status: true,
        pointsBalance: true,
        createdAt: true,
      },
    }),
  ]);

  return sendPaginated(res, patients, total, page, limit);
});

/**
 * GET /patients/:id
 * Get a single patient with family members, recent orders,
 * recent appointments, and memberships.
 * (Admin only)
 */
export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      familyMembers: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNo: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
      appointments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          appointmentNo: true,
          date: true,
          time: true,
          status: true,
          doctor: {
            select: { id: true, name: true, specialization: true },
          },
        },
      },
      memberships: {
        include: {
          plan: { select: { id: true, name: true, price: true } },
        },
      },
    },
  });

  if (!patient) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { patient }, 'Patient fetched successfully');
});

/**
 * PUT /patients/:id
 * Update a patient's profile.
 * (Admin only)
 */
export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check if patient exists
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  // Check for duplicate phone if phone is being changed
  if (parsed.data.phone && parsed.data.phone !== existing.phone) {
    const phoneExists = await prisma.patient.findUnique({
      where: { phone: parsed.data.phone },
    });
    if (phoneExists) {
      return sendError(res, 'Phone number is already registered', 409, 'PHONE_EXISTS');
    }
  }

  // Check for duplicate email if email is being changed
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailExists = await prisma.patient.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailExists) {
      return sendError(res, 'Email is already registered', 409, 'EMAIL_EXISTS');
    }
  }

  // Build the update data
  const updateData: any = { ...parsed.data };
  if (updateData.dateOfBirth) {
    updateData.dateOfBirth = new Date(updateData.dateOfBirth);
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: updateData,
  });

  // Log the admin activity
  await logActivity(
    req.user!.userId,
    'Admin',
    'UPDATE',
    'patients',
    id,
    JSON.stringify({ name: existing.name, phone: existing.phone, email: existing.email }),
    JSON.stringify({ name: updated.name, phone: updated.phone, email: updated.email }),
    req.ip
  );

  return sendSuccess(res, { patient: updated }, 'Patient updated successfully');
});

/**
 * PATCH /patients/:id/deactivate
 * Deactivate a patient account.
 * (Admin only)
 */
export const deactivatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  if (patient.status === 'INACTIVE') {
    return sendError(res, 'Patient is already inactive', 400, 'ALREADY_INACTIVE');
  }

  await prisma.patient.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'DEACTIVATE',
    'patients',
    id,
    JSON.stringify({ status: patient.status }),
    JSON.stringify({ status: 'INACTIVE' }),
    req.ip
  );

  return sendSuccess(res, null, 'Patient deactivated successfully');
});

/**
 * PATCH /patients/:id/activate
 * Activate a patient account.
 * (Admin only)
 */
export const activatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  if (patient.status === 'ACTIVE') {
    return sendError(res, 'Patient is already active', 400, 'ALREADY_ACTIVE');
  }

  await prisma.patient.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'ACTIVATE',
    'patients',
    id,
    JSON.stringify({ status: patient.status }),
    JSON.stringify({ status: 'ACTIVE' }),
    req.ip
  );

  return sendSuccess(res, null, 'Patient activated successfully');
});

// ═══════════════════════════════════════════════════
//  Patient Self-Service Endpoints
// ═══════════════════════════════════════════════════

/**
 * GET /patients/me
 * Get the current patient's own profile with family members.
 */
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      familyMembers: true,
    },
  });

  if (!patient) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { patient }, 'Profile fetched successfully');
});

/**
 * PUT /patients/me
 * Patient updates their own profile.
 */
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  // Validate request body
  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check if patient exists
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  // Check for duplicate phone if phone is being changed
  if (parsed.data.phone && parsed.data.phone !== existing.phone) {
    const phoneExists = await prisma.patient.findUnique({
      where: { phone: parsed.data.phone },
    });
    if (phoneExists) {
      return sendError(res, 'Phone number is already registered', 409, 'PHONE_EXISTS');
    }
  }

  // Check for duplicate email if email is being changed
  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailExists = await prisma.patient.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailExists) {
      return sendError(res, 'Email is already registered', 409, 'EMAIL_EXISTS');
    }
  }

  // Build the update data
  const updateData: any = { ...parsed.data };
  if (updateData.dateOfBirth) {
    updateData.dateOfBirth = new Date(updateData.dateOfBirth);
  }

  const updated = await prisma.patient.update({
    where: { id: patientId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      profileImage: true,
      status: true,
      pointsBalance: true,
      updatedAt: true,
    },
  });

  return sendSuccess(res, { patient: updated }, 'Profile updated successfully');
});

/**
 * GET /patients/me/family
 * Get the current patient's family members.
 */
export const getMyFamilyMembers = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const familyMembers = await prisma.familyMember.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, { familyMembers }, 'Family members fetched successfully');
});

/**
 * POST /patients/me/family
 * Add a new family member for the current patient.
 */
export const addFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  // Validate request body
  const parsed = addFamilyMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Make sure the patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  const memberData: any = {
    patientId,
    name: parsed.data.name,
    relation: parsed.data.relation,
    phone: parsed.data.phone,
    gender: parsed.data.gender,
  };

  if (parsed.data.dateOfBirth) {
    memberData.dateOfBirth = new Date(parsed.data.dateOfBirth);
  }

  const familyMember = await prisma.familyMember.create({
    data: memberData,
  });

  return sendSuccess(res, { familyMember }, 'Family member added successfully', 201);
});

/**
 * DELETE /patients/me/family/:id
 * Delete a family member. Only if it belongs to the current patient.
 */
export const deleteFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const { id } = req.params;

  // Find the family member
  const familyMember = await prisma.familyMember.findUnique({
    where: { id },
  });

  if (!familyMember) {
    return sendError(res, 'Family member not found', 404, 'NOT_FOUND');
  }

  // Make sure it belongs to the current patient
  if (familyMember.patientId !== patientId) {
    return sendError(res, 'You can only delete your own family members', 403, 'FORBIDDEN');
  }

  await prisma.familyMember.delete({ where: { id } });

  return sendSuccess(res, null, 'Family member deleted successfully');
});

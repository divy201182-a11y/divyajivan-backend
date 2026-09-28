import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateEnquiryNo } from '../../utils/generate';
import {
  createHospitalSchema,
  updateHospitalSchema,
  createTreatmentSchema,
  createPackageSchema,
  createEnquirySchema,
  updateEnquiryStatusSchema,
} from './medical-tourism.validation';

// ═══════════════════════════════════════════════════
//  HOSPITALS
// ═══════════════════════════════════════════════════

/**
 * GET /medical-tourism/hospitals
 * List hospitals with pagination and search by name, city, or country.
 */
export const getHospitals = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = { status: 'ACTIVE' };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [hospitals, total] = await Promise.all([
    prisma.medicalTourismHospital.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.medicalTourismHospital.count({ where }),
  ]);

  return sendPaginated(res, hospitals, total, page, limit);
});

/**
 * GET /medical-tourism/hospitals/:id
 * Get a single hospital with its treatments and packages.
 */
export const getHospitalById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const hospital = await prisma.medicalTourismHospital.findUnique({
    where: { id },
    include: {
      treatments: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      },
      packages: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!hospital) {
    return sendError(res, 'Hospital not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { hospital }, 'Hospital fetched');
});

/**
 * POST /medical-tourism/hospitals
 * Create a new hospital (admin only).
 */
export const createHospital = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const parsed = createHospitalSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const hospital = await prisma.medicalTourismHospital.create({
    data: parsed.data,
  });

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
    select: { name: true },
  });

  await logActivity(
    user.userId,
    admin?.name || 'Admin',
    'CREATE',
    'medical-tourism-hospitals',
    hospital.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, { hospital }, 'Hospital created', 201);
});

/**
 * PUT /medical-tourism/hospitals/:id
 * Update an existing hospital (admin only).
 */
export const updateHospital = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const parsed = updateHospitalSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const existing = await prisma.medicalTourismHospital.findUnique({
    where: { id },
  });

  if (!existing) {
    return sendError(res, 'Hospital not found', 404, 'NOT_FOUND');
  }

  const hospital = await prisma.medicalTourismHospital.update({
    where: { id },
    data: parsed.data,
  });

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
    select: { name: true },
  });

  await logActivity(
    user.userId,
    admin?.name || 'Admin',
    'UPDATE',
    'medical-tourism-hospitals',
    id,
    JSON.stringify({ name: existing.name, city: existing.city, country: existing.country }),
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, { hospital }, 'Hospital updated');
});

// ═══════════════════════════════════════════════════
//  TREATMENTS
// ═══════════════════════════════════════════════════

/**
 * GET /medical-tourism/treatments
 * List all treatments, including hospital name.
 */
export const getTreatments = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { status: 'ACTIVE' as const };

  const [treatments, total] = await Promise.all([
    prisma.medicalTourismTreatment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        hospital: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    }),
    prisma.medicalTourismTreatment.count({ where }),
  ]);

  return sendPaginated(res, treatments, total, page, limit);
});

/**
 * POST /medical-tourism/treatments
 * Create a new treatment (admin only).
 */
export const createTreatment = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const parsed = createTreatmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Verify hospital exists
  const hospital = await prisma.medicalTourismHospital.findUnique({
    where: { id: parsed.data.hospitalId },
  });

  if (!hospital) {
    return sendError(res, 'Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
  }

  const treatment = await prisma.medicalTourismTreatment.create({
    data: parsed.data,
    include: {
      hospital: {
        select: { id: true, name: true },
      },
    },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
    select: { name: true },
  });

  await logActivity(
    user.userId,
    admin?.name || 'Admin',
    'CREATE',
    'medical-tourism-treatments',
    treatment.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, { treatment }, 'Treatment created', 201);
});

// ═══════════════════════════════════════════════════
//  PACKAGES
// ═══════════════════════════════════════════════════

/**
 * GET /medical-tourism/packages
 * List all packages, including hospital name.
 */
export const getPackages = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { status: 'ACTIVE' as const };

  const [packages, total] = await Promise.all([
    prisma.medicalTourismPackage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        hospital: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    }),
    prisma.medicalTourismPackage.count({ where }),
  ]);

  return sendPaginated(res, packages, total, page, limit);
});

/**
 * POST /medical-tourism/packages
 * Create a new package (admin only).
 */
export const createPackage = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const parsed = createPackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Verify hospital exists
  const hospital = await prisma.medicalTourismHospital.findUnique({
    where: { id: parsed.data.hospitalId },
  });

  if (!hospital) {
    return sendError(res, 'Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
  }

  const pkg = await prisma.medicalTourismPackage.create({
    data: parsed.data,
    include: {
      hospital: {
        select: { id: true, name: true },
      },
    },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
    select: { name: true },
  });

  await logActivity(
    user.userId,
    admin?.name || 'Admin',
    'CREATE',
    'medical-tourism-packages',
    pkg.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, { package: pkg }, 'Package created', 201);
});

// ═══════════════════════════════════════════════════
//  ENQUIRIES
// ═══════════════════════════════════════════════════

/**
 * GET /medical-tourism/enquiries
 * List all enquiries with pagination and status filter (admin only).
 */
export const getEnquiries = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  const [enquiries, total] = await Promise.all([
    prisma.medicalTourismEnquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, email: true },
        },
        hospital: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    }),
    prisma.medicalTourismEnquiry.count({ where }),
  ]);

  return sendPaginated(res, enquiries, total, page, limit);
});

/**
 * GET /medical-tourism/enquiries/:id
 * Get full details of a single enquiry (admin only).
 */
export const getEnquiryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const enquiry = await prisma.medicalTourismEnquiry.findUnique({
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
      hospital: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          address: true,
          accreditation: true,
        },
      },
    },
  });

  if (!enquiry) {
    return sendError(res, 'Enquiry not found', 404, 'NOT_FOUND');
  }

  return sendSuccess(res, { enquiry }, 'Enquiry fetched');
});

/**
 * PATCH /medical-tourism/enquiries/:id/status
 * Update the status of an enquiry (admin only).
 */
export const updateEnquiryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const parsed = updateEnquiryStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { status, notes, assignedTo } = parsed.data;

  const existing = await prisma.medicalTourismEnquiry.findUnique({
    where: { id },
  });

  if (!existing) {
    return sendError(res, 'Enquiry not found', 404, 'NOT_FOUND');
  }

  const updateData: Record<string, unknown> = { status };

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  if (assignedTo !== undefined) {
    updateData.assignedTo = assignedTo;
  }

  const enquiry = await prisma.medicalTourismEnquiry.update({
    where: { id },
    data: updateData,
    include: {
      patient: {
        select: { id: true, name: true, phone: true },
      },
      hospital: {
        select: { id: true, name: true },
      },
    },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
    select: { name: true },
  });

  await logActivity(
    user.userId,
    admin?.name || 'Admin',
    'UPDATE',
    'medical-tourism-enquiries',
    id,
    JSON.stringify({ status: existing.status }),
    JSON.stringify({ status, notes, assignedTo }),
    req.ip
  );

  return sendSuccess(res, { enquiry }, 'Enquiry status updated');
});

/**
 * GET /medical-tourism/my/enquiries
 * List enquiries for the authenticated patient.
 */
export const getMyEnquiries = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { patientId };

  const [enquiries, total] = await Promise.all([
    prisma.medicalTourismEnquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        hospital: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    }),
    prisma.medicalTourismEnquiry.count({ where }),
  ]);

  return sendPaginated(res, enquiries, total, page, limit);
});

/**
 * POST /medical-tourism/enquiries
 * Submit a new enquiry (patient only).
 */
export const createEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;

  const parsed = createEnquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { hospitalId, treatmentInterest, message } = parsed.data;

  // Verify hospital exists
  const hospital = await prisma.medicalTourismHospital.findUnique({
    where: { id: hospitalId },
  });

  if (!hospital) {
    return sendError(res, 'Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
  }

  const enquiryNo = generateEnquiryNo();

  const enquiry = await prisma.medicalTourismEnquiry.create({
    data: {
      enquiryNo,
      patientId,
      hospitalId,
      treatmentInterest,
      message,
    },
    include: {
      hospital: {
        select: { id: true, name: true, city: true, country: true },
      },
    },
  });

  return sendSuccess(res, { enquiry }, 'Enquiry submitted', 201);
});

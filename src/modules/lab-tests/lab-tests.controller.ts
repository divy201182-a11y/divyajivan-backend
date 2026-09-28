import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateBookingNo, generateTransactionNo } from '../../utils/generate';
import {
  createLabTestSchema,
  createLabSchema,
  createLabPackageSchema,
  createBookingSchema,
  updateBookingStatusSchema,
} from './lab-tests.validation';

// ═══════════════════════════════════════════════════════════════════
//  LABS
// ═══════════════════════════════════════════════════════════════════

// ─── Admin: List all labs ─────────────────────────────────────────

export const getLabs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [labs, total] = await Promise.all([
    prisma.lab.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lab.count(),
  ]);

  return sendPaginated(res, labs, total, page, limit);
});

// ─── Admin: Create lab ────────────────────────────────────────────

export const createLab = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createLabSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const lab = await prisma.lab.create({ data: parsed.data });

  await logActivity(
    req.user!.userId,
    'Admin',
    'CREATE',
    'labs',
    lab.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, lab, 'Lab created successfully', 201);
});

// ═══════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════

// ─── List lab tests with pagination, search, category filter ──────

export const getLabTests = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const category = req.query.category as string | undefined;

  const where: Record<string, unknown> = { status: 'ACTIVE' };

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (category) {
    where.category = category;
  }

  const [tests, total] = await Promise.all([
    prisma.labTest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lab: { select: { id: true, name: true } },
      },
    }),
    prisma.labTest.count({ where }),
  ]);

  return sendPaginated(res, tests, total, page, limit);
});

// ─── Get single lab test ──────────────────────────────────────────

export const getLabTestById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const test = await prisma.labTest.findUnique({
    where: { id },
    include: {
      lab: true,
    },
  });

  if (!test) {
    return sendError(res, 'Lab test not found', 404);
  }

  return sendSuccess(res, test);
});

// ─── Admin: Create lab test ───────────────────────────────────────

export const createLabTest = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createLabTestSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { labId, ...rest } = parsed.data;

  // Verify lab exists
  const lab = await prisma.lab.findUnique({ where: { id: labId } });
  if (!lab) {
    return sendError(res, 'Lab not found', 404);
  }

  const test = await prisma.labTest.create({
    data: {
      ...rest,
      labId,
    },
    include: {
      lab: { select: { id: true, name: true } },
    },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'CREATE',
    'lab_tests',
    test.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, test, 'Lab test created successfully', 201);
});

// ─── Admin: Update lab test ───────────────────────────────────────

export const updateLabTest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = createLabTestSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const existing = await prisma.labTest.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Lab test not found', 404);
  }

  const { labId, ...rest } = parsed.data;

  // Verify lab exists if labId changed
  if (labId !== existing.labId) {
    const lab = await prisma.lab.findUnique({ where: { id: labId } });
    if (!lab) {
      return sendError(res, 'Lab not found', 404);
    }
  }

  const updated = await prisma.labTest.update({
    where: { id },
    data: {
      ...rest,
      labId,
    },
    include: {
      lab: { select: { id: true, name: true } },
    },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'UPDATE',
    'lab_tests',
    id,
    JSON.stringify(existing),
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, updated, 'Lab test updated successfully');
});

// ═══════════════════════════════════════════════════════════════════
//  PACKAGES
// ═══════════════════════════════════════════════════════════════════

// ─── List lab packages ────────────────────────────────────────────

export const getLabPackages = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    prisma.labPackage.findMany({
      where: { status: 'ACTIVE' },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        tests: {
          include: {
            test: {
              select: { id: true, name: true, category: true, price: true },
            },
          },
        },
      },
    }),
    prisma.labPackage.count({ where: { status: 'ACTIVE' } }),
  ]);

  return sendPaginated(res, packages, total, page, limit);
});

// ─── Admin: Create lab package ────────────────────────────────────

export const createLabPackage = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createLabPackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { testIds, ...packageData } = parsed.data;

  // Verify all test IDs exist
  const existingTests = await prisma.labTest.findMany({
    where: { id: { in: testIds } },
    select: { id: true },
  });

  if (existingTests.length !== testIds.length) {
    return sendError(res, 'One or more test IDs are invalid', 400);
  }

  const labPackage = await prisma.labPackage.create({
    data: {
      ...packageData,
      tests: {
        create: testIds.map((testId) => ({ testId })),
      },
    },
    include: {
      tests: {
        include: {
          test: {
            select: { id: true, name: true, category: true, price: true },
          },
        },
      },
    },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'CREATE',
    'lab_packages',
    labPackage.id,
    undefined,
    JSON.stringify(parsed.data),
    req.ip
  );

  return sendSuccess(res, labPackage, 'Lab package created successfully', 201);
});

// ═══════════════════════════════════════════════════════════════════
//  BOOKINGS
// ═══════════════════════════════════════════════════════════════════

// ─── Admin: List bookings ─────────────────────────────────────────

export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.labBooking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        test: { select: { id: true, name: true, category: true, price: true } },
        lab: { select: { id: true, name: true } },
      },
    }),
    prisma.labBooking.count({ where }),
  ]);

  return sendPaginated(res, bookings, total, page, limit);
});

// ─── Admin: Get single booking ────────────────────────────────────

export const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await prisma.labBooking.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          gender: true,
          address: true,
        },
      },
      test: {
        include: {
          lab: true,
        },
      },
      lab: true,
      payment: true,
    },
  });

  if (!booking) {
    return sendError(res, 'Booking not found', 404);
  }

  return sendSuccess(res, booking);
});

// ─── Admin: Update booking status ─────────────────────────────────

export const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = updateBookingStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { status, reportUrl, notes } = parsed.data;

  const booking = await prisma.labBooking.findUnique({ where: { id } });
  if (!booking) {
    return sendError(res, 'Booking not found', 404);
  }

  // Validate status transition
  const currentStatus = booking.status;
  const validTransitions: Record<string, string[]> = {
    REQUESTED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SAMPLE_COLLECTED', 'CANCELLED'],
    SAMPLE_COLLECTED: ['REPORT_READY', 'CANCELLED'],
    REPORT_READY: ['COMPLETED', 'CANCELLED'],
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

  const updated = await prisma.labBooking.update({
    where: { id },
    data: {
      status,
      ...(reportUrl && { reportUrl }),
      ...(notes && { notes }),
    },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      test: { select: { id: true, name: true } },
      lab: { select: { id: true, name: true } },
    },
  });

  await logActivity(
    req.user!.userId,
    'Admin',
    'UPDATE_STATUS',
    'lab_bookings',
    id,
    currentStatus,
    status,
    req.ip
  );

  return sendSuccess(res, updated, 'Booking status updated');
});

// ─── Patient: Get own bookings ────────────────────────────────────

export const getMyBookings = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { patientId };

  const [bookings, total] = await Promise.all([
    prisma.labBooking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            lab: { select: { id: true, name: true } },
          },
        },
        lab: { select: { id: true, name: true } },
      },
    }),
    prisma.labBooking.count({ where }),
  ]);

  return sendPaginated(res, bookings, total, page, limit);
});

// ─── Patient: Create booking ──────────────────────────────────────

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const parsed = createBookingSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400);
  }

  const { testId, labId, scheduledDate, homeCollection, collectionAddress } = parsed.data;

  // Verify test exists
  const test = await prisma.labTest.findUnique({ where: { id: testId } });
  if (!test) {
    return sendError(res, 'Lab test not found', 404);
  }

  // Verify lab exists
  const lab = await prisma.lab.findUnique({ where: { id: labId } });
  if (!lab) {
    return sendError(res, 'Lab not found', 404);
  }

  const bookingNo = generateBookingNo();
  const transactionNo = generateTransactionNo();

  const booking = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.labBooking.create({
      data: {
        bookingNo,
        patientId,
        testId,
        labId,
        scheduledDate: new Date(scheduledDate),
        homeCollection: homeCollection || false,
        collectionAddress,
      },
      include: {
        test: {
          select: { id: true, name: true, category: true, price: true },
        },
        lab: { select: { id: true, name: true } },
      },
    });

    // Create payment record
    await tx.payment.create({
      data: {
        transactionNo,
        patientId,
        type: 'LAB_TEST',
        amount: test.price,
        status: 'PENDING',
        labBookingId: newBooking.id,
      },
    });

    return newBooking;
  });

  return sendSuccess(res, booking, 'Lab test booking created successfully', 201);
});

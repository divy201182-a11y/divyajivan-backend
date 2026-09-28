import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import {
  createMedicineSchema,
  updateMedicineSchema,
  createCategorySchema,
  updateStockSchema,
} from './medicines.validation';

// ─── Get Medicines ─────────────────────────────────

/**
 * GET /medicines
 * List medicines with pagination, search, category filter, and status filter.
 */
export const getMedicines = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const categoryId = req.query.categoryId as string;
  const status = req.query.status as string;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    where.status = status;
  }

  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      include: { category: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicine.count({ where }),
  ]);

  return sendPaginated(res, medicines, total, page, limit);
});

// ─── Get Medicine By ID ────────────────────────────

/**
 * GET /medicines/:id
 * Get a single medicine by ID.
 */
export const getMedicineById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const medicine = await prisma.medicine.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!medicine) {
    return sendError(res, 'Medicine not found', 404);
  }

  return sendSuccess(res, medicine, 'Medicine fetched');
});

// ─── Create Medicine ───────────────────────────────

/**
 * POST /medicines
 * Create a new medicine (admin only).
 */
export const createMedicine = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createMedicineSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { categoryId, ...data } = parsed.data;

  // Check category exists
  const category = await prisma.medicineCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  const medicine = await prisma.medicine.create({
    data: {
      ...data,
      categoryId,
    },
    include: { category: true },
  });

  // Log admin activity
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'CREATE',
    'medicines',
    medicine.id,
    undefined,
    JSON.stringify({ name: medicine.name, price: medicine.price }),
    req.ip
  );

  return sendSuccess(res, medicine, 'Medicine created', 201);
});

// ─── Update Medicine ───────────────────────────────

/**
 * PUT /medicines/:id
 * Update an existing medicine (admin only).
 */
export const updateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updateMedicineSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check medicine exists
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Medicine not found', 404);
  }

  // If categoryId is being updated, verify it exists
  if (parsed.data.categoryId) {
    const category = await prisma.medicineCategory.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
  }

  const medicine = await prisma.medicine.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  // Log admin activity
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'UPDATE',
    'medicines',
    medicine.id,
    JSON.stringify({ name: existing.name, price: existing.price }),
    JSON.stringify({ name: medicine.name, price: medicine.price }),
    req.ip
  );

  return sendSuccess(res, medicine, 'Medicine updated');
});

// ─── Update Stock ──────────────────────────────────

/**
 * PATCH /medicines/:id/stock
 * Update medicine stock (admin only).
 */
export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updateStockSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Medicine not found', 404);
  }

  const medicine = await prisma.medicine.update({
    where: { id },
    data: { stock: parsed.data.stock },
  });

  // Log admin activity
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'UPDATE_STOCK',
    'medicines',
    medicine.id,
    JSON.stringify({ stock: existing.stock }),
    JSON.stringify({ stock: medicine.stock }),
    req.ip
  );

  return sendSuccess(res, medicine, 'Stock updated');
});

// ─── Deactivate Medicine ───────────────────────────

/**
 * PATCH /medicines/:id/deactivate
 * Deactivate a medicine (admin only).
 */
export const deactivateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Medicine not found', 404);
  }

  const medicine = await prisma.medicine.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });

  // Log admin activity
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'DEACTIVATE',
    'medicines',
    medicine.id,
    JSON.stringify({ status: existing.status }),
    JSON.stringify({ status: 'INACTIVE' }),
    req.ip
  );

  return sendSuccess(res, medicine, 'Medicine deactivated');
});

// ─── Get Categories ────────────────────────────────

/**
 * GET /medicines/categories
 * List all medicine categories.
 */
export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.medicineCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { medicines: true } },
    },
  });

  return sendSuccess(res, categories, 'Categories fetched');
});

// ─── Create Category ───────────────────────────────

/**
 * POST /medicines/categories
 * Create a new medicine category (admin only).
 */
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  // Check for duplicate category name
  const existing = await prisma.medicineCategory.findUnique({
    where: { name: parsed.data.name },
  });

  if (existing) {
    return sendError(res, 'Category with this name already exists', 409);
  }

  const category = await prisma.medicineCategory.create({
    data: { name: parsed.data.name },
  });

  // Log admin activity
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  await logActivity(
    req.user!.userId,
    admin?.name || 'Unknown',
    'CREATE',
    'medicine_categories',
    category.id,
    undefined,
    JSON.stringify({ name: category.name }),
    req.ip
  );

  return sendSuccess(res, category, 'Category created', 201);
});

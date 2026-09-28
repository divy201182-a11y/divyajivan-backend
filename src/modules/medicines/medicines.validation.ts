import { z } from 'zod';

// ─── Create Medicine ───────────────────────────────
export const createMedicineSchema = z.object({
  name: z
    .string({ required_error: 'Medicine name is required' })
    .min(2, 'Name must be at least 2 characters'),
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .uuid('Invalid category ID'),
  brand: z.string().optional(),
  description: z.string().optional(),
  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be a positive number'),
  discountPercent: z
    .number()
    .min(0, 'Discount percent must be at least 0')
    .max(100, 'Discount percent cannot exceed 100')
    .optional(),
  stock: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .optional(),
  prescriptionRequired: z.boolean().optional(),
  image: z.string().optional(),
});

// ─── Update Medicine ───────────────────────────────
export const updateMedicineSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be a positive number').optional(),
  discountPercent: z
    .number()
    .min(0, 'Discount percent must be at least 0')
    .max(100, 'Discount percent cannot exceed 100')
    .optional(),
  stock: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .optional(),
  prescriptionRequired: z.boolean().optional(),
  image: z.string().optional(),
});

// ─── Create Category ───────────────────────────────
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .min(2, 'Category name must be at least 2 characters'),
});

// ─── Update Stock ──────────────────────────────────
export const updateStockSchema = z.object({
  stock: z
    .number({ required_error: 'Stock is required' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative'),
});

// ─── Inferred Types ────────────────────────────────
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;

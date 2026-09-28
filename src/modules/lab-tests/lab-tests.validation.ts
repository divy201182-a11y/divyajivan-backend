import { z } from 'zod';

export const createLabTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  discountPercent: z.number().min(0).max(100).optional(),
  homeCollection: z.boolean().optional(),
  labId: z.string().uuid('Invalid lab ID'),
});

export const createLabSchema = z.object({
  name: z.string().min(1, 'Lab name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
});

export const createLabPackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  discountPercent: z.number().min(0).max(100).optional(),
  testIds: z.array(z.string().uuid('Invalid test ID')).min(1, 'At least one test is required'),
});

export const createBookingSchema = z.object({
  testId: z.string().uuid('Invalid test ID'),
  labId: z.string().uuid('Invalid lab ID'),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
  homeCollection: z.boolean().optional(),
  collectionAddress: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum([
    'REQUESTED',
    'CONFIRMED',
    'SAMPLE_COLLECTED',
    'REPORT_READY',
    'COMPLETED',
    'CANCELLED',
  ]),
  reportUrl: z.string().optional(),
  notes: z.string().optional(),
});

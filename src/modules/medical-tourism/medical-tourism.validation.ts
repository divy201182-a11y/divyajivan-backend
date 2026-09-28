import { z } from 'zod';

// ─── Create Hospital (admin) ───────────────────────
export const createHospitalSchema = z.object({
  name: z
    .string({ required_error: 'Hospital name is required' })
    .min(2, 'Name must be at least 2 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .min(2, 'City must be at least 2 characters'),
  country: z
    .string({ required_error: 'Country is required' })
    .min(2, 'Country must be at least 2 characters'),
  address: z
    .string()
    .optional(),
  description: z
    .string()
    .optional(),
  accreditation: z
    .string()
    .optional(),
});

// ─── Update Hospital (admin) ───────────────────────
export const updateHospitalSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .optional(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .optional(),
  address: z
    .string()
    .optional(),
  description: z
    .string()
    .optional(),
  accreditation: z
    .string()
    .optional(),
});

// ─── Create Treatment (admin) ──────────────────────
export const createTreatmentSchema = z.object({
  name: z
    .string({ required_error: 'Treatment name is required' })
    .min(2, 'Name must be at least 2 characters'),
  category: z
    .string({ required_error: 'Category is required' })
    .min(2, 'Category must be at least 2 characters'),
  description: z
    .string()
    .optional(),
  hospitalId: z
    .string({ required_error: 'Hospital ID is required' })
    .uuid('Hospital ID must be a valid UUID'),
  estimatedCost: z
    .number()
    .min(0, 'Estimated cost cannot be negative')
    .optional(),
});

// ─── Create Package (admin) ────────────────────────
export const createPackageSchema = z.object({
  name: z
    .string({ required_error: 'Package name is required' })
    .min(2, 'Name must be at least 2 characters'),
  hospitalId: z
    .string({ required_error: 'Hospital ID is required' })
    .uuid('Hospital ID must be a valid UUID'),
  description: z
    .string()
    .optional(),
  price: z
    .number({ required_error: 'Price is required' })
    .min(0, 'Price cannot be negative'),
  duration: z
    .string()
    .optional(),
  inclusions: z
    .array(z.string())
    .min(1, 'At least one inclusion is required'),
});

// ─── Create Enquiry (patient) ──────────────────────
export const createEnquirySchema = z.object({
  hospitalId: z
    .string({ required_error: 'Hospital ID is required' })
    .uuid('Hospital ID must be a valid UUID'),
  treatmentInterest: z
    .string()
    .optional(),
  message: z
    .string()
    .optional(),
});

// ─── Update Enquiry Status (admin) ─────────────────
export const updateEnquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'UNDER_DISCUSSION', 'CONFIRMED', 'CLOSED'], {
    required_error: 'Status is required',
  }),
  notes: z
    .string()
    .optional(),
  assignedTo: z
    .string()
    .optional(),
});

// ─── Inferred Types ────────────────────────────────
export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>;
export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;
export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryStatusInput = z.infer<typeof updateEnquiryStatusSchema>;

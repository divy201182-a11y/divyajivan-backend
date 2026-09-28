import { z } from 'zod';

// ─── Create Insurance Plan ─────────────────────────
export const createPlanSchema = z.object({
  name: z
    .string({ required_error: 'Plan name is required' })
    .min(2, 'Plan name must be at least 2 characters'),
  description: z
    .string()
    .optional(),
  premium: z
    .number({ required_error: 'Premium amount is required' })
    .positive('Premium must be a positive number'),
  coverage: z
    .number({ required_error: 'Coverage amount is required' })
    .positive('Coverage must be a positive number'),
  duration: z
    .number({ required_error: 'Duration is required' })
    .int('Duration must be a whole number')
    .positive('Duration must be a positive number'),
  features: z
    .array(z.string())
    .min(1, 'At least one feature is required'),
});

// ─── Update Insurance Plan ─────────────────────────
export const updatePlanSchema = z.object({
  name: z
    .string()
    .min(2, 'Plan name must be at least 2 characters')
    .optional(),
  description: z
    .string()
    .optional(),
  premium: z
    .number()
    .positive('Premium must be a positive number')
    .optional(),
  coverage: z
    .number()
    .positive('Coverage must be a positive number')
    .optional(),
  duration: z
    .number()
    .int('Duration must be a whole number')
    .positive('Duration must be a positive number')
    .optional(),
  features: z
    .array(z.string())
    .min(1, 'At least one feature is required')
    .optional(),
});

// ─── Apply for Insurance ───────────────────────────
export const applyInsuranceSchema = z.object({
  planId: z
    .string({ required_error: 'Plan ID is required' })
    .uuid('Invalid plan ID'),
});

// ─── Review Application ────────────────────────────
export const reviewApplicationSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be UNDER_REVIEW, APPROVED, REJECTED, or ACTIVE',
  }),
  rejectionReason: z
    .string()
    .optional(),
  policyNumber: z
    .string()
    .optional(),
  startDate: z
    .string()
    .optional(),
  endDate: z
    .string()
    .optional(),
});

// ─── Inferred Types ────────────────────────────────
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ApplyInsuranceInput = z.infer<typeof applyInsuranceSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

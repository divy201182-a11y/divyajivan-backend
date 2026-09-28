import { z } from 'zod';

// ─── Create Membership Plan ────────────────────────
export const createMembershipPlanSchema = z.object({
  name: z
    .string({ required_error: 'Plan name is required' })
    .min(2, 'Plan name must be at least 2 characters'),
  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be a positive number'),
  duration: z
    .number({ required_error: 'Duration is required' })
    .int('Duration must be a whole number')
    .positive('Duration must be a positive number'),
  benefits: z
    .array(z.string())
    .min(1, 'At least one benefit is required'),
});

// ─── Update Membership Plan ────────────────────────
export const updateMembershipPlanSchema = z.object({
  name: z
    .string()
    .min(2, 'Plan name must be at least 2 characters')
    .optional(),
  price: z
    .number()
    .positive('Price must be a positive number')
    .optional(),
  duration: z
    .number()
    .int('Duration must be a whole number')
    .positive('Duration must be a positive number')
    .optional(),
  benefits: z
    .array(z.string())
    .min(1, 'At least one benefit is required')
    .optional(),
});

// ─── Purchase Membership ───────────────────────────
export const purchaseMembershipSchema = z.object({
  planId: z
    .string({ required_error: 'Plan ID is required' })
    .uuid('Invalid plan ID'),
});

// ─── Inferred Types ────────────────────────────────
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
export type PurchaseMembershipInput = z.infer<typeof purchaseMembershipSchema>;

import { z } from 'zod';

// ─── Create Patient (admin) ──────────────────────
export const createPatientSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  phone: z
    .string({ required_error: 'Phone is required' })
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  email: z.string().email('Invalid email address').optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
    .optional(),
});

// ─── Update Patient (admin or self-service) ────────
export const updatePatientSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .optional(),
  dateOfBirth: z
    .string()
    .optional(),
  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'])
    .optional(),
  address: z
    .string()
    .optional(),
  city: z
    .string()
    .optional(),
  state: z
    .string()
    .optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
    .optional(),
});

// ─── Add Family Member ─────────────────────────────
export const addFamilyMemberSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  relation: z
    .string({ required_error: 'Relation is required' })
    .min(2, 'Relation must be at least 2 characters'),
  dateOfBirth: z
    .string()
    .optional(),
  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'])
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .optional(),
});

// ─── Inferred Types ────────────────────────────────
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;

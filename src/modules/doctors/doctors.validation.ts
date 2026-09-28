import { z } from 'zod';

// ─── Create Doctor ─────────────────────────────────
export const createDoctorSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  specialization: z
    .string({ required_error: 'Specialization is required' })
    .min(2, 'Specialization must be at least 2 characters'),
  qualification: z
    .string({ required_error: 'Qualification is required' })
    .min(2, 'Qualification must be at least 2 characters'),
  experience: z
    .number({ required_error: 'Experience is required' })
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative'),
  phone: z
    .string({ required_error: 'Phone is required' })
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  consultationFee: z
    .number({ required_error: 'Consultation fee is required' })
    .min(0, 'Consultation fee cannot be negative'),
  hospital: z
    .string()
    .optional(),
  bio: z
    .string()
    .optional(),
});

// ─── Update Doctor ─────────────────────────────────
export const updateDoctorSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  specialization: z
    .string()
    .min(2, 'Specialization must be at least 2 characters')
    .optional(),
  qualification: z
    .string()
    .min(2, 'Qualification must be at least 2 characters')
    .optional(),
  experience: z
    .number()
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative')
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  consultationFee: z
    .number()
    .min(0, 'Consultation fee cannot be negative')
    .optional(),
  hospital: z
    .string()
    .optional(),
  bio: z
    .string()
    .optional(),
});

// ─── Set Availability ──────────────────────────────
export const setAvailabilitySchema = z.object({
  availability: z.array(
    z.object({
      day: z.enum([
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY',
      ], { required_error: 'Day is required' }),
      startTime: z
        .string({ required_error: 'Start time is required' })
        .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
      endTime: z
        .string({ required_error: 'End time is required' })
        .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'),
      isActive: z
        .boolean()
        .optional()
        .default(true),
    })
  ).min(1, 'At least one availability slot is required'),
});

// ─── Inferred Types ────────────────────────────────
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;

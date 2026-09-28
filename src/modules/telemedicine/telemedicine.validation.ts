import { z } from 'zod';

// ─── Create Consultation (patient) ─────────────────
export const createConsultationSchema = z.object({
  doctorId: z
    .string({ required_error: 'Doctor ID is required' })
    .uuid('Doctor ID must be a valid UUID'),
  scheduledDate: z
    .string({ required_error: 'Scheduled date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Scheduled date must be a valid ISO date string'),
  scheduledTime: z
    .string({ required_error: 'Scheduled time is required' })
    .regex(/^\d{2}:\d{2}$/, 'Scheduled time must be in HH:MM format'),
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(10, 'Duration must be at least 10 minutes')
    .max(120, 'Duration must not exceed 120 minutes')
    .optional()
    .default(30),
});

// ─── Update Consultation Status (admin) ────────────
export const updateConsultationStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    required_error: 'Status is required',
  }),
  meetingLink: z
    .string()
    .url('Meeting link must be a valid URL')
    .optional(),
  notes: z
    .string()
    .optional(),
});

// ─── Inferred Types ────────────────────────────────
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationStatusInput = z.infer<typeof updateConsultationStatusSchema>;

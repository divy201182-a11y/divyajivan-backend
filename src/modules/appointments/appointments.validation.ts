import { z } from 'zod';

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
  time: z.string().min(1, 'Time is required'),
  consultationType: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).optional(),
  reason: z.string().optional(),
});

export const adminCreateAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
  time: z.string().min(1, 'Time is required'),
  consultationType: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).optional(),
  reason: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  cancelReason: z.string().optional(),
  notes: z.string().optional(),
});

export const rescheduleSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
  time: z.string().min(1, 'Time is required'),
});

import { z } from 'zod';

// ─── Admin Login ────────────────────────────────────
export const adminLoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

// ─── Patient Registration ───────────────────────────
export const patientRegisterSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  dateOfBirth: z
    .string()
    .optional(),
  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'])
    .optional(),
});

// ─── Request OTP ────────────────────────────────────
export const requestOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
});

// ─── Verify OTP ─────────────────────────────────────
export const verifyOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  otp: z
    .string({ required_error: 'OTP is required' })
    .length(6, 'OTP must be exactly 6 digits'),
});

// ─── Refresh Token ──────────────────────────────────
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' }),
});

// ─── Inferred Types ─────────────────────────────────
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

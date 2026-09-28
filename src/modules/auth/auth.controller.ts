import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import logger from '../../utils/logger';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  createOtp,
  verifyOtp,
} from './auth.service';
import {
  adminLoginSchema,
  patientRegisterSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from './auth.validation';

// ─── Admin Auth ─────────────────────────────────────

/**
 * POST /auth/admin/login
 * Admin login with email and password.
 */
export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { email, password } = parsed.data;

  // Find admin by email
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(admin.passwordHash, password);
  if (!isPasswordValid) {
    return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (admin.status !== 'ACTIVE') {
    return sendError(res, 'Account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(
    admin.id,
    'admin',
    admin.role
  );

  // Update last login timestamp
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`Admin logged in: ${admin.email}`);

  return sendSuccess(
    res,
    {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      accessToken,
      refreshToken,
    },
    'Login successful'
  );
});

/**
 * POST /auth/admin/logout
 * Admin logout. Requires authentication.
 */
export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  logger.info(`Admin logged out: ${(req as any).user?.userId}`);

  return sendSuccess(res, null, 'Logged out successfully');
});

// ─── Patient Auth ───────────────────────────────────

/**
 * POST /auth/register
 * Register a new patient (OTP-based auth, no password required).
 */
export const patientRegister = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const parsed = patientRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { name, phone, email, dateOfBirth, gender } = parsed.data;

  // Check if phone number is already taken
  const existingPatient = await prisma.patient.findUnique({
    where: { phone },
  });

  if (existingPatient) {
    return sendError(res, 'Phone number is already registered', 409, 'PHONE_EXISTS');
  }

  // Check if email is already taken (if provided)
  if (email) {
    const existingEmail = await prisma.patient.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return sendError(res, 'Email is already registered', 409, 'EMAIL_EXISTS');
    }
  }

  // Create patient record
  const patient = await prisma.patient.create({
    data: {
      name,
      phone,
      email: email || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || undefined,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      gender: true,
      createdAt: true,
    },
  });

  logger.info(`New patient registered: ${phone}`);

  return sendSuccess(res, { patient }, 'Registration successful', 201);
});

/**
 * POST /auth/request-otp
 * Request an OTP for patient login.
 */
export const patientRequestOtp = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { phone } = parsed.data;

  // Find or create a minimal patient record
  let patient = await prisma.patient.findUnique({
    where: { phone },
  });

  if (!patient) {
    // Create a minimal record so they can complete registration after OTP verification
    patient = await prisma.patient.create({
      data: {
        name: 'New User',
        phone,
      },
    });
    logger.info(`Minimal patient record created for: ${phone}`);
  }

  // Create and send OTP
  await createOtp(phone, 'LOGIN');

  return sendSuccess(res, null, 'OTP sent successfully');
});

/**
 * POST /auth/verify-otp
 * Verify OTP and log the patient in.
 */
export const patientVerifyOtp = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { phone, otp } = parsed.data;

  // Verify the OTP
  const isValid = await verifyOtp(phone, otp, 'LOGIN');
  if (!isValid) {
    return sendError(res, 'Invalid or expired OTP', 401, 'INVALID_OTP');
  }

  // Find the patient
  const patient = await prisma.patient.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      gender: true,
      status: true,
      profileImage: true,
      createdAt: true,
    },
  });

  if (!patient) {
    return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
  }

  if (patient.status !== 'ACTIVE') {
    return sendError(res, 'Account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(patient.id, 'patient');

  logger.info(`Patient logged in via OTP: ${phone}`);

  return sendSuccess(
    res,
    {
      patient,
      accessToken,
      refreshToken,
    },
    'Login successful'
  );
});

/**
 * POST /auth/login
 * Patient login with phone and optional password.
 */
export const patientLogin = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  if (!phone) {
    return sendError(res, 'Phone number is required', 400, 'VALIDATION_ERROR');
  }

  // If no password is provided, direct them to the OTP flow
  if (!password) {
    return sendError(
      res,
      'Please use the OTP login flow. Send a POST to /auth/request-otp',
      400,
      'USE_OTP_FLOW'
    );
  }

  // Find patient by phone
  const patient = await prisma.patient.findUnique({
    where: { phone },
  });

  if (!patient) {
    return sendError(res, 'Invalid phone number or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if the patient has a password set
  if (!patient.passwordHash) {
    return sendError(
      res,
      'Password not set. Please use the OTP login flow.',
      400,
      'USE_OTP_FLOW'
    );
  }

  // Verify password
  const isPasswordValid = await verifyPassword(patient.passwordHash, password);
  if (!isPasswordValid) {
    return sendError(res, 'Invalid phone number or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (patient.status !== 'ACTIVE') {
    return sendError(res, 'Account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(patient.id, 'patient');

  logger.info(`Patient logged in via password: ${phone}`);

  return sendSuccess(
    res,
    {
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        profileImage: patient.profileImage,
      },
      accessToken,
      refreshToken,
    },
    'Login successful'
  );
});

/**
 * POST /auth/logout
 * Patient logout. Requires authentication.
 */
export const patientLogout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  logger.info(`Patient logged out: ${(req as any).user?.userId}`);

  return sendSuccess(res, null, 'Logged out successfully');
});

// ─── Common ─────────────────────────────────────────

/**
 * POST /auth/refresh
 * Refresh the access token using a valid refresh token.
 */
export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const parsed = refreshTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { refreshToken } = parsed.data;

  // Verify the refresh token
  const tokenRecord = await verifyRefreshToken(refreshToken);
  if (!tokenRecord) {
    return sendError(res, 'Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Determine the role (look it up if the user is an admin)
  let role: string | undefined;
  if (tokenRecord.userType === 'admin') {
    const admin = await prisma.admin.findUnique({
      where: { id: tokenRecord.userId },
      select: { role: true },
    });
    role = admin?.role;
  }

  // Generate a new token pair
  const newTokens = await generateTokens(
    tokenRecord.userId,
    tokenRecord.userType as 'admin' | 'patient',
    role
  );

  // Revoke the old refresh token
  await revokeRefreshToken(refreshToken);

  return sendSuccess(
    res,
    {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    },
    'Token refreshed successfully'
  );
});

/**
 * GET /auth/me
 * Get the current authenticated user's profile.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user) {
    return sendError(res, 'Not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  if (user.userType === 'admin') {
    const admin = await prisma.admin.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return sendError(res, 'Admin not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { user: { ...admin, userType: 'admin' } }, 'Profile fetched');
  }

  if (user.userType === 'patient') {
    const patient = await prisma.patient.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        profileImage: true,
        status: true,
        pointsBalance: true,
        createdAt: true,
      },
    });

    if (!patient) {
      return sendError(res, 'Patient not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { user: { ...patient, userType: 'patient' } }, 'Profile fetched');
  }

  return sendError(res, 'Unknown user type', 400, 'UNKNOWN_USER_TYPE');
});

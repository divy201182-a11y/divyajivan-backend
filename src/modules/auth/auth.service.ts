import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { generateOtp } from '../../utils/generate';
import logger from '../../utils/logger';
import { getOTPProvider } from './otp.service';

// ─── Types ──────────────────────────────────────────

interface JwtPayload {
  userId: string;
  userType: 'admin' | 'patient';
  role?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Password Hashing ───────────────────────────────

/**
 * Hash a plain-text password using argon2.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verify a password against an argon2 hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ─── Token Management ───────────────────────────────

/**
 * Generate an access token (JWT) and a refresh token (random UUID stored in DB).
 */
export async function generateTokens(
  userId: string,
  userType: 'admin' | 'patient',
  role?: string
): Promise<TokenPair> {
  // Build JWT payload
  const payload: JwtPayload = { userId, userType };
  if (role) {
    payload.role = role;
  }

  // Sign the access token
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  // Create a random refresh token and store it in the database
  const refreshTokenValue = uuidv4();
  const refreshExpiresIn = config.jwt.refreshExpiresIn; // e.g. '7d'
  const expiresAt = calculateExpiry(refreshExpiresIn);

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId,
      userType,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

/**
 * Verify a refresh token by looking it up in the database.
 * Returns the token record if valid, or null if not found / expired.
 */
export async function verifyRefreshToken(token: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!record) {
    return null;
  }

  // Check if the token has expired
  if (record.expiresAt < new Date()) {
    // Clean up the expired token
    await prisma.refreshToken.delete({ where: { id: record.id } });
    return null;
  }

  return record;
}

/**
 * Revoke (delete) a single refresh token from the database.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    await prisma.refreshToken.delete({
      where: { token },
    });
  } catch {
    // Token may already be deleted; that's fine
    logger.warn(`Refresh token not found for revocation: ${token.substring(0, 8)}...`);
  }
}

/**
 * Revoke all refresh tokens for a given user.
 * Useful when a user changes their password or wants to log out everywhere.
 */
export async function revokeAllUserTokens(
  userId: string,
  userType: string
): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId, userType },
  });
}

// ─── OTP Management ─────────────────────────────────

/**
 * Create a new OTP for the given identifier (phone number) and purpose.
 * - Generates a 6-digit OTP (or uses the dev code if dev mode is enabled).
 * - Hashes the OTP with argon2 before storing it.
 * - Stores the OTP in the otp_requests table with a 5-minute expiry.
 * - Sends the OTP via the configured provider (console, SMS, or WhatsApp).
 */
export async function createOtp(
  identifier: string,
  purpose: string = 'LOGIN'
): Promise<boolean> {
  // Use the dev code if dev mode is enabled; otherwise generate a random OTP
  const otp = config.otp.devEnabled ? config.otp.devCode : generateOtp();

  // Hash the OTP for secure storage
  const otpHash = await argon2.hash(otp);

  // Set expiry to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Store the OTP request
  await prisma.otpRequest.create({
    data: {
      identifier,
      otpHash,
      purpose,
      expiresAt,
    },
  });

  // Send the OTP via the configured provider
  const provider = getOTPProvider();
  await provider.sendOtp(identifier, otp);

  logger.info(`OTP created for ${identifier} (purpose: ${purpose})`);
  return true;
}

/**
 * Verify an OTP for the given identifier and purpose.
 * - Finds the latest unexpired, unverified OTP for the identifier + purpose.
 * - Checks that the attempt count hasn't exceeded the maximum.
 * - Verifies the OTP hash.
 * - On failure: increments the attempt counter.
 * - On success: marks the OTP as verified.
 */
export async function verifyOtp(
  identifier: string,
  otp: string,
  purpose: string = 'LOGIN'
): Promise<boolean> {
  // Find the latest unexpired, unverified OTP for this identifier + purpose
  const otpRecord = await prisma.otpRequest.findFirst({
    where: {
      identifier,
      purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    logger.warn(`No valid OTP found for ${identifier} (purpose: ${purpose})`);
    return false;
  }

  // Check if max attempts have been reached
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    logger.warn(`Max OTP attempts reached for ${identifier}`);
    return false;
  }

  // Verify the OTP against the stored hash
  const isValid = await argon2.verify(otpRecord.otpHash, otp);

  if (!isValid) {
    // Increment attempt counter on failure
    await prisma.otpRequest.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    logger.warn(`Invalid OTP attempt for ${identifier} (attempt ${otpRecord.attempts + 1})`);
    return false;
  }

  // Mark as verified on success
  await prisma.otpRequest.update({
    where: { id: otpRecord.id },
    data: { verified: true },
  });

  logger.info(`OTP verified successfully for ${identifier}`);
  return true;
}

// ─── Helpers ────────────────────────────────────────

/**
 * Calculate an expiry Date from a duration string like '7d', '1h', '30m'.
 */
function calculateExpiry(duration: string): Date {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);

  const now = new Date();

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    default:
      // Default to 7 days if the format is unrecognized
      now.setDate(now.getDate() + 7);
  }

  return now;
}

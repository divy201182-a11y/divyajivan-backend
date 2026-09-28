import rateLimit from 'express-rate-limit';
import { config } from '../config';

const isDev = config.nodeEnv === 'development';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDev ? 10000 : config.rateLimit.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDev ? 1000 : 20,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: isDev ? 100 : 5,
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMIT_EXCEEDED',
      message: 'Too many OTP requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

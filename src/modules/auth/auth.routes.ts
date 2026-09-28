import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { otpLimiter } from '../../middleware/rateLimiter';
import {
  adminLogin,
  adminLogout,
  patientRegister,
  patientRequestOtp,
  patientVerifyOtp,
  patientLogin,
  patientLogout,
  refreshTokenHandler,
  getMe,
} from './auth.controller';

const router = Router();

// ─── Admin Routes ───────────────────────────────────
router.post('/admin/login', adminLogin);
router.post('/admin/logout', requireAdmin, adminLogout);

// ─── Patient Routes ─────────────────────────────────
router.post('/register', patientRegister);
router.post('/request-otp', otpLimiter, patientRequestOtp);
router.post('/verify-otp', patientVerifyOtp);
router.post('/login', patientLogin);
router.post('/logout', authenticate, patientLogout);

// ─── Common Routes ──────────────────────────────────
router.post('/refresh', refreshTokenHandler);
router.get('/me', authenticate, getMe);

export default router;

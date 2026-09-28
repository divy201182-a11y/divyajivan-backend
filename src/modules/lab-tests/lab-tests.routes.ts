import { Router } from 'express';
import { authenticate, requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getLabs,
  createLab,
  getLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  getLabPackages,
  createLabPackage,
  getMyBookings,
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
} from './lab-tests.controller';

const router = Router();

// ─── Labs ────────────────────────────────────────────────────────

router.get('/labs', requireAdmin, getLabs);
router.post('/labs', requireAdmin, createLab);

// ─── Tests ───────────────────────────────────────────────────────

router.get('/tests', authenticate, getLabTests);
router.get('/tests/:id', authenticate, getLabTestById);
router.post('/tests', requireAdmin, createLabTest);
router.put('/tests/:id', requireAdmin, updateLabTest);

// ─── Packages ────────────────────────────────────────────────────

router.get('/packages', authenticate, getLabPackages);
router.post('/packages', requireAdmin, createLabPackage);

// ─── Bookings — patient (must come before /bookings/:id) ─────────

router.get('/my/bookings', requirePatient, getMyBookings);
router.post('/bookings', requirePatient, createBooking);

// ─── Bookings — admin ────────────────────────────────────────────

router.get('/bookings', requireAdmin, getBookings);
router.get('/bookings/:id', requireAdmin, getBookingById);
router.patch('/bookings/:id/status', requireAdmin, updateBookingStatus);

export default router;

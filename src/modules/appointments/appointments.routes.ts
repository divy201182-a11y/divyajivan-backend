import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  adminCreateAppointment,
  getMyAppointments,
  createAppointment,
  cancelMyAppointment,
} from './appointments.controller';

const router = Router();

// ─── Patient routes (must come before /:id) ──────────────────────

router.get('/my', requirePatient, getMyAppointments);
router.post('/', requirePatient, createAppointment);
router.patch('/my/:id/cancel', requirePatient, cancelMyAppointment);

// ─── Admin routes ────────────────────────────────────────────────

router.post('/admin', requireAdmin, adminCreateAppointment);
router.get('/', requireAdmin, getAppointments);
router.get('/:id', requireAdmin, getAppointmentById);
router.patch('/:id/status', requireAdmin, updateAppointmentStatus);
router.patch('/:id/reschedule', requireAdmin, rescheduleAppointment);

export default router;

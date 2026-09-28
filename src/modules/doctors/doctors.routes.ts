import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  deactivateDoctor,
  activateDoctor,
  setAvailability,
  getAvailability,
} from './doctors.controller';

const router = Router();

// ─── Admin Routes ──────────────────────────────────
router.get('/', requireAdmin, getDoctors);
router.post('/', requireAdmin, createDoctor);
router.get('/:id', requireAdmin, getDoctorById);
router.put('/:id', requireAdmin, updateDoctor);
router.delete('/:id', requireAdmin, deleteDoctor);
router.patch('/:id/deactivate', requireAdmin, deactivateDoctor);
router.patch('/:id/activate', requireAdmin, activateDoctor);

// ─── Availability ──────────────────────────────────
router.put('/:id/availability', requireAdmin, setAvailability);
router.get('/:id/availability', authenticate, getAvailability);

export default router;

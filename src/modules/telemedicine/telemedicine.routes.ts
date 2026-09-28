import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getConsultations,
  getConsultationById,
  updateConsultationStatus,
  getMyConsultations,
  createConsultation,
  cancelMyConsultation,
} from './telemedicine.controller';

const router = Router();

// ─── Patient Routes ────────────────────────────────
router.get('/my', requirePatient, getMyConsultations);
router.post('/', requirePatient, createConsultation);
router.patch('/my/:id/cancel', requirePatient, cancelMyConsultation);

// ─── Admin Routes ──────────────────────────────────
router.get('/', requireAdmin, getConsultations);
router.get('/:id', requireAdmin, getConsultationById);
router.patch('/:id/status', requireAdmin, updateConsultationStatus);

export default router;

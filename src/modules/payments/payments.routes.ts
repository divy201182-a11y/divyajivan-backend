import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  refundPayment,
  getMyPayments,
} from './payments.controller';

const router = Router();

// ─── Patient Routes ────────────────────────────────
router.get('/my', requirePatient, getMyPayments);

// ─── Admin Routes ──────────────────────────────────
router.get('/', requireAdmin, getPayments);
router.get('/:id', requireAdmin, getPaymentById);
router.patch('/:id/status', requireAdmin, updatePaymentStatus);
router.post('/:id/refund', requireAdmin, refundPayment);

export default router;

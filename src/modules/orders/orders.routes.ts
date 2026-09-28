import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getOrders,
  getOrderById,
  createOrder,
  adminCreateOrder,
  updateOrderStatus,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
} from './orders.controller';

const router = Router();

// ─── Patient Self-Service Routes (before /:id to avoid conflict) ──
router.get('/my', requirePatient, getMyOrders);
router.get('/my/:id', requirePatient, getMyOrderById);
router.post('/', requirePatient, createOrder);
router.patch('/my/:id/cancel', requirePatient, cancelMyOrder);

// ─── Admin Routes ──────────────────────────────────
router.get('/', requireAdmin, getOrders);
router.post('/admin', requireAdmin, adminCreateOrder);
router.get('/:id', requireAdmin, getOrderById);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

export default router;

import { Router } from 'express';
import { authenticate, requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getNotifications,
  createNotification,
  getMyNotifications,
  markAsRead,
} from './notifications.controller';

const router = Router();

// ─── Patient Routes ────────────────────────────────
router.get('/my', requirePatient, getMyNotifications);

// ─── Admin Routes ──────────────────────────────────
router.get('/', requireAdmin, getNotifications);
router.post('/', requireAdmin, createNotification);

// ─── Authenticated (both admin and patient) ────────
router.patch('/:id/read', authenticate, markAsRead);

export default router;

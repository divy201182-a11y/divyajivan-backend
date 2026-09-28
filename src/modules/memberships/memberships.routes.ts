import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getPlans,
  createPlan,
  updatePlan,
  getMyMembership,
  purchaseMembership,
  getMemberships,
  getMembershipById,
  updateMembershipStatus,
} from './memberships.controller';

const router = Router();

// ─── Plans (Admin) ─────────────────────────────────
router.get('/plans', requireAdmin, getPlans);
router.post('/plans', requireAdmin, createPlan);
router.put('/plans/:id', requireAdmin, updatePlan);

// ─── Patient ───────────────────────────────────────
router.get('/my', requirePatient, getMyMembership);
router.post('/purchase', requirePatient, purchaseMembership);

// ─── Members (Admin) ───────────────────────────────
router.get('/', requireAdmin, getMemberships);
router.get('/:id', requireAdmin, getMembershipById);
router.patch('/:id/status', requireAdmin, updateMembershipStatus);

export default router;

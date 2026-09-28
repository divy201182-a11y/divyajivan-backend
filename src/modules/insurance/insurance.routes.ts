import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
  getMyInsurance,
  applyForInsurance,
  getApplications,
  getApplicationById,
  reviewApplication,
} from './insurance.controller';

const router = Router();

// ─── Plans (Admin) ─────────────────────────────────
router.get('/plans', requireAdmin, getPlans);
router.post('/plans', requireAdmin, createPlan);
router.put('/plans/:id', requireAdmin, updatePlan);
router.patch('/plans/:id/deactivate', requireAdmin, deactivatePlan);

// ─── Patient ───────────────────────────────────────
router.get('/my', requirePatient, getMyInsurance);
router.post('/apply', requirePatient, applyForInsurance);

// ─── Applications (Admin) ──────────────────────────
router.get('/applications', requireAdmin, getApplications);
router.get('/applications/:id', requireAdmin, getApplicationById);
router.patch('/applications/:id/review', requireAdmin, reviewApplication);

export default router;

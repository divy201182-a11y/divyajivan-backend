import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getPointsRules,
  createPointsRule,
  updatePointsRule,
  getPointsTransactions,
  awardPoints,
  getMyPoints,
} from './points.controller';

const router = Router();

// ─── Admin Routes ──────────────────────────────────
router.get('/rules', requireAdmin, getPointsRules);
router.post('/rules', requireAdmin, createPointsRule);
router.put('/rules/:id', requireAdmin, updatePointsRule);
router.get('/transactions', requireAdmin, getPointsTransactions);
router.post('/award', requireAdmin, awardPoints);

// ─── Patient Routes ────────────────────────────────
router.get('/my', requirePatient, getMyPoints);

export default router;

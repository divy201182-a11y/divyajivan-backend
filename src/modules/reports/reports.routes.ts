import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import {
  getDashboardStats,
  getPatientGrowth,
  getOrdersReport,
  getRevenueReport,
} from './reports.controller';

const router = Router();

router.get('/dashboard', requireAdmin, getDashboardStats);
router.get('/patient-growth', requireAdmin, getPatientGrowth);
router.get('/orders', requireAdmin, getOrdersReport);
router.get('/revenue', requireAdmin, getRevenueReport);

export default router;

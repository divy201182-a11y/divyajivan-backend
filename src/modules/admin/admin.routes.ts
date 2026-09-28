import { Router } from 'express';
import { requireAdmin, requireRole } from '../../middleware/auth';
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getActivityLogs,
  getMyProfile,
  updateMyProfile,
  changePassword,
} from './admin.controller';
import {
  getDatabaseOverview,
  getDatabaseTable,
  deleteDatabaseRecord,
} from './database.controller';

const router = Router();

// ─── Profile & Self-Service (before :id routes) ────
router.get('/profile', requireAdmin, getMyProfile);
router.put('/profile', requireAdmin, updateMyProfile);
router.patch('/change-password', requireAdmin, changePassword);

// ─── Activity Logs ─────────────────────────────────
router.get('/activity-logs', requireAdmin, getActivityLogs);

// ─── Database Management (Super Admin only) ────────
router.get('/database/overview', requireAdmin, requireRole('SUPER_ADMIN'), getDatabaseOverview);
router.get('/database/:table', requireAdmin, requireRole('SUPER_ADMIN'), getDatabaseTable);
router.delete('/database/:table/:id', requireAdmin, requireRole('SUPER_ADMIN'), deleteDatabaseRecord);

// ─── User Management (Super Admin only) ────────────
router.get('/users', requireAdmin, requireRole('SUPER_ADMIN'), getAdmins);
router.post('/users', requireAdmin, requireRole('SUPER_ADMIN'), createAdmin);
router.put('/users/:id', requireAdmin, requireRole('SUPER_ADMIN'), updateAdmin);
router.delete('/users/:id', requireAdmin, requireRole('SUPER_ADMIN'), deleteAdmin);

export default router;

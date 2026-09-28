import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  updateStock,
  deactivateMedicine,
  getCategories,
  createCategory,
} from './medicines.controller';

const router = Router();

// ─── Category Routes (before /:id to avoid conflict) ──
router.get('/categories', authenticate, getCategories);
router.post('/categories', requireAdmin, createCategory);

// ─── Medicine Routes ───────────────────────────────
router.get('/', authenticate, getMedicines);
router.post('/', requireAdmin, createMedicine);
router.get('/:id', authenticate, getMedicineById);
router.put('/:id', requireAdmin, updateMedicine);
router.patch('/:id/stock', requireAdmin, updateStock);
router.patch('/:id/deactivate', requireAdmin, deactivateMedicine);

export default router;

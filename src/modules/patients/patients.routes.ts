import { Router } from 'express';
import { requireAdmin, requirePatient } from '../../middleware/auth';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deactivatePatient,
  activatePatient,
  getMyProfile,
  updateMyProfile,
  getMyFamilyMembers,
  addFamilyMember,
  deleteFamilyMember,
} from './patients.controller';

const router = Router();

// ─── Patient Self-Service Routes ───────────────────
// IMPORTANT: These must come BEFORE /:id routes so
// Express doesn't treat "me" as an id parameter.
router.get('/me', requirePatient, getMyProfile);
router.put('/me', requirePatient, updateMyProfile);
router.get('/me/family', requirePatient, getMyFamilyMembers);
router.post('/me/family', requirePatient, addFamilyMember);
router.delete('/me/family/:id', requirePatient, deleteFamilyMember);

// ─── Admin Routes ──────────────────────────────────
router.post('/', requireAdmin, createPatient);
router.get('/', requireAdmin, getPatients);
router.get('/:id', requireAdmin, getPatientById);
router.put('/:id', requireAdmin, updatePatient);
router.patch('/:id/deactivate', requireAdmin, deactivatePatient);
router.patch('/:id/activate', requireAdmin, activatePatient);

export default router;

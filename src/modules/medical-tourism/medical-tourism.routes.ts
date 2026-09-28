import { Router } from 'express';
import { authenticate, requireAdmin, requirePatient } from '../../middleware/auth';
import {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  getTreatments,
  createTreatment,
  getPackages,
  createPackage,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  getMyEnquiries,
  createEnquiry,
} from './medical-tourism.controller';

const router = Router();

// ─── Public / Authenticated Routes ─────────────────
router.get('/hospitals', authenticate, getHospitals);
router.get('/hospitals/:id', authenticate, getHospitalById);
router.get('/treatments', authenticate, getTreatments);
router.get('/packages', authenticate, getPackages);

// ─── Admin: Hospitals ──────────────────────────────
router.post('/hospitals', requireAdmin, createHospital);
router.put('/hospitals/:id', requireAdmin, updateHospital);

// ─── Admin: Treatments & Packages ──────────────────
router.post('/treatments', requireAdmin, createTreatment);
router.post('/packages', requireAdmin, createPackage);

// ─── Patient: Enquiries ────────────────────────────
router.get('/my/enquiries', requirePatient, getMyEnquiries);
router.post('/enquiries', requirePatient, createEnquiry);

// ─── Admin: Enquiries ──────────────────────────────
router.get('/enquiries', requireAdmin, getEnquiries);
router.get('/enquiries/:id', requireAdmin, getEnquiryById);
router.patch('/enquiries/:id/status', requireAdmin, updateEnquiryStatus);

export default router;

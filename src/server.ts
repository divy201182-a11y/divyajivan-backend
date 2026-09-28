import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import logger from './utils/logger';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import patientRoutes from './modules/patients/patients.routes';
import doctorRoutes from './modules/doctors/doctors.routes';
import appointmentRoutes from './modules/appointments/appointments.routes';
import medicineRoutes from './modules/medicines/medicines.routes';
import orderRoutes from './modules/orders/orders.routes';
import labTestRoutes from './modules/lab-tests/lab-tests.routes';
import insuranceRoutes from './modules/insurance/insurance.routes';
import membershipRoutes from './modules/memberships/memberships.routes';
import telemedicineRoutes from './modules/telemedicine/telemedicine.routes';
import medicalTourismRoutes from './modules/medical-tourism/medical-tourism.routes';
import paymentRoutes from './modules/payments/payments.routes';
import pointsRoutes from './modules/points/points.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import reportRoutes from './modules/reports/reports.routes';
import adminRoutes from './modules/admin/admin.routes';
import uploadRoutes from './modules/uploads/uploads.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// Serve uploaded files (with auth in production, open for dev)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/telemedicine', telemedicineRoutes);
app.use('/api/medical-tourism', medicalTourismRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Divyajivan Backend running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  logger.info(`API: http://localhost:${PORT}/api`);
  logger.info(`Health: http://localhost:${PORT}/api/health`);
});

export default app;

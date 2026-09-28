import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';

// ─── Dashboard Stats ───────────────────────────────

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalPatients,
    totalDoctors,
    totalAppointments,
    totalOrders,
    recentOrders,
    upcomingAppointments,
    recentActivity,
    confirmedOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.appointment.count(),
    prisma.order.count(),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        patient: { select: { id: true, name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        date: { gte: new Date() },
        status: { in: ['REQUESTED', 'CONFIRMED'] },
      },
      orderBy: { date: 'asc' },
      take: 5,
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    }).catch(async () => {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT a.id, a.appointmentNo, a.status, a.consultationType, a.reason,
                CAST(a.date AS TEXT) as date, CAST(a.time AS TEXT) as time,
                a.createdAt, a.patientId, a.doctorId
         FROM appointments a
         WHERE a.status IN ('REQUESTED','CONFIRMED')
         ORDER BY a.date ASC LIMIT 5`
      );
      return Promise.all(rows.map(async (a: any) => {
        const pat: any[] = await prisma.$queryRawUnsafe('SELECT id, name FROM patients WHERE id = ?', a.patientId);
        const doc: any[] = await prisma.$queryRawUnsafe('SELECT id, name, specialization FROM doctors WHERE id = ?', a.doctorId);
        return { ...a, patient: pat[0] ?? null, doctor: doc[0] ?? null };
      }));
    }),
    prisma.adminActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        adminName: true,
        action: true,
        module: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where: { status: 'CONFIRMED' } }),
    prisma.order.count({ where: { status: 'PROCESSING' } }),
    prisma.order.count({ where: { status: 'SHIPPED' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
  ]);

  return sendSuccess(res, {
    totalPatients,
    totalDoctors,
    totalAppointments,
    totalOrders,
    recentOrders,
    upcomingAppointments,
    recentActivity,
    ordersByStatus: {
      confirmed: confirmedOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
  });
});

// ─── Patient Growth Report ─────────────────────────

export const getPatientGrowth = asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  if (!startDate || !endDate) {
    return sendError(res, 'startDate and endDate are required', 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get all patients created within range, grouped by month
  const patients = await prisma.patient.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by month manually
  const monthlyGrowth: Record<string, number> = {};
  for (const patient of patients) {
    const monthKey = `${patient.createdAt.getFullYear()}-${String(patient.createdAt.getMonth() + 1).padStart(2, '0')}`;
    monthlyGrowth[monthKey] = (monthlyGrowth[monthKey] || 0) + 1;
  }

  const growth = Object.entries(monthlyGrowth).map(([month, count]) => ({
    month,
    count,
  }));

  return sendSuccess(res, growth);
});

// ─── Orders Report ─────────────────────────────────

export const getOrdersReport = asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  if (!startDate || !endDate) {
    return sendError(res, 'startDate and endDate are required', 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const dateFilter = { createdAt: { gte: start, lte: end } };

  const [ordersByStatus, totalRevenue] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        ...dateFilter,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      _sum: { total: true },
    }),
  ]);

  return sendSuccess(res, {
    ordersByStatus: ordersByStatus.map((group) => ({
      status: group.status,
      count: group._count.id,
      total: group._sum.total,
    })),
    totalRevenue: totalRevenue._sum.total || 0,
  });
});

// ─── Revenue Report ────────────────────────────────

export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  if (!startDate || !endDate) {
    return sendError(res, 'startDate and endDate are required', 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const revenueByType = await prisma.payment.groupBy({
    by: ['type'],
    where: {
      status: 'SUCCESSFUL',
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalRevenue = revenueByType.reduce(
    (sum, group) => sum + Number(group._sum.amount || 0),
    0
  );

  return sendSuccess(res, {
    revenueByType: revenueByType.map((group) => ({
      type: group.type,
      count: group._count.id,
      revenue: group._sum.amount,
    })),
    totalRevenue,
  });
});

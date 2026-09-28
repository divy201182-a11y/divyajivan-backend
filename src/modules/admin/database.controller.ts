import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';

export const getDatabaseOverview = async (_req: Request, res: Response) => {
  const [
    patients,
    doctors,
    medicines,
    orders,
    appointments,
    labTests,
    payments,
    memberships,
    membershipPlans,
    categories,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.medicine.count(),
    prisma.order.count(),
    prisma.appointment.count(),
    prisma.labTest.count(),
    prisma.payment.count(),
    prisma.membership.count(),
    prisma.membershipPlan.count(),
    prisma.medicineCategory.count(),
  ]);

  sendSuccess(res, {
    overview: {
      patients,
      doctors,
      medicines,
      orders,
      appointments,
      labTests,
      payments,
      memberships,
      membershipPlans,
      categories,
    },
  });
};

export const getDatabaseTable = async (req: Request, res: Response) => {
  const { table } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const skip = (page - 1) * limit;

  const tableMap: Record<string, () => Promise<{ rows: unknown[]; total: number }>> = {
    patients: async () => {
      const [rows, total] = await Promise.all([
        prisma.patient.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.patient.count(),
      ]);
      return { rows, total };
    },
    doctors: async () => {
      const [rows, total] = await Promise.all([
        prisma.doctor.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.doctor.count(),
      ]);
      return { rows, total };
    },
    medicines: async () => {
      const [rows, total] = await Promise.all([
        prisma.medicine.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { category: true } }),
        prisma.medicine.count(),
      ]);
      return { rows, total };
    },
    orders: async () => {
      const [rows, total] = await Promise.all([
        prisma.order.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true, phone: true } }, items: { include: { medicine: { select: { name: true } } } } } }),
        prisma.order.count(),
      ]);
      return { rows, total };
    },
    appointments: async () => {
      const [rows, total] = await Promise.all([
        prisma.appointment.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true } }, doctor: { select: { name: true } } } }),
        prisma.appointment.count(),
      ]);
      return { rows, total };
    },
    payments: async () => {
      const [rows, total] = await Promise.all([
        prisma.payment.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true } } } }),
        prisma.payment.count(),
      ]);
      return { rows, total };
    },
    memberships: async () => {
      const [rows, total] = await Promise.all([
        prisma.membership.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { patient: { select: { name: true } }, plan: { select: { name: true } } } }),
        prisma.membership.count(),
      ]);
      return { rows, total };
    },
    membership_plans: async () => {
      const [rows, total] = await Promise.all([
        prisma.membershipPlan.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.membershipPlan.count(),
      ]);
      return { rows, total };
    },
    categories: async () => {
      const [rows, total] = await Promise.all([
        prisma.medicineCategory.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.medicineCategory.count(),
      ]);
      return { rows, total };
    },
  };

  const fetcher = tableMap[table];
  if (!fetcher) {
    return res.status(400).json({ success: false, message: `Unknown table: ${table}` });
  }

  const { rows, total } = await fetcher();
  sendSuccess(res, {
    table,
    rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

export const deleteDatabaseRecord = async (req: Request, res: Response) => {
  const { table, id } = req.params;

  const deleteMap: Record<string, () => Promise<unknown>> = {
    patients: () => prisma.patient.delete({ where: { id } }),
    doctors: () => prisma.doctor.delete({ where: { id } }),
    medicines: () => prisma.medicine.delete({ where: { id } }),
    categories: () => prisma.medicineCategory.delete({ where: { id } }),
    membership_plans: () => prisma.membershipPlan.delete({ where: { id } }),
  };

  const deleter = deleteMap[table];
  if (!deleter) {
    return res.status(400).json({ success: false, message: `Cannot delete from table: ${table}` });
  }

  await deleter();
  sendSuccess(res, null, `Record deleted from ${table}`);
};

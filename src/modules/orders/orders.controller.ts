import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { asyncHandler } from '../../middleware/error';
import { logActivity } from '../../middleware/activityLog';
import { generateOrderNo, generateTransactionNo } from '../../utils/generate';
import {
  createOrderSchema,
  adminCreateOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from './orders.validation';

// ─── Valid status transitions ──────────────────────

const STATUS_ORDER = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

function isValidTransition(current: string, next: string): boolean {
  // Can always cancel (except after delivery)
  if (next === 'CANCELLED') {
    return current !== 'DELIVERED' && current !== 'CANCELLED';
  }
  // Cannot go backwards
  const currentIndex = STATUS_ORDER.indexOf(current as typeof STATUS_ORDER[number]);
  const nextIndex = STATUS_ORDER.indexOf(next as typeof STATUS_ORDER[number]);
  if (currentIndex === -1 || nextIndex === -1) return false;
  return nextIndex > currentIndex;
}

// ─── Admin: Get Orders ─────────────────────────────

/**
 * GET /orders
 * Admin: list all orders with pagination, search, status filter, and date range.
 */
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const status = req.query.status as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: 'insensitive' } },
      { patient: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    }
    if (dateTo) {
      (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        _count: { select: { items: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return sendPaginated(res, orders, total, page, limit);
});

// ─── Admin: Get Order By ID ────────────────────────

/**
 * GET /orders/:id
 * Admin: get a single order with full details.
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, name: true, phone: true, email: true, address: true },
      },
      items: {
        include: {
          medicine: {
            select: { id: true, name: true, brand: true, image: true },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      payment: true,
    },
  });

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  return sendSuccess(res, order, 'Order fetched');
});

// ─── Patient: Create Order ─────────────────────────

/**
 * POST /orders
 * Patient: create a new order.
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { items, deliveryAddress, pointsToUse } = parsed.data;
  const patientId = req.user!.userId;

  // Look up all medicines
  const medicineIds = items.map((item) => item.medicineId);
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: medicineIds } },
  });

  // Validate all medicines exist and are active
  for (const item of items) {
    const medicine = medicines.find((m) => m.id === item.medicineId);
    if (!medicine) {
      return sendError(res, `Medicine not found: ${item.medicineId}`, 404);
    }
    if (medicine.status !== 'ACTIVE') {
      return sendError(res, `Medicine "${medicine.name}" is not available`, 400);
    }
    if (medicine.stock < item.quantity) {
      return sendError(
        res,
        `Insufficient stock for "${medicine.name}". Available: ${medicine.stock}`,
        400
      );
    }
  }

  // Calculate totals
  let subtotal = new Decimal(0);
  const orderItems: Array<{
    medicineId: string;
    quantity: number;
    price: Decimal;
    total: Decimal;
  }> = [];

  for (const item of items) {
    const medicine = medicines.find((m) => m.id === item.medicineId)!;
    const itemPrice = medicine.price;
    const discountAmount = medicine.price.mul(medicine.discountPercent).div(100);
    const discountedPrice = itemPrice.sub(discountAmount);
    const itemTotal = discountedPrice.mul(item.quantity);

    orderItems.push({
      medicineId: item.medicineId,
      quantity: item.quantity,
      price: discountedPrice,
      total: itemTotal,
    });

    subtotal = subtotal.add(itemTotal);
  }

  // Calculate discount from medicine-level discounts (already applied above)
  const grossTotal = items.reduce((acc, item) => {
    const medicine = medicines.find((m) => m.id === item.medicineId)!;
    return acc.add(medicine.price.mul(item.quantity));
  }, new Decimal(0));
  const discount = grossTotal.sub(subtotal);

  // Points discount (1 point = 1 rupee)
  let pointsUsed = 0;
  let pointsDiscount = new Decimal(0);

  if (pointsToUse && pointsToUse > 0) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { pointsBalance: true },
    });

    if (!patient) {
      return sendError(res, 'Patient not found', 404);
    }

    const availablePoints = patient.pointsBalance;
    pointsUsed = Math.min(pointsToUse, availablePoints);
    // Points discount cannot exceed the subtotal
    const maxPointsDiscount = subtotal;
    pointsDiscount = Decimal.min(new Decimal(pointsUsed), maxPointsDiscount);
    pointsUsed = pointsDiscount.toNumber();
  }

  // Delivery fee: free over 500
  const afterPointsTotal = subtotal.sub(pointsDiscount);
  const deliveryFee = afterPointsTotal.greaterThan(500) ? new Decimal(0) : new Decimal(50);

  // Final total
  const total = afterPointsTotal.add(deliveryFee);

  // Generate order number
  const orderNo = generateOrderNo();

  // Create order in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        orderNo,
        patientId,
        subtotal,
        discount,
        pointsUsed,
        pointsDiscount,
        deliveryFee,
        total,
        status: 'CONFIRMED',
        deliveryAddress,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            medicine: { select: { id: true, name: true, brand: true } },
          },
        },
      },
    });

    // Reduce stock for each medicine
    for (const item of items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Create payment record (PENDING)
    await tx.payment.create({
      data: {
        transactionNo: generateTransactionNo(),
        patientId,
        type: 'MEDICINE',
        amount: total,
        status: 'PENDING',
        orderId: newOrder.id,
      },
    });

    // Create initial status history entry
    await tx.orderStatusHistory.create({
      data: {
        orderId: newOrder.id,
        status: 'CONFIRMED',
        changedBy: 'Patient',
        note: 'Order placed',
      },
    });

    // Deduct points if used
    if (pointsUsed > 0) {
      await tx.patient.update({
        where: { id: patientId },
        data: { pointsBalance: { decrement: pointsUsed } },
      });

      await tx.pointsTransaction.create({
        data: {
          patientId,
          points: -pointsUsed,
          type: 'REDEEMED',
          reference: newOrder.id,
          description: `Points redeemed for order ${orderNo}`,
        },
      });
    }

    return newOrder;
  });

  return sendSuccess(res, order, 'Order created', 201);
});

// ─── Admin: Create Order on behalf of patient ─────

export const adminCreateOrder = asyncHandler(async (req: Request, res: Response) => {
  const parsed = adminCreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { patientId, items, deliveryAddress } = parsed.data;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return sendError(res, 'Patient not found', 404);
  }

  const medicineIds = items.map((item) => item.medicineId);
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: medicineIds } },
  });

  for (const item of items) {
    const medicine = medicines.find((m) => m.id === item.medicineId);
    if (!medicine) {
      return sendError(res, `Medicine not found: ${item.medicineId}`, 404);
    }
    if (medicine.status !== 'ACTIVE') {
      return sendError(res, `Medicine "${medicine.name}" is not available`, 400);
    }
    if (medicine.stock < item.quantity) {
      return sendError(res, `Insufficient stock for "${medicine.name}". Available: ${medicine.stock}`, 400);
    }
  }

  let subtotal = new Decimal(0);
  const orderItems: Array<{ medicineId: string; quantity: number; price: Decimal; total: Decimal }> = [];

  for (const item of items) {
    const medicine = medicines.find((m) => m.id === item.medicineId)!;
    const discountAmount = medicine.price.mul(medicine.discountPercent).div(100);
    const discountedPrice = medicine.price.sub(discountAmount);
    const itemTotal = discountedPrice.mul(item.quantity);
    orderItems.push({ medicineId: item.medicineId, quantity: item.quantity, price: discountedPrice, total: itemTotal });
    subtotal = subtotal.add(itemTotal);
  }

  const grossTotal = items.reduce((acc, item) => {
    const medicine = medicines.find((m) => m.id === item.medicineId)!;
    return acc.add(medicine.price.mul(item.quantity));
  }, new Decimal(0));
  const discount = grossTotal.sub(subtotal);

  const deliveryFee = subtotal.greaterThan(500) ? new Decimal(0) : new Decimal(50);
  const total = subtotal.add(deliveryFee);
  const orderNo = generateOrderNo();

  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });
  const adminName = admin?.name || 'Admin';

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNo,
        patientId,
        subtotal,
        discount,
        pointsUsed: 0,
        pointsDiscount: 0,
        deliveryFee,
        total,
        status: 'CONFIRMED',
        deliveryAddress,
        items: { create: orderItems },
      },
      include: {
        patient: { select: { id: true, name: true } },
        items: { include: { medicine: { select: { id: true, name: true, brand: true } } } },
      },
    });

    for (const item of items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.payment.create({
      data: {
        transactionNo: generateTransactionNo(),
        patientId,
        type: 'MEDICINE',
        amount: total,
        status: 'PENDING',
        orderId: newOrder.id,
      },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: newOrder.id, status: 'CONFIRMED', changedBy: adminName, note: 'Order created by admin' },
    });

    return newOrder;
  });

  await logActivity(req.user!.userId, adminName, 'CREATE', 'orders', order.id, null, null, req.ip);

  return sendSuccess(res, { order }, 'Order created', 201);
});

// ─── Admin: Update Order Status ────────────────────

/**
 * PATCH /orders/:id/status
 * Admin: update order status with validation of transitions.
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = updateOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const { status, deliveryPartner, trackingNumber, expectedDelivery, cancelReason } = parsed.data;

  // Get current order
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Validate status transition
  if (!isValidTransition(order.status, status)) {
    return sendError(
      res,
      `Cannot transition from ${order.status} to ${status}`,
      400,
      'INVALID_TRANSITION'
    );
  }

  // Shipping details are optional — admin can add them later from order detail

  // If CANCELLED, require cancelReason
  if (status === 'CANCELLED' && !cancelReason) {
    return sendError(res, 'Cancel reason is required', 400);
  }

  // Build update data
  const updateData: Record<string, unknown> = { status };

  if (deliveryPartner) updateData.deliveryPartner = deliveryPartner;
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (expectedDelivery) updateData.expectedDelivery = new Date(expectedDelivery);
  if (cancelReason) updateData.cancelReason = cancelReason;

  // Get admin info
  const admin = await prisma.admin.findUnique({
    where: { id: req.user!.userId },
    select: { name: true },
  });

  const adminName = admin?.name || 'Unknown';

  // Update order and create status history
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        status,
        changedBy: adminName,
        note: status === 'CANCELLED' ? cancelReason : undefined,
      },
    });

    // If cancelled, restore stock
    if (status === 'CANCELLED') {
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: id },
      });
      for (const item of orderItems) {
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return updated;
  });

  // Log admin activity
  await logActivity(
    req.user!.userId,
    adminName,
    'UPDATE_STATUS',
    'orders',
    id,
    JSON.stringify({ status: order.status }),
    JSON.stringify({ status }),
    req.ip
  );

  return sendSuccess(res, updatedOrder, `Order status updated to ${status}`);
});

// ─── Patient: Get My Orders ────────────────────────

/**
 * GET /orders/my
 * Patient: list own orders with pagination.
 */
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const where = { patientId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        payment: { select: { status: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return sendPaginated(res, orders, total, page, limit);
});

// ─── Patient: Get My Order By ID ───────────────────

/**
 * GET /orders/my/:id
 * Patient: get a single own order with details.
 */
export const getMyOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const patientId = req.user!.userId;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          medicine: {
            select: { id: true, name: true, brand: true, image: true },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      payment: { select: { status: true, transactionNo: true } },
    },
  });

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Ensure patient can only see their own order
  if (order.patientId !== patientId) {
    return sendError(res, 'Access denied', 403);
  }

  return sendSuccess(res, order, 'Order fetched');
});

// ─── Patient: Cancel My Order ──────────────────────

/**
 * PATCH /orders/my/:id/cancel
 * Patient: cancel own order (only if status is CONFIRMED).
 */
export const cancelMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const patientId = req.user!.userId;

  const parsed = cancelOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Ensure patient can only cancel their own order
  if (order.patientId !== patientId) {
    return sendError(res, 'Access denied', 403);
  }

  // Can only cancel if status is CONFIRMED
  if (order.status !== 'CONFIRMED') {
    return sendError(
      res,
      `Cannot cancel order with status ${order.status}. Only CONFIRMED orders can be cancelled.`,
      400
    );
  }

  const reason = parsed.data.reason || 'Cancelled by patient';

  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update order status
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
      },
    });

    // Restore stock
    for (const item of order.items) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Create status history entry
    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        status: 'CANCELLED',
        changedBy: 'Patient',
        note: reason,
      },
    });

    // Restore points if any were used
    if (order.pointsUsed > 0) {
      await tx.patient.update({
        where: { id: patientId },
        data: { pointsBalance: { increment: order.pointsUsed } },
      });

      await tx.pointsTransaction.create({
        data: {
          patientId,
          points: order.pointsUsed,
          type: 'REFUNDED',
          reference: order.id,
          description: `Points refunded for cancelled order ${order.orderNo}`,
        },
      });
    }

    return updated;
  });

  return sendSuccess(res, updatedOrder, 'Order cancelled');
});

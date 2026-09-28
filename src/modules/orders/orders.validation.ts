import { z } from 'zod';

// ─── Create Order ──────────────────────────────────
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        medicineId: z
          .string({ required_error: 'Medicine ID is required' })
          .uuid('Invalid medicine ID'),
        quantity: z
          .number({ required_error: 'Quantity is required' })
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1'),
      }),
      { required_error: 'Order items are required' }
    )
    .min(1, 'At least one item is required'),
  deliveryAddress: z
    .string({ required_error: 'Delivery address is required' })
    .min(5, 'Delivery address must be at least 5 characters'),
  pointsToUse: z
    .number()
    .int('Points must be a whole number')
    .min(0, 'Points cannot be negative')
    .optional(),
});

// ─── Update Order Status ───────────────────────────
export const updateOrderStatusSchema = z.object({
  status: z.enum(
    ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    { required_error: 'Status is required' }
  ),
  deliveryPartner: z.string().optional(),
  trackingNumber: z.string().optional(),
  expectedDelivery: z.string().optional(),
  cancelReason: z.string().optional(),
});

// ─── Cancel Order ──────────────────────────────────
export const cancelOrderSchema = z.object({
  reason: z.string().optional(),
});

// ─── Admin Create Order ───────────────────────────
export const adminCreateOrderSchema = z.object({
  patientId: z
    .string({ required_error: 'Patient ID is required' })
    .uuid('Invalid patient ID'),
  items: z
    .array(
      z.object({
        medicineId: z
          .string({ required_error: 'Medicine ID is required' })
          .uuid('Invalid medicine ID'),
        quantity: z
          .number({ required_error: 'Quantity is required' })
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1'),
      }),
      { required_error: 'Order items are required' }
    )
    .min(1, 'At least one item is required'),
  deliveryAddress: z
    .string({ required_error: 'Delivery address is required' })
    .min(5, 'Delivery address must be at least 5 characters'),
});

// ─── Inferred Types ────────────────────────────────
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AdminCreateOrderInput = z.infer<typeof adminCreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Log an admin activity to the AdminActivityLog table.
 *
 * Call this from any admin route handler after a successful action
 * (create, update, delete, etc.) to keep an audit trail.
 *
 * @param adminId    - ID of the admin who performed the action
 * @param adminName  - Display name of the admin (for quick reference)
 * @param action     - What was done, e.g. "CREATE", "UPDATE", "DELETE"
 * @param module     - Which part of the system, e.g. "patients", "appointments"
 * @param recordId   - (optional) ID of the affected record
 * @param oldValue   - (optional) Previous value (JSON string or plain text)
 * @param newValue   - (optional) New value after the change
 * @param ipAddress  - (optional) IP address of the request
 */
export async function logActivity(
  adminId: string,
  adminName: string,
  action: string,
  module: string,
  recordId?: string,
  oldValue?: string,
  newValue?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        adminName,
        action,
        module,
        recordId,
        oldValue,
        newValue,
        ipAddress,
      },
    });
  } catch (error) {
    // Log the failure but don't throw — activity logging should never
    // break the main request flow.
    logger.error('Failed to log admin activity', {
      adminId,
      action,
      module,
      error,
    });
  }
}

import AuditLog from '../models/AuditLog.js';

/**
 * Log a user action
 * @param {Object} data Log details
 * @param {string} data.userId User ObjectId (optional if not logged in yet)
 * @param {string} data.username Username
 * @param {string} data.role User role
 * @param {string} data.action Action name (e.g. 'LOGIN', 'DOWNLOAD_ZIP')
 * @param {string} data.ipAddress IP address
 * @param {string} data.userAgent System info (browser/OS string)
 * @param {Object} data.details Additional JSON details
 */
export async function logAction({ userId, username, role, action, ipAddress, userAgent, details }) {
  try {
    const log = new AuditLog({
      user: userId || null,
      username,
      role: role || 'Unknown',
      action,
      ipAddress,
      systemInfo: userAgent,
      details: details || {}
    });
    await log.save();
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
}

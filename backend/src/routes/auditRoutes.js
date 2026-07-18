import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { rbac } from '../middlewares/rbac.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();

// Get all audit logs
router.get(
  '/',
  authenticateToken,
  rbac(['Super Admin']),
  async (req, res, next) => {
    try {
      const logs = await AuditLog.find({}).sort({ createdAt: -1 });
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

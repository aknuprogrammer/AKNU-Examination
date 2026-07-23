import { Router } from 'express';
import authRoutes from './authRoutes.js';
import collegeRoutes from './collegeRoutes.js';
import auditRoutes from './auditRoutes.js';
import paymentRoutes from './paymentRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/colleges', collegeRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/payments', paymentRoutes);

export default apiRouter;

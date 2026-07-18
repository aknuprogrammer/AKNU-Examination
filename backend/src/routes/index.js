import { Router } from 'express';
import authRoutes from './authRoutes.js';
import collegeRoutes from './collegeRoutes.js';
import auditRoutes from './auditRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/colleges', collegeRoutes);
apiRouter.use('/audit-logs', auditRoutes);

export default apiRouter;

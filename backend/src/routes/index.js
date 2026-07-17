import { Router } from 'express';
import authRoutes from './authRoutes.js';
import collegeRoutes from './collegeRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/colleges', collegeRoutes);

export default apiRouter;

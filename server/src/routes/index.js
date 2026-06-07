// server/src/routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import purchasesRoutes from './purchases.routes.js';
import ratesRoutes from './rates.routes.js';
import logsRoutes from './logs.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/rates', ratesRoutes);
router.use('/logs', logsRoutes);

export default router;

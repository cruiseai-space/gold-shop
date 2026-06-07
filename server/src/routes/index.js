// server/src/routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import purchasesRoutes from './purchases.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/purchases', purchasesRoutes);

export default router;

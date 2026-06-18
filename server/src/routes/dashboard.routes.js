import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/stats', controller.getOverallStats);
router.get('/members/:id/stats', controller.getMemberStats);

export default router;

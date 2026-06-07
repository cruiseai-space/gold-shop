// server/src/routes/rates.routes.js
import { Router } from 'express';
import * as ratesController from '../controllers/rates.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', ratesController.list);
router.get('/today', ratesController.getToday);

router.post('/',
  requireRole(['OWNER', 'STAFF']),
  ratesController.create
);

export default router;

// server/src/routes/purchases.routes.js
import { Router } from 'express';
import * as purchasesController from '../controllers/purchases.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', purchasesController.list);
router.get('/:id', purchasesController.getById);

router.post('/', 
  requireRole(['OWNER', 'STAFF']), 
  purchasesController.create
);

router.patch('/:id', 
  requireRole(['OWNER', 'STAFF']), 
  purchasesController.update
);

router.delete('/:id', 
  requireRole(['OWNER']), 
  purchasesController.remove
);

export default router;

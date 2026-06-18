// server/src/routes/users.routes.js
import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// All user management routes are OWNER only
router.use(authenticate, requireRole(['OWNER']));

router.get('/', usersController.list);
router.get('/invites', usersController.listInvites);
router.post('/invite', usersController.invite);
router.patch('/:id/role', usersController.updateRole);
router.patch('/:id/status', usersController.setStatus);

export default router;

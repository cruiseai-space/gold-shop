import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import * as controller from '../controllers/members.controller.js';

const router = Router();

// All routes require auth
router.use(authenticate);

router.get('/', controller.listMembers);
router.get('/:id', controller.getMember);
router.get('/:id/stats', controller.getMemberStats);

// Only STAFF and OWNER can modify
router.post('/', requireRole(['STAFF', 'OWNER']), controller.createMember);
router.patch('/:id', requireRole(['STAFF', 'OWNER']), controller.updateMember);

export default router;

// server/src/routes/logs.routes.js
import { Router } from 'express';
import * as logsController from '../controllers/logs.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', logsController.list);

export default router;

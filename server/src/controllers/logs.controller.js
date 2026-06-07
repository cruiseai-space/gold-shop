// server/src/controllers/logs.controller.js
import * as logsService from '../services/logs.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/logs
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, userId, actionType, dateFrom, dateTo } = req.query;
  const result = await logsService.listLogs({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    userId,
    actionType,
    dateFrom,
    dateTo
  });
  
  res.json({ success: true, ...result });
});

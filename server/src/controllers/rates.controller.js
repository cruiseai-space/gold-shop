// server/src/controllers/rates.controller.js
import * as ratesService from '../services/rates.service.js';
import * as logsService from '../services/logs.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/rates
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, dateFrom, dateTo } = req.query;
  const result = await ratesService.listRates({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 30,
    dateFrom,
    dateTo
  });
  res.json({ success: true, ...result });
});

/**
 * GET /api/rates/today
 */
export const getToday = asyncHandler(async (req, res) => {
  const rate = await ratesService.getLatestRate();
  res.json({ success: true, data: rate });
});

/**
 * POST /api/rates
 */
export const create = asyncHandler(async (req, res) => {
  const rate = await ratesService.createRate(req.body, req.user.id);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'CREATE_RATE',
    entityType: 'rate',
    entityId: rate.id,
    payloadAfter: rate,
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, data: rate });
});

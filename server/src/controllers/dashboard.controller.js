import { asyncHandler } from '../utils/asyncHandler.js';
import * as dashboardService from '../services/dashboard.service.js';

export const getOverallStats = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const data = await dashboardService.getOverallStats({ dateFrom, dateTo });
  res.json({ success: true, data });
});

export const getMemberStats = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const data = await dashboardService.getMemberStats(req.params.id, { dateFrom, dateTo });
  res.json({ success: true, data });
});

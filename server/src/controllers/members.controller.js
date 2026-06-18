import { asyncHandler } from '../utils/asyncHandler.js';
import * as memberService from '../services/members.service.js';

export const listMembers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const result = await memberService.listMembers({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    search,
  });
  
  res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

export const getMember = asyncHandler(async (req, res) => {
  const data = await memberService.getMemberById(req.params.id);
  res.json({ success: true, data });
});

export const createMember = asyncHandler(async (req, res) => {
  const data = await memberService.createMember(req.body);
  res.status(201).json({ success: true, data });
});

export const updateMember = asyncHandler(async (req, res) => {
  const data = await memberService.updateMember(req.params.id, req.body);
  res.json({ success: true, data });
});

export const getMemberStats = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const data = await memberService.getMemberStats(req.params.id, { dateFrom, dateTo });
  res.json({ success: true, data });
});

// server/src/controllers/purchases.controller.js
import * as purchasesService from '../services/purchases.service.js';
import * as logsService from '../services/logs.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/purchases
 */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, dateFrom, dateTo, seller } = req.query;
  const result = await purchasesService.listPurchases({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    dateFrom,
    dateTo,
    seller
  });
  
  res.json({ success: true, ...result });
});

/**
 * GET /api/purchases/:id
 */
export const getById = asyncHandler(async (req, res) => {
  const purchase = await purchasesService.getPurchaseById(req.params.id);
  res.json({ success: true, data: purchase });
});

/**
 * POST /api/purchases
 */
export const create = asyncHandler(async (req, res) => {
  const purchase = await purchasesService.createPurchase(req.body, req.user.id);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'CREATE_PURCHASE',
    entityType: 'purchase',
    entityId: purchase.id,
    payloadAfter: purchase,
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, data: purchase });
});

/**
 * PATCH /api/purchases/:id
 */
export const update = asyncHandler(async (req, res) => {
  // We need the original for logging
  const original = await purchasesService.getPurchaseById(req.params.id);
  const updated = await purchasesService.updatePurchase(req.params.id, req.body, req.user);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'UPDATE_PURCHASE',
    entityType: 'purchase',
    entityId: updated.id,
    payloadBefore: original,
    payloadAfter: updated,
    ipAddress: req.ip
  });

  res.json({ success: true, data: updated });
});

/**
 * DELETE /api/purchases/:id
 */
export const remove = asyncHandler(async (req, res) => {
  const original = await purchasesService.getPurchaseById(req.params.id);
  await purchasesService.deletePurchase(req.params.id);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'DELETE_PURCHASE',
    entityType: 'purchase',
    entityId: req.params.id,
    payloadBefore: original,
    ipAddress: req.ip
  });

  res.json({ success: true, data: { deleted: true } });
});

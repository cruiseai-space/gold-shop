// server/src/controllers/users.controller.js
import * as usersService from '../services/users.service.js';
import * as inviteService from '../services/invite.service.js';
import * as logsService from '../services/logs.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * GET /api/users
 */
export const list = asyncHandler(async (req, res) => {
  const users = await usersService.listUsers();
  res.json({ success: true, data: users });
});

/**
 * POST /api/users/invite
 */
export const invite = asyncHandler(async (req, res) => {
  const canSend = await inviteService.canSendInvite(req.user.id);
  if (!canSend) {
    throw new ApiError(429, 'RATE_LIMITED', 'Maximum 3 invites per hour. Please try again later.');
  }

  const result = await inviteService.createInvite(req.body, req.user.id);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'INVITE_USER',
    entityType: 'user',
    entityId: result.authUser.id,
    payloadAfter: { email: req.body.email, role: req.body.role },
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, data: result });
});

/**
 * GET /api/users/invites
 */
export const listInvites = asyncHandler(async (req, res) => {
  const invites = await inviteService.listInvites();
  res.json({ success: true, data: invites });
});

/**
 * PATCH /api/users/:id/role
 */
export const updateRole = asyncHandler(async (req, res) => {
  const original = await usersService.getProfile(req.params.id);
  const updated = await usersService.updateRole(req.params.id, req.body.role, req.user.id);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'UPDATE_USER_ROLE',
    entityType: 'user',
    entityId: updated.id,
    payloadBefore: { role: original.role },
    payloadAfter: { role: updated.role },
    ipAddress: req.ip
  });

  res.json({ success: true, data: updated });
});

/**
 * PATCH /api/users/:id/status
 */
export const setStatus = asyncHandler(async (req, res) => {
  const original = await usersService.getProfile(req.params.id);
  const updated = await usersService.setStatus(req.params.id, req.body.isActive, req.user.id);
  
  await logsService.log({
    userId: req.user.id,
    actionType: 'DEACTIVATE_USER',
    entityType: 'user',
    entityId: updated.id,
    payloadBefore: { is_active: original.is_active },
    payloadAfter: { is_active: updated.is_active },
    ipAddress: req.ip
  });

  res.json({ success: true, data: updated });
});

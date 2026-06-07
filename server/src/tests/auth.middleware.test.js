// server/src/tests/auth.middleware.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';

describe('authenticate middleware', () => {
  const secret = 'test-secret';
  process.env.JWT_SECRET = secret;

  const makeRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  });

  it('calls next() with valid token', () => {
    const payload = { sub: 'user-123', role: 'OWNER', name: 'Test User' };
    const token = jwt.sign(payload, secret);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = vi.fn();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: payload.sub,
      role: payload.role,
      name: payload.name,
    });
  });

  it('calls next with ApiError 401 when token is missing', () => {
    const req = { headers: {} };
    const next = vi.fn();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].code).toBe('TOKEN_MISSING');
  });

  it('calls next with ApiError 401 when token is malformed', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const next = vi.fn();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].code).toBe('TOKEN_INVALID');
  });

  it('calls next with ApiError 401 when token is expired', () => {
    const payload = { sub: 'user-123', role: 'OWNER', name: 'Test User' };
    const token = jwt.sign(payload, secret, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = vi.fn();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
  });
});

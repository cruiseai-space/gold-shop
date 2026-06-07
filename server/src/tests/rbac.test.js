// server/src/tests/rbac.test.js
import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../middleware/rbac.middleware.js';
import { ApiError } from '../utils/ApiError.js';

const makeReq = (role) => ({ user: { role } });
const makeRes = () => ({ 
  status: vi.fn().mockReturnThis(), 
  json: vi.fn() 
});

describe('requireRole middleware', () => {
  it('calls next() when role is allowed', () => {
    const next = vi.fn();
    requireRole(['OWNER', 'STAFF'])(makeReq('STAFF'), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next with ApiError 403 when role is not allowed', () => {
    const next = vi.fn();
    requireRole(['OWNER'])(makeReq('STAFF'), makeRes(), next);
    
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('INSUFFICIENT_ROLE');
  });

  it('calls next with ApiError 403 when no user attached to request', () => {
    const next = vi.fn();
    requireRole(['OWNER'])({ user: null }, makeRes(), next);
    
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });
});

// server/src/tests/auth.controller.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../controllers/auth.controller.js';
import { supabase } from '../services/supabase.js';
import * as usersService from '../services/users.service.js';
import jwt from 'jsonwebtoken';

vi.mock('../services/supabase.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('../services/users.service.js', () => ({
  getProfile: vi.fn(),
}));

vi.mock('../services/logs.service.js', () => ({
  log: vi.fn().mockResolvedValue(),
}));

describe('auth.controller login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '7d';
  });

  const makeRes = () => ({
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  });

  it('successfully logs in and returns token', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = { id: 'user-123', full_name: 'Test User', role: 'OWNER', is_active: true };

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    usersService.getProfile.mockResolvedValue(mockProfile);

    const req = { body: { email: 'test@example.com', password: 'password123' } };
    const res = makeRes();

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          full_name: 'Test User',
          role: 'OWNER',
        }),
      }),
    }));
  });

  it('throws ApiError on invalid credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    });

    const req = { body: { email: 'wrong@example.com', password: 'wrong' } };
    const next = vi.fn();

    await authController.login(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    }));
  });

  it('throws ApiError if account is inactive', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'inactive-user' } },
      error: null,
    });

    usersService.getProfile.mockResolvedValue({ is_active: false });

    const req = { body: { email: 'inactive@example.com', password: 'password' } };
    const next = vi.fn();

    await authController.login(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      code: 'ACCOUNT_DISABLED',
    }));
  });
});

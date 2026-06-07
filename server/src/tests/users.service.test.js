// server/src/tests/users.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as usersService from '../services/users.service.js';
import { supabase } from '../services/supabase.js';

vi.mock('../services/supabase.js', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(),
        },
      },
    },
  };
});

describe('users.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists users', async () => {
    const mockUsers = [{ id: '1', full_name: 'Owner' }];
    supabase.from().select.mockReturnThis();
    supabase.from().order.mockResolvedValue({ data: mockUsers, error: null });

    const result = await usersService.listUsers();
    expect(result).toEqual(mockUsers);
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('invites a user', async () => {
    supabase.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null
    });

    const result = await usersService.inviteUser({ 
      email: 'new@example.com', 
      fullName: 'New User', 
      role: 'STAFF' 
    }, 'admin-id');

    expect(result.id).toBe('new-user');
    expect(supabase.auth.admin.inviteUserByEmail).toHaveBeenCalled();
  });
});

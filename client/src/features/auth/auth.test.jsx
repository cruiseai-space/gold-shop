// client/src/features/auth/auth.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import React from 'react';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts with null user and isLoading true', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Initial render during useEffect
    expect(result.current.user).toBeNull();
    // After useEffect finishes (which is almost immediate in this mock)
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
  });

  it('restores user from localStorage if token is valid', async () => {
    const mockUser = { id: '1', full_name: 'Test' };
    const mockToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
    
    localStorage.setItem('swarna_token', mockToken);
    localStorage.setItem('swarna_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {});
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('clears localStorage if token is expired', async () => {
    const mockToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }))}.signature`;
    
    localStorage.setItem('swarna_token', mockToken);
    localStorage.setItem('swarna_user', JSON.stringify({ id: '1' }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {});
    
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('swarna_token')).toBeNull();
  });
});

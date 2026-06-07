// client/src/features/auth/AuthProvider.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('swarna_token');
      localStorage.removeItem('swarna_user');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('swarna_token');
      const userData = localStorage.getItem('swarna_user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Simple client-side expiry check
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            setUser(parsedUser);
          } else {
            localStorage.removeItem('swarna_token');
            localStorage.removeItem('swarna_user');
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('swarna_token');
          localStorage.removeItem('swarna_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('swarna_token', token);
    localStorage.setItem('swarna_user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

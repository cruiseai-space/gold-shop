# Auth & RBAC

## Strategy

- **Supabase Auth** handles credential storage, email verification, and invite flow
- **Express server** issues its own **JWT** (signed with `JWT_SECRET`) after verifying Supabase credentials
- All protected routes verify the Express JWT — not Supabase JWT directly
- This keeps the backend independent of Supabase auth internals

---

## Auth Flow

```
1. User POSTs email+password to /api/auth/login
2. Server calls supabase.auth.signInWithPassword()
3. If valid → server fetches profile (role, is_active) from profiles table
4. Server signs JWT:  { sub: userId, role, name, iat, exp }
5. JWT returned in response body (client stores in memory / localStorage)
6. Every subsequent request: Authorization: Bearer <jwt>
7. auth.middleware.js verifies signature, checks expiry, attaches req.user
```

---

## auth.middleware.js

```js
// server/src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'TOKEN_MISSING', 'No authorization token provided'));
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:   decoded.sub,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'TOKEN_EXPIRED', 'Token has expired. Please log in again.'));
    }
    return next(new ApiError(401, 'TOKEN_INVALID', 'Invalid token.'));
  }
}
```

---

## rbac.middleware.js

```js
// server/src/middleware/rbac.middleware.js
import { ApiError } from '../utils/ApiError.js';

// Factory: returns middleware for allowed roles
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(
        403,
        'INSUFFICIENT_ROLE',
        `This action requires one of: ${allowedRoles.join(', ')}`
      ));
    }
    next();
  };
}

// Usage in routes:
// router.post('/', authenticate, requireRole(['OWNER', 'STAFF']), controller.create);
// router.delete('/:id', authenticate, requireRole(['OWNER']), controller.remove);
```

---

## RBAC Matrix

| Action | VIEWER | STAFF | OWNER |
|---|---|---|---|
| Login | ✓ | ✓ | ✓ |
| View purchases | ✓ | ✓ | ✓ |
| Create purchase | ✗ | ✓ | ✓ |
| Edit own purchase (today) | ✗ | ✓ | ✓ |
| Edit any purchase | ✗ | ✗ | ✓ |
| Delete purchase | ✗ | ✗ | ✓ |
| View rates | ✓ | ✓ | ✓ |
| Set rate | ✗ | ✓ | ✓ |
| Edit rate | ✗ | ✗ | ✓ |
| View audit logs | ✓ | ✓ | ✓ |
| View users | ✗ | ✗ | ✓ |
| Invite users | ✗ | ✗ | ✓ |
| Change user roles | ✗ | ✗ | ✓ |
| Deactivate user | ✗ | ✗ | ✓ |

---

## Frontend Auth (AuthProvider)

```jsx
// client/src/features/auth/AuthProvider.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount
    const token = localStorage.getItem('swarna_token');
    const userData = localStorage.getItem('swarna_user');
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        // Validate token hasn't expired (decode without verify — server will reject if expired)
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(parsed);
        } else {
          localStorage.removeItem('swarna_token');
          localStorage.removeItem('swarna_user');
        }
      } catch { /* bad token, clear */ }
    }
    setIsLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('swarna_token', token);
    localStorage.setItem('swarna_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    localStorage.removeItem('swarna_token');
    localStorage.removeItem('swarna_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## Frontend Axios Interceptor

```js
// client/src/api/client.js
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('swarna_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response.data,  // unwrap .data automatically
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('swarna_token');
      localStorage.removeItem('swarna_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data?.error ?? error);
  }
);
```

---

## Token Refresh Strategy

v1 keeps it simple: **7-day JWT, no refresh token**. If the token expires, the user sees the login page. With only 2-3 users who use the app daily, this is acceptable.

For v2: implement refresh token rotation with a `/api/auth/refresh` endpoint.

---

## Invite Flow (OWNER only)

```
1. Owner opens Settings → Users → "+ Invite User"
2. Fills: email, full_name, role
3. Server calls supabase.auth.admin.inviteUserByEmail()
   with raw_user_meta_data: { full_name, role }
4. Supabase sends invite email with magic link
5. New user clicks link → Supabase creates auth.users entry
6. Trigger (handle_new_user) creates profile with correct role
7. User lands on app, must set password, then logs in normally
```

---

## Security Notes

- JWT `JWT_SECRET` must be ≥ 32 chars, random. Generate: `openssl rand -hex 32`
- Never log JWT values or user passwords
- `helmet()` sets security headers (X-Frame-Options, CSP, etc.)
- CORS restricted to `CORS_ORIGIN` env var (production: Railway frontend URL)
- Rate limiting: `express-rate-limit` on `/api/auth/login` → max 10 req/15min per IP
- Supabase Service Role Key is **only on the server** — never in frontend env vars

```js
// server/index.js — rate limiting on login
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts' } }
});

app.use('/api/auth/login', loginLimiter);
```

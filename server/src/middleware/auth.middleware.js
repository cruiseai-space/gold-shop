// server/src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware to verify JWT and attach user to request.
 */
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

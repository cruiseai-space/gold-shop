// server/src/middleware/rbac.middleware.js
import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware factory to restrict access based on user roles.
 * @param {string[]} allowedRoles - Array of roles allowed to access the route.
 */
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

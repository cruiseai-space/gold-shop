// server/src/controllers/auth.controller.js
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase.js';
import * as usersService from '../services/users.service.js';
import * as logsService from '../services/logs.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Register a new user using Supabase Auth.
 */
export const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'OWNER', // Default to OWNER for first signup, or adjust as needed
      }
    }
  });

  if (error) {
    throw new ApiError(400, 'SIGNUP_FAILED', error.message);
  }

  res.status(201).json({ 
    success: true, 
    message: 'User registered successfully. Please check your email for confirmation.',
    data: { user: data.user }
  });
});

/**
 * Login user using Supabase Auth and issue custom JWT.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const profile = await usersService.getProfile(data.user.id);
  if (!profile.is_active) {
    throw new ApiError(403, 'ACCOUNT_DISABLED', 'Account is inactive');
  }

  const token = jwt.sign(
    { sub: data.user.id, role: profile.role, name: profile.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  await logsService.log({ 
    userId: data.user.id, 
    actionType: 'LOGIN',
    ipAddress: req.ip
  });

  res.json({ 
    success: true, 
    data: { 
      token, 
      user: { ...profile, email: data.user.email } 
    } 
  });
});

/**
 * Logout user.
 */
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await supabase.auth.signOut();
    await logsService.log({ 
      userId: req.user.id, 
      actionType: 'LOGOUT',
      ipAddress: req.ip
    });
  }
  
  res.json({ success: true });
});

/**
 * Get current user profile.
 */
export const me = asyncHandler(async (req, res) => {
  const profile = await usersService.getProfile(req.user.id);
  res.json({ success: true, data: profile });
});

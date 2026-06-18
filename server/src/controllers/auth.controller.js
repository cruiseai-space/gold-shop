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

/**
 * Send password reset email via Supabase.
 * Always returns success to prevent email enumeration.
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
    });
  }

  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CORS_ORIGIN}/reset-password`,
    });
  } catch (err) {
    // Intentionally swallow — don't reveal if email exists
    console.error('Password reset error:', err.message);
  }

  // Always return success to prevent email enumeration
  res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
}

/**
 * Reset user password using Supabase access token from the reset email link.
 */
export async function resetPassword(req, res) {
  const { accessToken, newPassword } = req.body;

  if (!accessToken || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Access token and new password are required' },
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
    });
  }

  try {
    // Verify the token first
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(accessToken);
    if (verifyError || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Invalid or expired reset token' },
      });
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: { code: 'DB_ERROR', message: 'Failed to update password' },
      });
    }

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: 'Password reset failed' },
    });
  }
}

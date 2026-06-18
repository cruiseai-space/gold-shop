// client/src/features/auth/ResetPasswordPage.jsx
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as authApi from '../../api/auth.js';

const resetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function parseHashParams() {
  const hash = window.location.hash.substring(1); // remove #
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const accessToken = useMemo(() => parseHashParams(), []);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(accessToken, data.newPassword);
      toast.success('Password has been reset successfully');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl text-primary mb-2">Swarna Ledger</h1>
          </div>
          <div className="bg-surface p-8 rounded-lg shadow-md border border-border text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-display font-semibold text-ink">Invalid Reset Link</h2>
            <p className="text-sm text-ink-muted">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block text-sm text-primary hover:underline font-semibold"
            >
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl text-primary mb-2">Swarna Ledger</h1>
          <p className="text-ink-muted">Set your new password</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6 bg-surface p-8 rounded-lg shadow-md border border-border">
          {error && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink mb-1">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                className={`input ${errors.newPassword ? 'border-danger focus:ring-danger/20' : ''}`}
                placeholder="At least 8 characters"
                autoFocus
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-danger">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-1">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className={`input ${errors.confirmPassword ? 'border-danger focus:ring-danger/20' : ''}`}
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              ← Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

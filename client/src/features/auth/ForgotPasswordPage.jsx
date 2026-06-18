// client/src/features/auth/ForgotPasswordPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import * as authApi from '../../api/auth.js';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(data.email);
    } catch {
      // Swallow — server always returns success
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl text-primary mb-2">Swarna Ledger</h1>
          <p className="text-ink-muted">Reset your password</p>
        </div>

        {isSubmitted ? (
          <div className="bg-surface p-8 rounded-lg shadow-md border border-border text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-display font-semibold text-ink">Check your email</h2>
            <p className="text-sm text-ink-muted">
              If an account exists with that email, we've sent a link to reset your password. Please check your inbox and spam folder.
            </p>
            <Link
              to="/login"
              className="inline-block text-sm text-primary hover:underline font-semibold"
            >
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6 bg-surface p-8 rounded-lg shadow-md border border-border">
            <p className="text-sm text-ink-muted">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`input ${errors.email ? 'border-danger focus:ring-danger/20' : ''}`}
                placeholder="owner@swarna.com"
                autoFocus
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-primary hover:underline">
                ← Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

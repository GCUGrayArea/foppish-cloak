import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../utils/validation';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getApiClient } from '../lib/api-client';
import styles from './ForgotPassword.module.css';

export const ForgotPassword: React.FC = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setServerError(null);
      const apiClient = getApiClient();
      await apiClient.post('/auth/forgot-password', data, { skipAuth: true });
      setEmailSent(true);
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to send reset email. Please try again.');
      }
    }
  };

  if (emailSent) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.successIcon}>
            <svg
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>Check Your Email</h1>
            <p className={styles.subtitle}>
              If an account exists with that email address, we've sent you instructions to reset your password.
            </p>
          </div>

          <div className={styles.actions}>
            <Link to="/login" className={styles.backButton}>
              <svg
                className={styles.backIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reset Your Password</h1>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          {serverError && (
            <div className={styles.errorBanner} role="alert">
              <svg
                className={styles.errorIcon}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          <Input
            {...register('email')}
            type="email"
            label="Email Address"
            error={errors.email?.message}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className={styles.submitButton}
          >
            Send Reset Instructions
          </Button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            <svg
              className={styles.backIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../../utils/validation';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login({
        email: data.email,
        password: data.password,
      });
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to sign in. Please try again.');
      }
    }
  };

  return (
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

      <div className={styles.passwordField}>
        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          label="Password"
          error={errors.password?.message}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={styles.togglePassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          disabled={isSubmitting}
        >
          {showPassword ? (
            <svg
              className={styles.eyeIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg
              className={styles.eyeIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>

      <div className={styles.rememberMe}>
        <label className={styles.checkbox}>
          <input
            {...register('rememberMe')}
            type="checkbox"
            disabled={isSubmitting}
          />
          <span>Remember me</span>
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className={styles.submitButton}
      >
        Sign In
      </Button>
    </form>
  );
};

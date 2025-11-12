import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';
import { registerSchema, type RegisterFormData } from '../../utils/validation';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import styles from './RegisterForm.module.css';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      firmName: '',
    },
    mode: 'onChange',
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        firmName: data.firmName,
      });
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to create account. Please try again.');
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

      <div className={styles.row}>
        <Input
          {...register('firstName')}
          type="text"
          label="First Name"
          error={errors.firstName?.message}
          placeholder="John"
          autoComplete="given-name"
          required
          disabled={isSubmitting}
        />

        <Input
          {...register('lastName')}
          type="text"
          label="Last Name"
          error={errors.lastName?.message}
          placeholder="Doe"
          autoComplete="family-name"
          required
          disabled={isSubmitting}
        />
      </div>

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

      <Input
        {...register('firmName')}
        type="text"
        label="Firm Name"
        error={errors.firmName?.message}
        placeholder="Your Law Firm"
        autoComplete="organization"
        required
        disabled={isSubmitting}
      />

      <div className={styles.passwordField}>
        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          label="Password"
          error={errors.password?.message}
          placeholder="Create a strong password"
          autoComplete="new-password"
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
        <PasswordStrengthIndicator password={passwordValue || ''} />
      </div>

      <div className={styles.passwordField}>
        <Input
          {...register('confirmPassword')}
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirm Password"
          error={errors.confirmPassword?.message}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className={styles.togglePassword}
          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          disabled={isSubmitting}
        >
          {showConfirmPassword ? (
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

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className={styles.submitButton}
      >
        Create Account
      </Button>

      <p className={styles.terms}>
        By creating an account, you agree to our{' '}
        <a href="/terms" className={styles.termsLink}>
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className={styles.termsLink}>
          Privacy Policy
        </a>
      </p>
    </form>
  );
};

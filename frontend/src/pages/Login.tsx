import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const redirectTo = searchParams.get('redirect') || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleLoginSuccess = () => {
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to your account to continue
          </p>
        </div>

        <LoginForm onSuccess={handleLoginSuccess} />

        <div className={styles.footer}>
          <p className={styles.registerPrompt}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.link}>
              Create one now
            </Link>
          </p>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
};

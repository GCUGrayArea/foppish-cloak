import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../hooks/useAuth';
import styles from './Register.module.css';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRegisterSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Your Account</h1>
          <p className={styles.subtitle}>
            Join us to get started with demand letter generation
          </p>
        </div>

        <RegisterForm onSuccess={handleRegisterSuccess} />

        <div className={styles.footer}>
          <p className={styles.loginPrompt}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

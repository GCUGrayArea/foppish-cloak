import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      gap: 'var(--spacing-lg)'
    }}>
      <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)' }}>
        404
      </h1>
      <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-secondary)' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-tertiary)', maxWidth: '500px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="primary">
          Go Home
        </Button>
      </Link>
    </div>
  );
};

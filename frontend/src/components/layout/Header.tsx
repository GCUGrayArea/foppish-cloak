import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { HelpButton } from '../help/HelpButton';
import styles from './Header.module.css';

interface HeaderProps {
  onHelpClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHelpClick }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <h1 className={styles.logoText}>Demand Letter Generator</h1>
        </Link>

        <nav className={styles.nav}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user?.firstName} {user?.lastName}
            </span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
          {onHelpClick && (
            <div data-tour="help">
              <HelpButton onClick={onHelpClick} />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
};

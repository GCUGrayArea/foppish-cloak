import React from 'react';
import { Button } from '../ui/Button';
import styles from './HelpButton.module.css';

interface HelpButtonProps {
  onClick: () => void;
  title?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  onClick,
  title = 'Open Help (Press ?)',
}) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={styles.helpButton}
      aria-label="Open help panel"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10 14v-1m0-4a2 2 0 10-2-2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.visuallyHidden}>Help</span>
    </Button>
  );
};

import React from 'react';
import { validatePasswordStrength } from '../../utils/validation';
import styles from './PasswordStrengthIndicator.module.css';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  if (!password) {
    return null;
  }

  const { isValid, checks } = validatePasswordStrength(password);

  const requirements = [
    { key: 'minLength', label: 'At least 8 characters', met: checks.minLength },
    { key: 'hasUppercase', label: 'One uppercase letter', met: checks.hasUppercase },
    { key: 'hasLowercase', label: 'One lowercase letter', met: checks.hasLowercase },
    { key: 'hasNumber', label: 'One number', met: checks.hasNumber },
    { key: 'hasSpecialChar', label: 'One special character', met: checks.hasSpecialChar },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const strengthLevel = getStrengthLevel(metCount);

  return (
    <div className={styles.container}>
      <div className={styles.strengthBar}>
        <div
          className={`${styles.strengthFill} ${styles[strengthLevel]}`}
          style={{ width: `${(metCount / requirements.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={metCount}
          aria-valuemin={0}
          aria-valuemax={requirements.length}
          aria-label="Password strength"
        />
      </div>

      <div className={styles.requirements}>
        <p className={styles.requirementsTitle}>Password must contain:</p>
        <ul className={styles.requirementsList}>
          {requirements.map((req) => (
            <li
              key={req.key}
              className={`${styles.requirement} ${req.met ? styles.met : styles.unmet}`}
            >
              <svg
                className={styles.icon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {req.met ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                )}
              </svg>
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {isValid && (
        <div className={styles.successMessage} role="status">
          <svg
            className={styles.successIcon}
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
          <span>Password is strong!</span>
        </div>
      )}
    </div>
  );
};

function getStrengthLevel(metCount: number): string {
  if (metCount <= 1) return 'weak';
  if (metCount <= 3) return 'medium';
  if (metCount <= 4) return 'good';
  return 'strong';
}

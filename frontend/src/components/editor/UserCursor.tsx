/**
 * UserCursor Component
 *
 * Displays a remote user's cursor position in the editor
 */

import React from 'react';
import type { UserPresence } from '../../types/collaboration';
import styles from './UserCursor.module.css';

export interface UserCursorProps {
  presence: UserPresence;
}

export const UserCursor: React.FC<UserCursorProps> = ({ presence }) => {
  const { userName, userColor, cursor } = presence;

  if (!cursor) {
    return null;
  }

  return (
    <div
      className={styles.cursor}
      style={{
        borderColor: userColor,
        top: `${cursor.line * 1.6}em`, // Approximate line height
        left: `${cursor.column * 0.6}em`, // Approximate character width
      }}
      title={userName}
    >
      <div
        className={styles.label}
        style={{
          backgroundColor: userColor,
        }}
      >
        {userName}
      </div>
    </div>
  );
};

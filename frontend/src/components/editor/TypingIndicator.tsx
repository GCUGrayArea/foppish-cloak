/**
 * TypingIndicator Component
 *
 * Shows which users are currently typing
 */

import React from 'react';
import type { UserPresence } from '../../types/collaboration';
import styles from './TypingIndicator.module.css';

export interface TypingIndicatorProps {
  users: UserPresence[];
  currentUserId: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  currentUserId,
}) => {
  // Filter for users who are typing (excluding current user)
  const typingUsers = users.filter(
    user => user.userId !== currentUserId && user.isTyping
  );

  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingText = (): string => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    } else {
      return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span className={styles.text}>{getTypingText()}</span>
    </div>
  );
};

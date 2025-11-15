/**
 * PresenceList Component
 *
 * Shows list of active users collaborating on the document
 */

import React from 'react';
import type { UserPresence } from '../../types/collaboration';
import styles from './PresenceList.module.css';

export interface PresenceListProps {
  users: UserPresence[];
  currentUserId: string;
  currentUserName: string;
}

export const PresenceList: React.FC<PresenceListProps> = ({
  users,
  currentUserId,
  currentUserName,
}) => {
  // Filter out current user from list
  const otherUsers = users.filter(user => user.userId !== currentUserId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>👥</span>
        <span className={styles.count}>
          {otherUsers.length + 1} active
        </span>
      </div>
      <div className={styles.userList}>
        {/* Current user */}
        <div className={styles.user}>
          <div
            className={styles.avatar}
            style={{ backgroundColor: '#0066cc' }}
          >
            {currentUserName[0].toUpperCase()}
          </div>
          <span className={styles.userName}>
            {currentUserName} (you)
          </span>
        </div>

        {/* Other users */}
        {otherUsers.map((user) => (
          <div key={user.userId} className={styles.user}>
            <div
              className={styles.avatar}
              style={{ backgroundColor: user.userColor }}
            >
              {user.userName[0].toUpperCase()}
            </div>
            <span className={styles.userName}>{user.userName}</span>
            {user.isTyping && (
              <span className={styles.typingDot} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

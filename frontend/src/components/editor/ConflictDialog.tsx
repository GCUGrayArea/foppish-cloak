/**
 * ConflictDialog Component (Optional)
 *
 * Dialog for manually resolving conflicts (not needed with Yjs CRDT)
 * This component is included as a placeholder for future enhancements
 */

import React from 'react';

export interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Note: Yjs CRDT handles conflict resolution automatically.
 * This component is a placeholder for potential future UI features
 * such as showing conflict history or manual intervention options.
 */
export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
      }}>
        <h2>Conflict Resolution</h2>
        <p>
          Conflicts are automatically resolved by Yjs CRDT.
          No manual intervention needed.
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

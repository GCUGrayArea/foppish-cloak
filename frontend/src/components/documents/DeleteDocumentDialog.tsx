/**
 * DeleteDocumentDialog Component
 *
 * Confirmation dialog for deleting a document
 * Uses Radix UI Dialog
 */

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { DocumentListItem } from '../../types/document';
import styles from './DeleteDocumentDialog.module.css';

interface DeleteDocumentDialogProps {
  document: DocumentListItem | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteDocumentDialog: React.FC<DeleteDocumentDialogProps> = ({
  document,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!document) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>Delete Document</Dialog.Title>

          <Dialog.Description className={styles.description}>
            Are you sure you want to delete this document? This action cannot be
            undone.
          </Dialog.Description>

          <div className={styles.documentInfo}>
            <p className={styles.documentName}>{document.originalName}</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className={styles.button}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className={`${styles.button} ${styles.buttonDanger}`}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close"
              disabled={isDeleting}
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

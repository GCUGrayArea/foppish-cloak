/**
 * DeleteConfirmDialog Component
 *
 * Confirmation dialog for deleting templates
 */

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import styles from './DeleteConfirmDialog.module.css';

interface DeleteConfirmDialogProps {
  open: boolean;
  templateName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  templateName,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            Delete Template
          </Dialog.Title>
          <Dialog.Description className={styles.description}>
            Are you sure you want to delete the template "
            <strong>{templateName}</strong>"? This action cannot be undone.
            All version history will be permanently removed.
          </Dialog.Description>

          <div className={styles.actions}>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
              isLoading={isDeleting}
            >
              Delete Template
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

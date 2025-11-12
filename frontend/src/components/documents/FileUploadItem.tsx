/**
 * FileUploadItem Component
 *
 * Displays individual file upload progress with status and controls
 */

import React from 'react';
import type { UploadProgress } from '../../types/document';
import { getFileIcon } from '../../utils/fileIcons';
import { formatFileSize } from '../../utils/fileValidation';
import styles from './FileUploadItem.module.css';

interface FileUploadItemProps {
  upload: UploadProgress;
  onCancel?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
}

export const FileUploadItem: React.FC<FileUploadItemProps> = ({
  upload,
  onCancel,
  onRetry,
}) => {
  const { fileId, file, progress, status, error } = upload;

  const statusText = {
    queued: 'Queued',
    uploading: 'Uploading',
    complete: 'Complete',
    error: 'Failed',
  }[status];

  const statusColor = {
    queued: styles.statusQueued,
    uploading: styles.statusUploading,
    complete: styles.statusComplete,
    error: styles.statusError,
  }[status];

  const canCancel = status === 'queued' || status === 'uploading';
  const canRetry = status === 'error';

  return (
    <div className={`${styles.uploadItem} ${statusColor}`}>
      <div className={styles.fileInfo}>
        <span className={styles.icon}>{getFileIcon(file.type)}</span>
        <div className={styles.details}>
          <p className={styles.fileName}>{file.name}</p>
          <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.statusText}>{statusText}</span>
          {status === 'uploading' && (
            <span className={styles.percentage}>{progress}%</span>
          )}
        </div>

        {status === 'uploading' && (
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress: ${progress}%`}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {status === 'error' && error && (
          <p className={styles.errorMessage}>{error}</p>
        )}
      </div>

      <div className={styles.actions}>
        {canCancel && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(fileId)}
            className={styles.button}
            aria-label="Cancel upload"
          >
            Cancel
          </button>
        )}
        {canRetry && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(fileId)}
            className={styles.button}
            aria-label="Retry upload"
          >
            Retry
          </button>
        )}
        {status === 'complete' && (
          <span className={styles.checkmark} aria-label="Upload complete">
            ✓
          </span>
        )}
      </div>
    </div>
  );
};

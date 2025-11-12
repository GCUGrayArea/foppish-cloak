/**
 * DocumentCard Component
 *
 * Card view for displaying document information
 * Mobile-friendly alternative to table view
 */

import React from 'react';
import type { DocumentListItem } from '../../types/document';
import { getFileIcon, getFileTypeLabel } from '../../utils/fileIcons';
import { formatFileSize } from '../../utils/fileValidation';
import styles from './DocumentCard.module.css';

interface DocumentCardProps {
  document: DocumentListItem;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDownload,
  onDelete,
}) => {
  const formattedDate = new Date(document.createdAt).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

  const virusScanBadge = {
    pending: { label: 'Scanning...', className: styles.badgePending },
    clean: { label: 'Safe', className: styles.badgeClean },
    infected: { label: 'Infected', className: styles.badgeInfected },
    failed: { label: 'Scan Failed', className: styles.badgeFailed },
  }[document.virusScanStatus];

  const canDownload =
    document.virusScanStatus === 'clean' ||
    document.virusScanStatus === 'failed';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{getFileIcon(document.fileType)}</span>
        <div className={styles.headerInfo}>
          <h3 className={styles.fileName}>{document.originalName}</h3>
          <span className={`${styles.badge} ${virusScanBadge.className}`}>
            {virusScanBadge.label}
          </span>
        </div>
      </div>

      <div className={styles.metadata}>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Type</span>
          <span className={styles.metadataValue}>
            {getFileTypeLabel(document.fileType)}
          </span>
        </div>

        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Size</span>
          <span className={styles.metadataValue}>
            {formatFileSize(document.fileSize)}
          </span>
        </div>

        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Uploaded By</span>
          <span className={styles.metadataValue}>
            {document.uploadedBy.name}
          </span>
        </div>

        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Uploaded</span>
          <span className={styles.metadataValue}>{formattedDate}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => onDownload(document.id)}
          disabled={!canDownload}
          className={styles.button}
          aria-label={`Download ${document.originalName}`}
        >
          Download
        </button>
        <button
          type="button"
          onClick={() => onDelete(document.id)}
          className={`${styles.button} ${styles.buttonDanger}`}
          aria-label={`Delete ${document.originalName}`}
        >
          Delete
        </button>
      </div>

      {document.virusScanStatus === 'infected' && (
        <div className={styles.warning}>
          This file is infected with malware and cannot be downloaded.
        </div>
      )}
    </div>
  );
};

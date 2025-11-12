/**
 * DocumentListTable Component
 *
 * Table view for displaying list of documents
 */

import React from 'react';
import type { DocumentListItem } from '../../types/document';
import { getFileIcon, getFileTypeLabel } from '../../utils/fileIcons';
import { formatFileSize } from '../../utils/fileValidation';
import styles from './DocumentListTable.module.css';

interface DocumentListTableProps {
  documents: DocumentListItem[];
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DocumentListTable: React.FC<DocumentListTableProps> = ({
  documents,
  onDownload,
  onDelete,
}) => {
  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📁</div>
        <p className={styles.emptyText}>No documents uploaded yet</p>
        <p className={styles.emptyHint}>
          Upload your first document using the area above
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.headerCell}>File</th>
            <th className={styles.headerCell}>Type</th>
            <th className={styles.headerCell}>Size</th>
            <th className={styles.headerCell}>Uploaded By</th>
            <th className={styles.headerCell}>Date</th>
            <th className={styles.headerCell}>Status</th>
            <th className={styles.headerCell}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const formattedDate = new Date(
              document.createdAt
            ).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

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
              <tr key={document.id} className={styles.row}>
                <td className={styles.cell}>
                  <div className={styles.fileCell}>
                    <span className={styles.fileIcon}>
                      {getFileIcon(document.fileType)}
                    </span>
                    <span className={styles.fileName}>
                      {document.originalName}
                    </span>
                  </div>
                </td>
                <td className={styles.cell}>
                  {getFileTypeLabel(document.fileType)}
                </td>
                <td className={styles.cell}>
                  {formatFileSize(document.fileSize)}
                </td>
                <td className={styles.cell}>{document.uploadedBy.name}</td>
                <td className={styles.cell}>{formattedDate}</td>
                <td className={styles.cell}>
                  <span
                    className={`${styles.badge} ${virusScanBadge.className}`}
                  >
                    {virusScanBadge.label}
                  </span>
                </td>
                <td className={styles.cell}>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => onDownload(document.id)}
                      disabled={!canDownload}
                      className={styles.actionButton}
                      aria-label={`Download ${document.originalName}`}
                      title="Download"
                    >
                      ⬇
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(document.id)}
                      className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                      aria-label={`Delete ${document.originalName}`}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

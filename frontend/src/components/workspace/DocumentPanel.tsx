/**
 * DocumentPanel Component
 *
 * Displays list of uploaded source documents for a demand letter
 */

import React from 'react';
import type { DemandLetterDocument } from '../../types/demand-letter';
import { getFileIcon } from '../../utils/fileIcons';
import styles from './DocumentPanel.module.css';

export interface DocumentPanelProps {
  documents: DemandLetterDocument[];
  isLoading?: boolean;
  onDocumentClick?: (documentId: string) => void;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  documents,
  isLoading = false,
  onDocumentClick,
}) => {
  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Source Documents</h2>
        </div>
        <div className={styles.loading}>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Source Documents</h2>
        </div>
        <div className={styles.empty}>
          <p>No documents uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Source Documents</h2>
        <span className={styles.count}>{documents.length}</span>
      </div>
      <div className={styles.documentList}>
        {documents.map((doc) => (
          <DocumentItem
            key={doc.id}
            document={doc}
            onClick={onDocumentClick}
          />
        ))}
      </div>
    </div>
  );
};

interface DocumentItemProps {
  document: DemandLetterDocument;
  onClick?: (documentId: string) => void;
}

const DocumentItem: React.FC<DocumentItemProps> = ({ document, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(document.id);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const fileExtension = document.filename.split('.').pop() || '';
  const icon = getFileIcon(fileExtension);

  return (
    <div
      className={styles.documentItem}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.documentIcon}>{icon}</div>
      <div className={styles.documentInfo}>
        <div className={styles.documentName} title={document.filename}>
          {document.filename}
        </div>
        <div className={styles.documentMeta}>
          Uploaded {formatDate(document.uploadedAt)}
        </div>
      </div>
    </div>
  );
};

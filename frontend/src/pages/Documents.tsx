/**
 * Documents Page
 *
 * Main page for document upload and management
 */

import React, { useState } from 'react';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../hooks/useDocuments';
import type { UploadProgress, FileValidationError, DocumentListItem } from '../types/document';
import { FileDropZone } from '../components/documents/FileDropZone';
import { FileUploadItem } from '../components/documents/FileUploadItem';
import { DocumentListTable } from '../components/documents/DocumentListTable';
import { DeleteDocumentDialog } from '../components/documents/DeleteDocumentDialog';
import styles from './Documents.module.css';

export const Documents: React.FC = () => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentListItem | null>(null);

  const { data: documentsData, isLoading, error } = useDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const handleFilesSelected = (files: File[]) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      fileId: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'queued',
      abortController: new AbortController(),
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    newUploads.forEach((upload) => {
      startUpload(upload);
    });
  };

  const startUpload = async (upload: UploadProgress) => {
    if (!upload.abortController) return;

    setUploads((prev) =>
      prev.map((u) =>
        u.fileId === upload.fileId ? { ...u, status: 'uploading' as const } : u
      )
    );

    try {
      const result = await uploadMutation.mutateAsync({
        file: upload.file,
        onProgress: (progress) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.fileId === upload.fileId ? { ...u, progress } : u
            )
          );
        },
        abortController: upload.abortController,
      });

      setUploads((prev) =>
        prev.map((u) =>
          u.fileId === upload.fileId
            ? {
                ...u,
                status: 'complete' as const,
                progress: 100,
                documentId: result.id,
              }
            : u
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Upload failed';
      setUploads((prev) =>
        prev.map((u) =>
          u.fileId === upload.fileId
            ? { ...u, status: 'error' as const, error: errorMessage }
            : u
        )
      );
    }
  };

  const handleCancelUpload = (fileId: string) => {
    const upload = uploads.find((u) => u.fileId === fileId);
    if (upload?.abortController) {
      upload.abortController.abort();
    }
    setUploads((prev) => prev.filter((u) => u.fileId !== fileId));
  };

  const handleRetryUpload = (fileId: string) => {
    const upload = uploads.find((u) => u.fileId === fileId);
    if (upload) {
      const retryUpload: UploadProgress = {
        ...upload,
        status: 'queued',
        progress: 0,
        error: undefined,
        abortController: new AbortController(),
      };
      setUploads((prev) =>
        prev.map((u) => (u.fileId === fileId ? retryUpload : u))
      );
      startUpload(retryUpload);
    }
  };

  const handleValidationErrors = (errors: FileValidationError[]) => {
    setValidationErrors(errors);
    setTimeout(() => {
      setValidationErrors([]);
    }, 5000);
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documents/${id}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      alert('Failed to download document');
    }
  };

  const handleDeleteClick = (document: DocumentListItem) => {
    setDocumentToDelete(document);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await deleteMutation.mutateAsync(documentToDelete.id);
      setDocumentToDelete(null);
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  const handleDeleteCancel = () => {
    setDocumentToDelete(null);
  };

  const activeUploads = uploads.filter(
    (u) => u.status === 'queued' || u.status === 'uploading'
  );
  const errorUploads = uploads.filter((u) => u.status === 'error');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Documents</h1>
        <p className={styles.subtitle}>
          Upload and manage documents for demand letter generation
        </p>
      </header>

      <section className={styles.uploadSection}>
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          onValidationErrors={handleValidationErrors}
          multiple
        />

        {validationErrors.length > 0 && (
          <div className={styles.validationErrors}>
            <h3 className={styles.errorTitle}>Upload Errors</h3>
            {validationErrors.map((err, index) => (
              <div key={index} className={styles.errorItem}>
                <strong>{err.file.name}</strong>: {err.error}
              </div>
            ))}
          </div>
        )}

        {(activeUploads.length > 0 || errorUploads.length > 0) && (
          <div className={styles.uploadQueue}>
            <h3 className={styles.queueTitle}>
              Uploading ({activeUploads.length + errorUploads.length})
            </h3>
            <div className={styles.uploadList}>
              {[...activeUploads, ...errorUploads].map((upload) => (
                <FileUploadItem
                  key={upload.fileId}
                  upload={upload}
                  onCancel={handleCancelUpload}
                  onRetry={handleRetryUpload}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={styles.documentsSection}>
        <h2 className={styles.sectionTitle}>Uploaded Documents</h2>

        {isLoading && (
          <div className={styles.loading}>Loading documents...</div>
        )}

        {error && (
          <div className={styles.error}>
            Failed to load documents. Please try again.
          </div>
        )}

        {documentsData && (
          <DocumentListTable
            documents={documentsData.documents}
            onDownload={handleDownload}
            onDelete={(id: string) => {
              const doc = documentsData.documents.find((d) => d.id === id);
              if (doc) handleDeleteClick(doc);
            }}
          />
        )}
      </section>

      <DeleteDocumentDialog
        document={documentToDelete}
        isOpen={!!documentToDelete}
        isDeleting={deleteMutation.isPending}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

/**
 * FileDropZone Component
 *
 * Drag-and-drop file upload area with native HTML5 API
 * Also supports click-to-select files
 */

import React, { useRef, useState } from 'react';
import { validateFile, getAllowedExtensions } from '../../utils/fileValidation';
import type { FileValidationError } from '../../types/document';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onValidationErrors?: (errors: FileValidationError[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  onValidationErrors,
  disabled = false,
  multiple = true,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validFiles: File[] = [];
    const errors: FileValidationError[] = [];

    // Validate each file
    files.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push({
          file,
          error: validation.error || 'Invalid file',
        });
      }
    });

    // Call callbacks
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    if (errors.length > 0 && onValidationErrors) {
      onValidationErrors(errors);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const { files } = e.dataTransfer;
    processFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const allowedExtensions = getAllowedExtensions();

  return (
    <div
      className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''} ${
        disabled ? styles.disabled : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload files"
      aria-disabled={disabled}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={allowedExtensions.join(',')}
        onChange={handleFileInputChange}
        className={styles.fileInput}
        disabled={disabled}
        aria-hidden="true"
      />

      <div className={styles.content}>
        <div className={styles.icon}>📁</div>
        <div className={styles.text}>
          <p className={styles.primary}>
            {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
          </p>
          <p className={styles.secondary}>or click to select files</p>
        </div>
        <div className={styles.info}>
          <p className={styles.supportedTypes}>
            Supported: PDF, Word, Images, Spreadsheets
          </p>
          <p className={styles.maxSize}>Maximum file size: 50 MB</p>
        </div>
      </div>
    </div>
  );
};

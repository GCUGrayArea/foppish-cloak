/**
 * LetterEditor Component
 *
 * Rich text editor for demand letter content with real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import styles from './LetterEditor.module.css';

export interface LetterEditorProps {
  content: string;
  isGenerating?: boolean;
  isRefining?: boolean;
  onContentChange?: (content: string) => void;
  onSave?: () => void;
  onGenerate?: () => void;
  onExport?: (format: 'word' | 'pdf') => void;
}

export const LetterEditor: React.FC<LetterEditorProps> = ({
  content,
  isGenerating = false,
  isRefining = false,
  onContentChange,
  onSave,
  onGenerate,
  onExport,
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setLocalContent(content);
    setHasUnsavedChanges(false);
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setLocalContent(newContent);
      setHasUnsavedChanges(true);

      if (onContentChange) {
        onContentChange(newContent);
      }
    },
    [onContentChange]
  );

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
      setHasUnsavedChanges(false);
    }
  }, [onSave]);

  const wordCount = localContent.trim().split(/\s+/).filter(Boolean).length;

  const isProcessing = isGenerating || isRefining;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Demand Letter</h2>
          {wordCount > 0 && (
            <span className={styles.wordCount}>{wordCount} words</span>
          )}
          {hasUnsavedChanges && (
            <span className={styles.unsavedIndicator}>Unsaved changes</span>
          )}
        </div>
        <div className={styles.headerRight}>
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isProcessing}
            >
              Save
            </Button>
          )}
          {onGenerate && (
            <Button
              variant="primary"
              size="sm"
              onClick={onGenerate}
              isLoading={isGenerating}
              disabled={isProcessing}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          )}
          {onExport && (
            <ExportMenu onExport={onExport} disabled={isProcessing} />
          )}
        </div>
      </div>
      <div className={styles.editorContainer}>
        {isProcessing && (
          <div className={styles.processingOverlay}>
            <div className={styles.spinner} />
            <p>
              {isGenerating
                ? 'Generating letter...'
                : 'Refining letter...'}
            </p>
          </div>
        )}
        <textarea
          className={styles.editor}
          value={localContent}
          onChange={handleChange}
          placeholder="Your demand letter will appear here. Click 'Generate' to create an initial draft based on the analyzed documents."
          disabled={isProcessing}
        />
      </div>
    </div>
  );
};

interface ExportMenuProps {
  onExport: (format: 'word' | 'pdf') => void;
  disabled?: boolean;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ onExport, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'word' | 'pdf') => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className={styles.exportMenu}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        Export ▼
      </Button>
      {isOpen && (
        <>
          <div
            className={styles.exportBackdrop}
            onClick={() => setIsOpen(false)}
          />
          <div className={styles.exportDropdown}>
            <button
              className={styles.exportOption}
              onClick={() => handleExport('word')}
            >
              Export as Word (.docx)
            </button>
            <button
              className={styles.exportOption}
              onClick={() => handleExport('pdf')}
            >
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

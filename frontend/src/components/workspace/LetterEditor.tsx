/**
 * LetterEditor Component
 *
 * Rich text editor for demand letter content with optional real-time collaboration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { CollaborativeEditor } from '../editor/CollaborativeEditor';
import { PresenceList } from '../editor/PresenceList';
import { TypingIndicator } from '../editor/TypingIndicator';
import { OfflineIndicator } from '../editor/OfflineIndicator';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useAuth } from '../../hooks/useAuth';
import styles from './LetterEditor.module.css';

export interface LetterEditorProps {
  letterId: string;
  content: string;
  isGenerating?: boolean;
  isRefining?: boolean;
  enableCollaboration?: boolean;
  onContentChange?: (content: string) => void;
  onSave?: () => void;
  onGenerate?: () => void;
  onExport?: (format: 'word' | 'pdf') => void;
}

export const LetterEditor: React.FC<LetterEditorProps> = ({
  letterId,
  content,
  isGenerating = false,
  isRefining = false,
  enableCollaboration = true,
  onContentChange,
  onSave,
  onGenerate,
  onExport,
}) => {
  const { user } = useAuth();
  const [localContent, setLocalContent] = useState(content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Collaboration hook (only if enabled and user is authenticated)
  const collaboration = enableCollaboration && user
    ? useCollaboration({
        letterId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        autoConnect: true,
      })
    : null;

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

  const handleContentChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);

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

  const handleReconnect = useCallback(() => {
    if (collaboration) {
      collaboration.connect();
    }
  }, [collaboration]);

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
          {!enableCollaboration && hasUnsavedChanges && (
            <span className={styles.unsavedIndicator}>Unsaved changes</span>
          )}
        </div>
        <div className={styles.headerRight}>
          {/* Collaboration indicators */}
          {enableCollaboration && collaboration && (
            <>
              <OfflineIndicator
                status={collaboration.status}
                error={collaboration.error}
                onReconnect={handleReconnect}
              />
              <PresenceList
                users={collaboration.activeUsers}
                currentUserId={user?.id || ''}
                currentUserName={user ? `${user.firstName} ${user.lastName}` : 'You'}
              />
            </>
          )}

          {/* Action buttons */}
          {onSave && !enableCollaboration && (
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

      {/* Typing indicators */}
      {enableCollaboration && collaboration && collaboration.activeUsers.length > 0 && (
        <div className={styles.typingIndicatorContainer}>
          <TypingIndicator
            users={collaboration.activeUsers}
            currentUserId={user?.id || ''}
          />
        </div>
      )}

      {/* Editor container */}
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

        {/* Collaborative editor or standard textarea */}
        {enableCollaboration && user ? (
          <CollaborativeEditor
            letterId={letterId}
            userId={user.id}
            userName={`${user.firstName} ${user.lastName}`}
            initialContent={content}
            placeholder="Your demand letter will appear here. Click 'Generate' to create an initial draft based on the analyzed documents."
            disabled={isProcessing}
            onContentChange={handleContentChange}
          />
        ) : (
          <textarea
            className={styles.editor}
            value={localContent}
            onChange={handleChange}
            placeholder="Your demand letter will appear here. Click 'Generate' to create an initial draft based on the analyzed documents."
            disabled={isProcessing}
          />
        )}
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

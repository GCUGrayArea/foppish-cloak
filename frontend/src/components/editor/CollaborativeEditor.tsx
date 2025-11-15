/**
 * CollaborativeEditor Component
 *
 * Yjs-enabled text editor for real-time collaborative editing
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useTypingTimeout } from '../../lib/collaboration/awareness-hooks';
import type { CursorPosition, SelectionRange } from '../../types/collaboration';
import styles from './CollaborativeEditor.module.css';

export interface CollaborativeEditorProps {
  letterId: string;
  userId: string;
  userName: string;
  initialContent?: string;
  placeholder?: string;
  disabled?: boolean;
  onContentChange?: (content: string) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  letterId,
  userId,
  userName,
  initialContent = '',
  placeholder = 'Start typing...',
  disabled = false,
  onContentChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(initialContent);
  const isRemoteUpdateRef = useRef(false);

  // Use collaboration hook
  const {
    status,
    error,
    ytext,
    updateCursor,
    updateSelection,
    setTyping,
  } = useCollaboration({
    letterId,
    userId,
    userName,
    autoConnect: true,
  });

  // Auto-clear typing indicator after 2 seconds
  const markTyping = useTypingTimeout(setTyping, 2000);

  // Sync Yjs text to textarea on changes
  useEffect(() => {
    if (!ytext) return;

    // Initialize with existing content if any
    if (ytext.length === 0 && initialContent) {
      ytext.insert(0, initialContent);
    }

    const handleYTextChange = () => {
      const newContent = ytext.toString();

      // Mark as remote update to prevent echo
      isRemoteUpdateRef.current = true;

      setLocalContent(newContent);

      // Notify parent component
      if (onContentChange) {
        onContentChange(newContent);
      }

      // Reset flag on next tick
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 0);
    };

    // Listen for Yjs changes
    ytext.observe(handleYTextChange);

    // Initial sync
    handleYTextChange();

    return () => {
      ytext.unobserve(handleYTextChange);
    };
  }, [ytext, initialContent, onContentChange]);

  // Handle local text changes
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;

      // Skip if this is a remote update
      if (isRemoteUpdateRef.current) {
        return;
      }

      if (!ytext) {
        // Fallback to local state if Yjs not connected
        setLocalContent(newContent);
        if (onContentChange) {
          onContentChange(newContent);
        }
        return;
      }

      // Calculate diff and apply to Yjs
      const oldContent = ytext.toString();

      // Simple diff: find first changed character
      let i = 0;
      while (i < Math.min(oldContent.length, newContent.length) && oldContent[i] === newContent[i]) {
        i++;
      }

      // Find end of change
      let j = 0;
      while (
        j < Math.min(oldContent.length - i, newContent.length - i) &&
        oldContent[oldContent.length - 1 - j] === newContent[newContent.length - 1 - j]
      ) {
        j++;
      }

      const deleteLength = oldContent.length - i - j;
      const insertText = newContent.slice(i, newContent.length - j);

      // Apply changes to Yjs
      ytext.delete(i, deleteLength);
      if (insertText.length > 0) {
        ytext.insert(i, insertText);
      }

      // Mark as typing
      markTyping();
    },
    [ytext, onContentChange, markTyping]
  );

  // Update cursor position
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // Calculate line and column
    const textBefore = textarea.value.substring(0, selectionStart);
    const lines = textBefore.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    // Update cursor position
    const cursor: CursorPosition = {
      line,
      column,
      position: selectionStart,
    };
    updateCursor(cursor);

    // Update selection if different from cursor
    if (selectionStart !== selectionEnd) {
      const selection: SelectionRange = {
        start: selectionStart,
        end: selectionEnd,
      };
      updateSelection(selection);
    } else {
      updateSelection(null);
    }
  }, [updateCursor, updateSelection]);

  // Track selection changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('select', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('select', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return (
    <div className={styles.container}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={localContent}
        onChange={handleTextChange}
        placeholder={placeholder}
        disabled={disabled || status === 'connecting'}
        data-connection-status={status}
      />
      {error && (
        <div className={styles.error}>
          Connection error: {error.message}
        </div>
      )}
    </div>
  );
};

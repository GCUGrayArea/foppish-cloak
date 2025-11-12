/**
 * TemplateContent Component
 *
 * Rich text editor for template content with variable insertion support
 */

import React, { useRef, useEffect } from 'react';
import styles from './TemplateContent.module.css';

interface TemplateContentProps {
  value: string;
  onChange: (value: string) => void;
  onInsertVariable?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TemplateContent: React.FC<TemplateContentProps> = ({
  value,
  onChange,
  onInsertVariable,
  placeholder = 'Enter template content...',
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && !isUpdating.current) {
      const formatted = formatContent(value);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && !disabled) {
      isUpdating.current = true;
      const content = editorRef.current.innerHTML;
      onChange(stripFormatting(content));
      setTimeout(() => {
        isUpdating.current = false;
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent certain formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      // Allow basic formatting
      const allowedKeys = ['b', 'i', 'u', 'z', 'y', 'a', 'c', 'v', 'x'];
      if (!allowedKeys.includes(e.key.toLowerCase())) {
        // Check for variable insertion shortcut
        if (e.key === '{' && onInsertVariable) {
          e.preventDefault();
          onInsertVariable();
        }
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => document.execCommand('bold')}
          disabled={disabled}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => document.execCommand('italic')}
          disabled={disabled}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => document.execCommand('underline')}
          disabled={disabled}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <div className={styles.toolbarDivider} />
        {onInsertVariable && (
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={onInsertVariable}
            disabled={disabled}
            title="Insert Variable (Ctrl+{)"
          >
            {'{{ }}'}
          </button>
        )}
      </div>
      <div
        ref={editorRef}
        className={`${styles.editor} ${disabled ? styles.disabled : ''}`}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};

/**
 * Format content for display (highlight variables)
 */
function formatContent(content: string): string {
  // Highlight template variables
  return content.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="template-variable">{{$1}}</span>'
  );
}

/**
 * Strip HTML formatting but preserve text and variables
 */
function stripFormatting(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Convert formatted variables back to plain text
  const variables = temp.querySelectorAll('.template-variable');
  variables.forEach((varEl) => {
    const textNode = document.createTextNode(varEl.textContent || '');
    varEl.parentNode?.replaceChild(textNode, varEl);
  });

  return temp.textContent || '';
}

import React, { useEffect } from 'react';
import { Button } from '../ui/Button';
import styles from './HelpPanel.module.css';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string | null;
}

const HELP_CONTENT = {
  index: {
    title: 'Help & Documentation',
    content: `
      <h2>Welcome to Help</h2>
      <p>Find answers to common questions and learn how to use all features.</p>

      <h3>Quick Links</h3>
      <ul>
        <li><a href="#getting-started">Getting Started</a> - New to the system? Start here!</li>
        <li><a href="#keyboard-shortcuts">Keyboard Shortcuts</a> - Speed up your workflow</li>
        <li><a href="#faq">FAQ</a> - Frequently asked questions</li>
        <li><a href="#troubleshooting">Troubleshooting</a> - Common issues and solutions</li>
      </ul>

      <h3>Feature Guides</h3>
      <ul>
        <li><a href="#authentication">Authentication</a> - Login, registration, passwords</li>
        <li><a href="#document-upload">Document Upload</a> - Uploading and managing files</li>
        <li><a href="#templates">Templates</a> - Creating and editing templates</li>
        <li><a href="#demand-letters">Demand Letters</a> - Complete workflow guide</li>
        <li><a href="#collaboration">Collaboration</a> - Working together in real-time</li>
        <li><a href="#export">Export</a> - Exporting to Word and PDF</li>
      </ul>

      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li><kbd>?</kbd> - Open this help panel</li>
        <li><kbd>Ctrl/Cmd+S</kbd> - Save</li>
        <li><kbd>Ctrl/Cmd+G</kbd> - Generate letter</li>
        <li><kbd>Ctrl/Cmd+E</kbd> - Export</li>
        <li><a href="#keyboard-shortcuts">See all shortcuts →</a></li>
      </ul>
    `,
  },
  'getting-started': {
    title: 'Getting Started',
    content: `
      <h2>Getting Started</h2>
      <p>Welcome! This guide will help you create your first demand letter in under 10 minutes.</p>

      <h3>Quick Steps</h3>
      <ol>
        <li><strong>Create an account</strong> - Register using your invitation link</li>
        <li><strong>Upload documents</strong> - Add source documents (reports, records, etc.)</li>
        <li><strong>Create a demand letter</strong> - Select template and documents</li>
        <li><strong>Review AI analysis</strong> - Check extracted facts</li>
        <li><strong>Generate letter</strong> - AI creates first draft</li>
        <li><strong>Refine and finalize</strong> - Edit and improve as needed</li>
        <li><strong>Export</strong> - Download as Word or PDF</li>
      </ol>

      <p><em>For detailed instructions, see the complete Getting Started guide in the documentation.</em></p>
    `,
  },
  'keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    content: `
      <h2>Keyboard Shortcuts</h2>

      <h3>Global</h3>
      <ul>
        <li><kbd>?</kbd> - Open/close help panel</li>
        <li><kbd>Ctrl/Cmd+S</kbd> - Save</li>
        <li><kbd>Ctrl/Cmd+K</kbd> - Global search</li>
      </ul>

      <h3>Demand Letter Workspace</h3>
      <ul>
        <li><kbd>Ctrl/Cmd+G</kbd> - Generate letter</li>
        <li><kbd>Ctrl/Cmd+R</kbd> - Request refinement</li>
        <li><kbd>Ctrl/Cmd+E</kbd> - Export letter</li>
        <li><kbd>Ctrl/Cmd+Enter</kbd> - Approve version</li>
      </ul>

      <h3>Text Editing</h3>
      <ul>
        <li><kbd>Ctrl/Cmd+B</kbd> - Bold</li>
        <li><kbd>Ctrl/Cmd+I</kbd> - Italic</li>
        <li><kbd>Ctrl/Cmd+U</kbd> - Underline</li>
        <li><kbd>Ctrl/Cmd+Z</kbd> - Undo</li>
        <li><kbd>Ctrl/Cmd+Y</kbd> - Redo</li>
      </ul>

      <p><em>See complete shortcuts reference in documentation.</em></p>
    `,
  },
  faq: {
    title: 'Frequently Asked Questions',
    content: `
      <h2>FAQ</h2>

      <h3>General</h3>
      <p><strong>How long does document analysis take?</strong><br>
      Typically 20-30 seconds for a 10-page document.</p>

      <p><strong>How accurate is the AI?</strong><br>
      Highly accurate for standard information. Always review before generating.</p>

      <p><strong>Can I edit generated letters?</strong><br>
      Yes, full text editing is available.</p>

      <h3>Documents</h3>
      <p><strong>What file formats are supported?</strong><br>
      PDF (.pdf), Word (.docx), and plain text (.txt).</p>

      <p><strong>How large can files be?</strong><br>
      Maximum 50MB per file.</p>

      <h3>Export</h3>
      <p><strong>Should I export to Word or PDF?</strong><br>
      Use Word for further editing, PDF for final delivery.</p>

      <p><em>See complete FAQ in documentation for more answers.</em></p>
    `,
  },
  troubleshooting: {
    title: 'Troubleshooting',
    content: `
      <h2>Troubleshooting</h2>

      <h3>Common Issues</h3>

      <p><strong>Can't log in</strong></p>
      <ul>
        <li>Check Caps Lock is off</li>
        <li>Verify email and password</li>
        <li>Try password reset</li>
      </ul>

      <p><strong>Upload fails</strong></p>
      <ul>
        <li>Check file size (max 50MB)</li>
        <li>Verify file format (PDF, DOCX, TXT)</li>
        <li>Check internet connection</li>
      </ul>

      <p><strong>Analysis taking too long</strong></p>
      <ul>
        <li>Wait up to 60 seconds</li>
        <li>Refresh if stuck</li>
        <li>Try fewer documents</li>
      </ul>

      <p><strong>Export button disabled</strong></p>
      <ul>
        <li>Save current changes first</li>
        <li>Wait for AI operations to complete</li>
      </ul>

      <p><em>See complete troubleshooting guide for detailed solutions.</em></p>
    `,
  },
};

export const HelpPanel: React.FC<HelpPanelProps> = ({
  isOpen,
  onClose,
  currentPage,
}) => {
  const page = (currentPage && HELP_CONTENT[currentPage as keyof typeof HELP_CONTENT])
    || HELP_CONTENT.index;

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <aside className={styles.panel} role="dialog" aria-label="Help Panel">
        <header className={styles.header}>
          <h2 className={styles.title}>{page.title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close help panel"
            className={styles.closeButton}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M6 6l8 8m0-8l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </header>

        <div className={styles.content}>
          <div
            dangerouslySetInnerHTML={{ __html: page.content }}
            className={styles.htmlContent}
          />

          <footer className={styles.footer}>
            <p>
              <strong>Need more help?</strong><br />
              Contact your firm administrator or reach out to support.
            </p>
            <p className={styles.hint}>
              Press <kbd>?</kbd> to toggle this help panel
            </p>
          </footer>
        </div>
      </aside>
    </>
  );
};

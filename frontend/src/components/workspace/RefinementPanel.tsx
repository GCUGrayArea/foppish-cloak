/**
 * RefinementPanel Component
 *
 * Interface for AI-powered letter refinement with feedback input
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import styles from './RefinementPanel.module.css';

export interface RefinementPanelProps {
  onRefine: (feedback: string, sections?: string[]) => void;
  isRefining?: boolean;
  refinementCount?: number;
}

export const RefinementPanel: React.FC<RefinementPanelProps> = ({
  onRefine,
  isRefining = false,
  refinementCount = 0,
}) => {
  const [feedback, setFeedback] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onRefine(
        feedback.trim(),
        selectedSections.length > 0 ? selectedSections : undefined
      );
      setFeedback('');
      setSelectedSections([]);
    }
  };

  const toggleSection = (section: string) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const availableSections = [
    'Introduction',
    'Facts',
    'Legal Basis',
    'Damages',
    'Demand',
    'Conclusion',
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Refinement</h2>
        {refinementCount > 0 && (
          <span className={styles.count}>
            {refinementCount} refinement{refinementCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.instructions}>
          <p>
            Provide feedback to refine the letter. Be specific about what
            changes you'd like to see.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="feedback" className={styles.label}>
              Feedback
            </label>
            <textarea
              id="feedback"
              className={styles.textarea}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Example: Make the tone more formal and add emphasis on the timeline of events."
              rows={6}
              disabled={isRefining}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Target Sections (optional)
            </label>
            <div className={styles.sectionTags}>
              {availableSections.map((section) => (
                <SectionTag
                  key={section}
                  section={section}
                  isSelected={selectedSections.includes(section)}
                  onToggle={() => toggleSection(section)}
                  disabled={isRefining}
                />
              ))}
            </div>
            <p className={styles.hint}>
              Select specific sections to refine, or leave empty to refine
              the entire letter.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isRefining}
            disabled={!feedback.trim() || isRefining}
          >
            {isRefining ? 'Refining...' : 'Refine Letter'}
          </Button>
        </form>

        <div className={styles.suggestions}>
          <h3 className={styles.suggestionsTitle}>Suggestions</h3>
          <div className={styles.suggestionsList}>
            <SuggestionButton
              label="Make more formal"
              onClick={() => setFeedback('Make the tone more formal and professional.')}
              disabled={isRefining}
            />
            <SuggestionButton
              label="Strengthen demands"
              onClick={() =>
                setFeedback('Strengthen the demand section with more forceful language.')
              }
              disabled={isRefining}
            />
            <SuggestionButton
              label="Add legal citations"
              onClick={() =>
                setFeedback('Add relevant legal citations to support the claims.')
              }
              disabled={isRefining}
            />
            <SuggestionButton
              label="Simplify language"
              onClick={() =>
                setFeedback('Simplify the language to be more accessible.')
              }
              disabled={isRefining}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SectionTagProps {
  section: string;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const SectionTag: React.FC<SectionTagProps> = ({
  section,
  isSelected,
  onToggle,
  disabled,
}) => {
  return (
    <button
      type="button"
      className={`${styles.sectionTag} ${isSelected ? styles.selected : ''}`}
      onClick={onToggle}
      disabled={disabled}
    >
      {section}
    </button>
  );
};

interface SuggestionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const SuggestionButton: React.FC<SuggestionButtonProps> = ({
  label,
  onClick,
  disabled,
}) => {
  return (
    <button
      type="button"
      className={styles.suggestionButton}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

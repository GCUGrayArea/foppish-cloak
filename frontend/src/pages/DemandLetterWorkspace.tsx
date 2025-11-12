/**
 * DemandLetterWorkspace Page
 *
 * Main workspace for creating and editing demand letters with multi-panel layout
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DocumentPanel } from '../components/workspace/DocumentPanel';
import { AnalysisPanel } from '../components/workspace/AnalysisPanel';
import { LetterEditor } from '../components/workspace/LetterEditor';
import { RefinementPanel } from '../components/workspace/RefinementPanel';
import { WorkflowStatus } from '../components/workspace/WorkflowStatus';
import { Button } from '../components/ui/Button';
import {
  useDemandLetter,
  useUpdateDemandLetter,
  useGenerateLetter,
  useRefineLetter,
} from '../hooks/useDemandLetter';
import { useWorkflowStatus } from '../hooks/useWorkflowStatus';
import { useApi } from '../hooks/useApi';
import styles from './DemandLetterWorkspace.module.css';

export const DemandLetterWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();

  const { data: letter, isLoading: isLoadingLetter } = useDemandLetter(id);
  const { data: workflowStatus } = useWorkflowStatus(id);
  const updateMutation = useUpdateDemandLetter(id || '');
  const generateMutation = useGenerateLetter();
  const refineMutation = useRefineLetter();

  if (isLoadingLetter) {
    return <LoadingState />;
  }

  if (!letter || !id) {
    return <ErrorState message="Demand letter not found" />;
  }

  const handleContentChange = (_content: string) => {
    // Content changes are debounced in the editor
    // Currently not used as auto-save is handled in the editor
  };

  const handleSave = () => {
    if (letter.currentContent) {
      updateMutation.mutate(letter.currentContent);
    }
  };

  const handleGenerate = () => {
    generateMutation.mutate({
      letterId: id,
      templateId: letter.templateId,
      tone: 'formal',
    });
  };

  const handleRefine = (feedback: string, sections?: string[]) => {
    refineMutation.mutate({
      letterId: id,
      feedback,
      sections,
    });
  };

  const handleExport = async (format: 'word' | 'pdf') => {
    try {
      const response = await api.get<Blob>(
        `/demand-letters/${id}/export/${format}`,
        {
          headers: {
            Accept:
              format === 'word'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf',
          },
        }
      );

      const blob = new Blob([response], {
        type:
          format === 'word'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${letter.title}.${format === 'word' ? 'docx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const isGenerating =
    generateMutation.isPending ||
    workflowStatus?.state === 'generating';
  const isRefining =
    refineMutation.isPending || workflowStatus?.state === 'refining';
  const isAnalyzing = workflowStatus?.state === 'analyzing';

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/demand-letters')}
          >
            ← Back
          </Button>
          <h1 className={styles.title}>{letter.title}</h1>
        </div>
        <div className={styles.headerRight}>
          {workflowStatus && <WorkflowStatus status={workflowStatus} />}
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={styles.panel}>
            <DocumentPanel
              documents={letter.documents}
              isLoading={isLoadingLetter}
            />
          </div>
          <div className={styles.panel}>
            <AnalysisPanel
              extractedData={letter.extractedData}
              isAnalyzing={isAnalyzing}
            />
          </div>
        </div>

        <div className={styles.centerColumn}>
          <LetterEditor
            content={letter.currentContent || ''}
            isGenerating={isGenerating}
            isRefining={isRefining}
            onContentChange={handleContentChange}
            onSave={handleSave}
            onGenerate={handleGenerate}
            onExport={handleExport}
          />
        </div>

        <div className={styles.rightColumn}>
          <RefinementPanel
            onRefine={handleRefine}
            isRefining={isRefining}
            refinementCount={letter.generationMetadata.refinementCount}
          />
        </div>
      </div>
    </div>
  );
};

const LoadingState: React.FC = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p>Loading workspace...</p>
    </div>
  );
};

interface ErrorStateProps {
  message: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.errorContainer}>
      <h2>Error</h2>
      <p>{message}</p>
      <Button onClick={() => navigate('/demand-letters')}>
        Go to Demand Letters
      </Button>
    </div>
  );
};

/**
 * TemplateEditor Page
 *
 * Create or edit templates with rich text editor and preview
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useRollbackTemplate,
} from '../hooks/useTemplates';
import { TemplateForm } from '../components/templates/TemplateForm';
import { TemplateContent } from '../components/templates/TemplateContent';
import { VariableInserter } from '../components/templates/VariableInserter';
import { TemplatePreview } from '../components/templates/TemplatePreview';
import { VersionHistory } from '../components/templates/VersionHistory';
import { Button } from '../components/ui/Button';
import styles from './TemplateEditor.module.css';

export const TemplateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEditing = !!id && id !== 'new';

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) {
      navigate('/templates');
    }
  }, [isAdmin, navigate]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showVariableInserter, setShowVariableInserter] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing template if editing
  const { data: template, isLoading } = useTemplate(isEditing ? id : undefined);

  // Mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate(id || '');
  const rollbackMutation = useRollbackTemplate(id || '');

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setIsDefault(template.isDefault);
      setContent(template.currentVersion?.content || '');
    }
  }, [template]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!content.trim()) {
      newErrors.content = 'Template content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
          isDefault,
        });
      }
      navigate('/templates');
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setContent((prev) => prev + variable);
  };

  const handleRollback = async (versionId: string) => {
    try {
      const updatedTemplate = await rollbackMutation.mutateAsync({ versionId });
      setContent(updatedTemplate.currentVersion?.content || '');
    } catch (error) {
      console.error('Failed to rollback:', error);
    }
  };

  if (!isAdmin) return null;

  if (isLoading && isEditing) {
    return <div className={styles.loading}>Loading template...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{isEditing ? 'Edit Template' : 'Create Template'}</h1>
          <p className={styles.subtitle}>
            {isEditing
              ? `Editing: ${template?.name}`
              : 'Create a new demand letter template'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={() => navigate('/templates')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.editor}>
          <TemplateForm
            name={name}
            description={description}
            isDefault={isDefault}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onIsDefaultChange={setIsDefault}
            errors={errors}
          />

          <div className={styles.contentSection}>
            <div className={styles.sectionHeader}>
              <h2>Template Content</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
            <TemplateContent
              value={content}
              onChange={setContent}
              onInsertVariable={() => setShowVariableInserter(true)}
            />
            {errors.content && (
              <div className={styles.errorMessage}>{errors.content}</div>
            )}
          </div>

          {showPreview && (
            <TemplatePreview content={content} />
          )}
        </div>

        {isEditing && template?.versionHistory && (
          <aside className={styles.sidebar}>
            <VersionHistory
              versions={template.versionHistory}
              currentVersionId={template.currentVersion?.id || ''}
              onRollback={handleRollback}
              isRollingBack={rollbackMutation.isPending}
            />
          </aside>
        )}
      </div>

      <VariableInserter
        open={showVariableInserter}
        onClose={() => setShowVariableInserter(false)}
        onInsert={handleInsertVariable}
      />
    </div>
  );
};

/**
 * TemplateListTable Component
 *
 * Displays list of templates in a table format with actions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import type { TemplateListItem } from '../../types/template';
import styles from './TemplateListTable.module.css';

interface TemplateListTableProps {
  templates: TemplateListItem[];
  onDelete: (id: string) => void;
}

export const TemplateListTable: React.FC<TemplateListTableProps> = ({
  templates,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (templates.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No templates found.</p>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => navigate('/templates/new')}
            style={{ marginTop: 'var(--spacing-md)' }}
          >
            Create First Template
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Version</th>
            <th>Variables</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id}>
              <td>
                <div className={styles.nameCell}>
                  <span className={styles.templateName}>{template.name}</span>
                  {template.isDefault && (
                    <span className={styles.defaultBadge}>Default</span>
                  )}
                </div>
              </td>
              <td className={styles.description}>
                {template.description || '—'}
              </td>
              <td>
                {template.currentVersion
                  ? `v${template.currentVersion.versionNumber}`
                  : '—'}
              </td>
              <td>
                {template.currentVersion
                  ? template.currentVersion.variableCount
                  : 0}
              </td>
              <td>{formatDate(template.createdAt)}</td>
              <td>
                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/templates/${template.id}`)}
                  >
                    View
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/templates/${template.id}/edit`)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(template.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

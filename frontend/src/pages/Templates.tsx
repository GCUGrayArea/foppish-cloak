/**
 * Templates Page
 *
 * Displays list of demand letter templates with search and filtering
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTemplates, useDeleteTemplate } from '../hooks/useTemplates';
import { TemplateListTable } from '../components/templates/TemplateListTable';
import { DeleteConfirmDialog } from '../components/templates/DeleteConfirmDialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import styles from './Templates.module.css';

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Search and filter state
  const [search, setSearch] = useState('');
  const [showDefaultOnly, setShowDefaultOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Fetch templates with filters
  const { data, isLoading, error } = useTemplates({
    search: search || undefined,
    isDefault: showDefaultOnly ? true : undefined,
    page,
    limit,
  });

  // Delete mutation
  const deleteMutation = useDeleteTemplate();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteClick = (id: string) => {
    const template = data?.templates.find((t: any) => t.id === id);
    if (template) {
      setDeleteTarget({ id, name: template.name });
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Templates</h1>
          <p className={styles.subtitle}>
            Manage demand letter templates for your firm
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => navigate('/templates/new')}
          >
            Create Template
          </Button>
        )}
      </div>

      <div className={styles.filters}>
        <Input
          type="search"
          placeholder="Search templates..."
          value={search}
          onChange={handleSearchChange}
          className={styles.searchInput}
        />
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showDefaultOnly}
            onChange={(e) => {
              setShowDefaultOnly(e.target.checked);
              setPage(1);
            }}
          />
          <span>Show default templates only</span>
        </label>
      </div>

      {isLoading && (
        <div className={styles.loading}>Loading templates...</div>
      )}

      {error && (
        <div className={styles.error}>
          Failed to load templates. Please try again.
        </div>
      )}

      {data && (
        <>
          <TemplateListTable
            templates={data.templates}
            onDelete={handleDeleteClick}
          />

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        templateName={deleteTarget?.name || ''}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

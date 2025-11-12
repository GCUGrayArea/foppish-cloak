/**
 * TemplateForm Component
 *
 * Form for template metadata (name, description, default status)
 */

import React from 'react';
import { Input } from '../ui/Input';
import styles from './TemplateForm.module.css';

interface TemplateFormProps {
  name: string;
  description: string;
  isDefault: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIsDefaultChange: (value: boolean) => void;
  errors?: {
    name?: string;
    description?: string;
  };
  disabled?: boolean;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  name,
  description,
  isDefault,
  onNameChange,
  onDescriptionChange,
  onIsDefaultChange,
  errors,
  disabled = false,
}) => {
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="template-name" className={styles.label}>
          Template Name <span className={styles.required}>*</span>
        </label>
        <Input
          id="template-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Personal Injury Demand Letter"
          disabled={disabled}
          className={errors?.name ? styles.inputError : ''}
        />
        {errors?.name && (
          <div className={styles.errorMessage}>{errors.name}</div>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="template-description" className={styles.label}>
          Description
        </label>
        <textarea
          id="template-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Brief description of this template and when to use it"
          disabled={disabled}
          className={`${styles.textarea} ${
            errors?.description ? styles.inputError : ''
          }`}
          rows={3}
        />
        {errors?.description && (
          <div className={styles.errorMessage}>{errors.description}</div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => onIsDefaultChange(e.target.checked)}
            disabled={disabled}
          />
          <span>Set as default template</span>
        </label>
        <div className={styles.hint}>
          Default templates are suggested first when creating new demand
          letters
        </div>
      </div>
    </div>
  );
};

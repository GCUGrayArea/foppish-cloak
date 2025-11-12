/**
 * TemplatePreview Component
 *
 * Preview template content with sample data substituted for variables
 */

import React, { useMemo } from 'react';
import styles from './TemplatePreview.module.css';

interface TemplatePreviewProps {
  content: string;
  sampleData?: Record<string, string>;
}

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  plaintiff_name: 'John Doe',
  plaintiff_address: '123 Main St, Anytown, ST 12345',
  defendant_name: 'Jane Smith',
  defendant_address: '456 Oak Ave, Other City, ST 67890',
  case_number: '2024-CV-12345',
  incident_date: 'January 15, 2024',
  incident_location: 'Intersection of Main St and Oak Ave',
  total_damages: '$50,000.00',
  medical_expenses: '$25,000.00',
  property_damages: '$10,000.00',
  lost_wages: '$15,000.00',
  demand_amount: '$50,000.00',
  deadline_date: 'March 15, 2024',
  attorney_name: 'Attorney Smith',
  attorney_signature: '[Signature]\nAttorney Smith\nBar #12345',
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  content,
  sampleData,
}) => {
  const previewContent = useMemo(() => {
    const data = { ...DEFAULT_SAMPLE_DATA, ...sampleData };
    let result = content;

    // Replace all variables with sample data
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    // Preserve line breaks
    result = result.replace(/\n/g, '<br />');

    return result;
  }, [content, sampleData]);

  if (!content) {
    return (
      <div className={styles.empty}>
        No content to preview. Add template content to see a preview.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Preview</h3>
        <span className={styles.note}>
          (Sample data shown)
        </span>
      </div>
      <div
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: previewContent }}
      />
    </div>
  );
};

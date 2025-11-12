import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

const cardStyle = {
  padding: 'var(--spacing-xl)',
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-primary)'
};

const FeatureCard: React.FC<{ title: string; description: string; prNumber: string }> = ({
  title,
  description,
  prNumber
}) => (
  <div style={cardStyle}>
    <h3>{title}</h3>
    <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
      {description}
    </p>
    <Button
      variant="outline"
      size="sm"
      style={{ marginTop: 'var(--spacing-md)' }}
      disabled
    >
      Coming in {prNumber}
    </Button>
  </div>
);

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1>Welcome to Demand Letter Generator</h1>
      <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
        Hello, {user?.firstName}! You're logged in as a {user?.role}.
      </p>

      <div style={{
        marginTop: 'var(--spacing-2xl)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--spacing-lg)'
      }}>
        <FeatureCard
          title="Templates"
          description="Manage demand letter templates"
          prNumber="PR-017"
        />
        <FeatureCard
          title="Documents"
          description="Upload and analyze documents"
          prNumber="PR-016"
        />
        <FeatureCard
          title="Demand Letters"
          description="Create and manage demand letters"
          prNumber="PR-018"
        />
      </div>

      <div style={{
        marginTop: 'var(--spacing-2xl)',
        padding: 'var(--spacing-xl)',
        backgroundColor: 'var(--color-primary-50)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-primary-200)'
      }}>
        <h2>Getting Started</h2>
        <ol style={{
          marginTop: 'var(--spacing-md)',
          marginLeft: 'var(--spacing-lg)',
          listStyle: 'decimal'
        }}>
          <li>Create or upload demand letter templates</li>
          <li>Upload supporting documents for analysis</li>
          <li>Generate demand letters using AI-powered analysis</li>
          <li>Review, edit, and finalize letters</li>
          <li>Export as Word documents or PDFs</li>
        </ol>
      </div>
    </div>
  );
};

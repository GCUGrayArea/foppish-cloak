/**
 * Tests for Documents Page
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Documents } from '../pages/Documents';

// Mock the hooks
vi.mock('../hooks/useDocuments', () => ({
  useDocuments: vi.fn(() => ({
    data: {
      documents: [],
      total: 0,
      page: 1,
      limit: 10,
    },
    isLoading: false,
    error: null,
  })),
  useUploadDocument: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteDocument: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('Documents Page', () => {
  const renderWithClient = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders page title and subtitle', () => {
    renderWithClient(<Documents />);

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload and manage documents for demand letter generation'
      )
    ).toBeInTheDocument();
  });

  it('renders file drop zone', () => {
    renderWithClient(<Documents />);

    expect(
      screen.getByText(/Drag and drop files here/i)
    ).toBeInTheDocument();
  });

  it('renders uploaded documents section', () => {
    renderWithClient(<Documents />);

    expect(screen.getByText('Uploaded Documents')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    renderWithClient(<Documents />);

    expect(screen.getByText('No documents uploaded yet')).toBeInTheDocument();
  });
});

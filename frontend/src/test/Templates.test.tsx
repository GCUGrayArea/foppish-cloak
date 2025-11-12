/**
 * Tests for Templates page component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Templates } from '../pages/Templates';
import * as useAuthModule from '../hooks/useAuth';
import * as useTemplatesModule from '../hooks/useTemplates';

// Mock hooks
vi.mock('../hooks/useAuth');
vi.mock('../hooks/useTemplates');

const mockUser = {
  id: '123',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin' as const,
  firmId: 'firm-123',
};

const mockTemplates = {
  templates: [
    {
      id: '1',
      name: 'Test Template',
      description: 'Test description',
      isDefault: true,
      currentVersion: {
        id: 'v1',
        versionNumber: 1,
        variableCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
      },
      createdBy: {
        id: '123',
        name: 'Admin User',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Templates Page', () => {
  it('renders templates list', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useTemplatesModule.useDeleteTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders(<Templates />);

    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });
  });

  it('shows create button for admin users', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useTemplatesModule.useDeleteTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders(<Templates />);

    await waitFor(() => {
      expect(screen.getByText('Create Template')).toBeInTheDocument();
    });
  });
});

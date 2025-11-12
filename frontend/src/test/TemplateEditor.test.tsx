/**
 * Tests for TemplateEditor page component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TemplateEditor } from '../pages/TemplateEditor';
import * as useAuthModule from '../hooks/useAuth';
import * as useTemplatesModule from '../hooks/useTemplates';

// Mock hooks
vi.mock('../hooks/useAuth');
vi.mock('../hooks/useTemplates', () => ({
  useTemplate: vi.fn(),
  useCreateTemplate: vi.fn(),
  useUpdateTemplate: vi.fn(),
  useRollbackTemplate: vi.fn(),
  useTemplates: vi.fn(),
  useDeleteTemplate: vi.fn(),
}));

const mockAdminUser = {
  id: '123',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin' as const,
  firmId: 'firm-123',
};

const mockNonAdminUser = {
  ...mockAdminUser,
  role: 'attorney' as const,
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

describe('TemplateEditor Page', () => {
  it('renders for admin users', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    // Mock the template hooks
    vi.mocked(useTemplatesModule.useTemplate).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useTemplatesModule.useCreateTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    } as any);

    vi.mocked(useTemplatesModule.useUpdateTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    } as any);

    vi.mocked(useTemplatesModule.useRollbackTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    } as any);

    renderWithProviders(<TemplateEditor />);

    // Check for the heading specifically (not the button)
    expect(screen.getByRole('heading', { name: 'Create Template' })).toBeInTheDocument();
  });

  it('does not render for non-admin users', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockNonAdminUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    // Mock the template hooks (needed even though component redirects)
    vi.mocked(useTemplatesModule.useTemplate).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useTemplatesModule.useCreateTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    } as any);

    vi.mocked(useTemplatesModule.useUpdateTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    } as any);

    vi.mocked(useTemplatesModule.useRollbackTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
    } as any);

    const { container } = renderWithProviders(<TemplateEditor />);

    // Should render nothing (redirect happens)
    expect(container.firstChild).toBeNull();
  });
});

/**
 * DemandLetterWorkspace Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DemandLetterWorkspace } from '../../pages/DemandLetterWorkspace';
import * as useDemandLetterHook from '../../hooks/useDemandLetter';
import * as useWorkflowStatusHook from '../../hooks/useWorkflowStatus';
import * as useApiHook from '../../hooks/useApi';
import type { DemandLetterDetails, WorkflowStatus } from '../../types/demand-letter';

// Mock the hooks
vi.mock('../../hooks/useDemandLetter');
vi.mock('../../hooks/useWorkflowStatus');
vi.mock('../../hooks/useApi');

const mockLetter: DemandLetterDetails = {
  id: 'letter-1',
  firmId: 'firm-1',
  createdBy: 'user-1',
  title: 'Test Demand Letter',
  status: 'draft',
  workflowState: 'draft',
  currentContent: 'Test letter content',
  extractedData: {
    parties: [
      {
        type: 'plaintiff',
        name: 'John Doe',
      },
    ],
    incident: {
      date: '2024-01-15',
      location: 'New York, NY',
      description: 'Car accident',
    },
  },
  generationMetadata: {
    refinementCount: 0,
  },
  documents: [
    {
      id: 'doc-1',
      filename: 'accident-report.pdf',
      uploadedAt: '2024-01-20T10:00:00Z',
    },
  ],
  revisions: [],
  createdAt: '2024-01-20T10:00:00Z',
};

const mockWorkflowStatus: WorkflowStatus = {
  letterId: 'letter-1',
  state: 'draft',
  status: 'draft',
  progress: {
    documentsAnalyzed: 1,
    totalDocuments: 1,
    generationComplete: false,
    refinementCount: 0,
  },
};

describe('DemandLetterWorkspace', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Mock API client
    vi.mocked(useApiHook.useApi).mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
    } as any);
  });

  const renderWorkspace = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/demand-letters/letter-1']}>
          <Routes>
            <Route
              path="/demand-letters/:id"
              element={<DemandLetterWorkspace />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(useDemandLetterHook.useDemandLetter).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(useWorkflowStatusHook.useWorkflowStatus).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    renderWorkspace();

    expect(screen.getByText(/loading workspace/i)).toBeInTheDocument();
  });

  it('renders workspace with all panels when data is loaded', async () => {
    vi.mocked(useDemandLetterHook.useDemandLetter).mockReturnValue({
      data: mockLetter,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useWorkflowStatusHook.useWorkflowStatus).mockReturnValue({
      data: mockWorkflowStatus,
      isLoading: false,
    } as any);

    vi.mocked(useDemandLetterHook.useUpdateDemandLetter).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDemandLetterHook.useGenerateLetter).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDemandLetterHook.useRefineLetter).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByText(mockLetter.title)).toBeInTheDocument();
    });

    // Check for panel titles
    expect(screen.getByText('Source Documents')).toBeInTheDocument();
    expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    expect(screen.getByText('Demand Letter')).toBeInTheDocument();
    expect(screen.getByText('Refinement')).toBeInTheDocument();
  });

  it('displays document panel with uploaded files', async () => {
    vi.mocked(useDemandLetterHook.useDemandLetter).mockReturnValue({
      data: mockLetter,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useWorkflowStatusHook.useWorkflowStatus).mockReturnValue({
      data: mockWorkflowStatus,
      isLoading: false,
    } as any);

    vi.mocked(useDemandLetterHook.useUpdateDemandLetter).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDemandLetterHook.useGenerateLetter).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDemandLetterHook.useRefineLetter).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByText('accident-report.pdf')).toBeInTheDocument();
    });
  });

  it('shows error state when letter is not found', () => {
    vi.mocked(useDemandLetterHook.useDemandLetter).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    } as any);

    vi.mocked(useWorkflowStatusHook.useWorkflowStatus).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    renderWorkspace();

    expect(screen.getByText(/demand letter not found/i)).toBeInTheDocument();
  });
});

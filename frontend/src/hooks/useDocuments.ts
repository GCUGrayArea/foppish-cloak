/**
 * React Query hooks for document operations
 *
 * Provides data fetching, mutations, and cache management for documents
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../lib/api-client';
import type {
  DocumentListResponse,
  DocumentDetail,
  DocumentQueryParams,
} from '../types/document';

/**
 * Query key factory for documents
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params: DocumentQueryParams) => [...documentKeys.lists(), params] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

/**
 * Hook to fetch list of documents
 */
export function useDocuments(params: DocumentQueryParams = {}) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: async () => {
      const apiClient = getApiClient();
      const queryParams = new URLSearchParams();

      if (params.fileType) {
        queryParams.append('fileType', params.fileType);
      }
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.virusScanStatus) {
        queryParams.append('virusScanStatus', params.virusScanStatus);
      }

      const response = await apiClient.get<DocumentListResponse>(
        `/documents?${queryParams.toString()}`
      );
      return response;
    },
  });
}

/**
 * Hook to fetch a single document by ID
 */
export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: documentKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Document ID is required');
      const apiClient = getApiClient();
      const response = await apiClient.get<DocumentDetail>(`/documents/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

/**
 * Hook to get download URL for a document
 */
export function useDocumentDownloadUrl(id: string | undefined) {
  return useQuery({
    queryKey: [...documentKeys.detail(id || ''), 'download'],
    queryFn: async () => {
      if (!id) throw new Error('Document ID is required');
      const apiClient = getApiClient();
      const response = await apiClient.get<{ downloadUrl: string }>(
        `/documents/${id}/download`
      );
      return response.downloadUrl;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes (URLs expire in 1 hour)
  });
}

/**
 * Upload a file with progress tracking
 * Uses XMLHttpRequest for progress events
 */
function uploadFileWithProgress(
  file: File,
  onProgress: (progress: number) => void,
  abortController: AbortController
): Promise<DocumentDetail> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response as DocumentDetail);
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Setup abort
    abortController.signal.addEventListener('abort', () => {
      xhr.abort();
    });

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);

    // Get auth token
    const token = localStorage.getItem('accessToken');
    if (!token) {
      reject(new Error('Not authenticated'));
      return;
    }

    // Send request
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    xhr.open('POST', `${apiBaseUrl}/documents/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Hook to upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
      abortController,
    }: {
      file: File;
      onProgress: (progress: number) => void;
      abortController: AbortController;
    }) => uploadFileWithProgress(file, onProgress, abortController),
    onSuccess: () => {
      // Invalidate all document lists to refetch with new document
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await getApiClient().delete(`/documents/${id}`);
    },
    onSuccess: () => {
      // Invalidate all document queries
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

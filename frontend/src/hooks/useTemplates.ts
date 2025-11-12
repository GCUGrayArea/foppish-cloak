/**
 * React Query hooks for template operations
 *
 * Provides data fetching, mutations, and cache management for templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../lib/api-client';
import type {
  TemplateListResponse,
  TemplateDetail,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  RollbackTemplateRequest,
  TemplateQueryParams,
} from '../types/template';

/**
 * Query key factory for templates
 */
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params: TemplateQueryParams) => [...templateKeys.lists(), params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

/**
 * Hook to fetch list of templates
 */
export function useTemplates(params: TemplateQueryParams = {}) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: async () => {
      const apiClient = getApiClient();
      const queryParams = new URLSearchParams();
      if (params.isDefault !== undefined) {
        queryParams.append('isDefault', params.isDefault.toString());
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

      const response = await apiClient.get<TemplateListResponse>(
        `/templates?${queryParams.toString()}`
      );
      return response;
    },
  });
}

/**
 * Hook to fetch a single template by ID
 */
export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Template ID is required');
      const apiClient = getApiClient();
      const response = await apiClient.get<TemplateDetail>(`/templates/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateRequest) => {
      const apiClient = getApiClient();
      const response = await apiClient.post<TemplateDetail>('/templates', data);
      return response;
    },
    onSuccess: () => {
      // Invalidate all template lists to refetch with new template
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing template
 */
export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTemplateRequest) => {
      const apiClient = getApiClient();
      const response = await apiClient.put<TemplateDetail>(
        `/templates/${id}`,
        data
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate lists and update detail cache
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.setQueryData(templateKeys.detail(id), data);
    },
  });
}

/**
 * Hook to rollback template to a previous version
 */
export function useRollbackTemplate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RollbackTemplateRequest) => {
      const apiClient = getApiClient();
      const response = await apiClient.post<TemplateDetail>(
        `/templates/${id}/rollback`,
        data
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate lists and update detail cache
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.setQueryData(templateKeys.detail(id), data);
    },
  });
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const apiClient = getApiClient();
      await apiClient.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      // Invalidate all template queries
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

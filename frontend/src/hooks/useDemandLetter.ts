/**
 * useDemandLetter Hook
 *
 * Manages demand letter CRUD operations and workflow actions
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import type {
  DemandLetterDetails,
  CreateDemandLetterRequest,
  GenerateDemandLetterRequest,
  RefineDemandLetterRequest,
  ListDemandLettersResponse,
  ListDemandLettersQuery,
} from '../types/demand-letter';

/**
 * Query key factory for demand letters
 */
export const demandLetterKeys = {
  all: ['demand-letters'] as const,
  lists: () => [...demandLetterKeys.all, 'list'] as const,
  list: (filters: ListDemandLettersQuery) =>
    [...demandLetterKeys.lists(), filters] as const,
  details: () => [...demandLetterKeys.all, 'detail'] as const,
  detail: (id: string) => [...demandLetterKeys.details(), id] as const,
};

/**
 * Hook to fetch list of demand letters
 */
export function useDemandLetters(query: ListDemandLettersQuery = {}) {
  const api = useApi();

  return useQuery({
    queryKey: demandLetterKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.status) params.append('status', query.status);
      if (query.createdBy) params.append('createdBy', query.createdBy);
      if (query.templateId) params.append('templateId', query.templateId);
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.offset) params.append('offset', query.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/demand-letters?${queryString}`
        : '/demand-letters';

      return api.get<ListDemandLettersResponse>(endpoint);
    },
  });
}

/**
 * Hook to fetch a single demand letter by ID
 */
export function useDemandLetter(letterId: string | undefined) {
  const api = useApi();

  return useQuery({
    queryKey: demandLetterKeys.detail(letterId || ''),
    queryFn: async () => {
      if (!letterId) throw new Error('Letter ID is required');
      return api.get<DemandLetterDetails>(`/demand-letters/${letterId}`);
    },
    enabled: Boolean(letterId),
  });
}

/**
 * Hook to create a new demand letter
 */
export function useCreateDemandLetter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDemandLetterRequest) => {
      return api.post<DemandLetterDetails>('/demand-letters', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demandLetterKeys.lists() });
    },
  });
}

/**
 * Hook to update demand letter content
 */
export function useUpdateDemandLetter(letterId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return api.patch<DemandLetterDetails>(`/demand-letters/${letterId}`, {
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: demandLetterKeys.detail(letterId),
      });
    },
  });
}

/**
 * Hook to generate letter draft
 */
export function useGenerateLetter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateDemandLetterRequest) => {
      return api.post<DemandLetterDetails>(
        `/demand-letters/${data.letterId}/generate`,
        data
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: demandLetterKeys.detail(variables.letterId),
      });
    },
  });
}

/**
 * Hook to refine existing letter
 */
export function useRefineLetter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RefineDemandLetterRequest) => {
      return api.post<DemandLetterDetails>(
        `/demand-letters/${data.letterId}/refine`,
        data
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: demandLetterKeys.detail(variables.letterId),
      });
    },
  });
}

/**
 * Hook to delete a demand letter
 */
export function useDeleteDemandLetter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (letterId: string) => {
      return api.delete(`/demand-letters/${letterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demandLetterKeys.lists() });
    },
  });
}

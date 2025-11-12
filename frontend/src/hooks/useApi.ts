import { getApiClient } from '../lib/api-client';

/**
 * Hook to access the API client instance
 * The API client is automatically configured with authentication
 */
export const useApi = () => {
  return getApiClient();
};

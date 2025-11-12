import { ApiClientError, type RequestOptions } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private setToken: (token: string) => void;
  private clearToken: () => void;
  private refreshTokenFn: () => Promise<string>;

  constructor(
    getToken: () => string | null,
    setToken: (token: string) => void,
    clearToken: () => void,
    refreshTokenFn: () => Promise<string>
  ) {
    this.baseUrl = API_BASE_URL;
    this.getToken = getToken;
    this.setToken = setToken;
    this.clearToken = clearToken;
    this.refreshTokenFn = refreshTokenFn;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'An error occurred';
      let errorCode: string | undefined;
      let errorDetails: Record<string, unknown> | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorCode = errorData.code;
        errorDetails = errorData.details;
      } catch {
        // If response body is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiClientError(
        errorMessage,
        response.status,
        errorCode,
        errorDetails
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json();
    } catch {
      return {} as T;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers);

    // Set default content type if not already set
    if (!headers.has('Content-Type') && fetchOptions.body) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header
    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // If we get a 401 and have a refresh token function, try to refresh
      if (response.status === 401 && !skipAuth && this.refreshTokenFn) {
        try {
          const newToken = await this.refreshTokenFn();
          this.setToken(newToken);

          // Retry the request with the new token
          headers.set('Authorization', `Bearer ${newToken}`);
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });

          return this.handleResponse<T>(retryResponse);
        } catch (refreshError) {
          // If refresh fails, clear token and throw original error
          this.clearToken();
          throw refreshError;
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      // Network error or other non-API error
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Create a singleton instance - will be properly initialized by AuthProvider
let apiClientInstance: ApiClient | null = null;

export const initializeApiClient = (
  getToken: () => string | null,
  setToken: (token: string) => void,
  clearToken: () => void,
  refreshTokenFn: () => Promise<string>
): ApiClient => {
  apiClientInstance = new ApiClient(getToken, setToken, clearToken, refreshTokenFn);
  return apiClientInstance;
};

export const getApiClient = (): ApiClient => {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Make sure AuthProvider is mounted.');
  }
  return apiClientInstance;
};

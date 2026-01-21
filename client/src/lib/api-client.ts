import { getApiUrl } from "@/config/api";

/**
 * Industry-standard API client with automatic auth handling and error interception
 * Handles 401 errors globally and redirects to login
 */
class ApiClient {
  private static instance: ApiClient;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Refresh access token using refresh token (HTTP-only cookie based)
   */
  private async refreshAccessToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(getApiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        // Refresh failed - clear auth and redirect
        this.handleUnauthorized();
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make an authenticated API request
   * Automatically handles 401 errors and token expiration with refresh
   * Uses HTTP-only cookies for authentication
   */
  async fetch(url: string, options: RequestInit = {}, retryCount: number = 0): Promise<Response> {
    const response = await fetch(getApiUrl(url), {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
      },
    });

    // Handle 401 Unauthorized - try to refresh token once
    if (response.status === 401 && retryCount === 0) {
      try {
        await this.refreshAccessToken();
        // Retry the request with refreshed token
        return this.fetch(url, options, retryCount + 1);
      } catch (error) {
        this.handleUnauthorized();
        throw new Error('Unauthorized');
      }
    } else if (response.status === 401) {
      // Already retried, give up
      this.handleUnauthorized();
      throw new Error('Unauthorized');
    }

    return response;
  }

  /**
   * Handle unauthorized access - clear auth and redirect to login
   */
  private handleUnauthorized(): void {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    // Store current location for redirect after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);

    // Redirect to login
    window.location.href = '/login';
  }

  /**
   * Convenience method for GET requests
   */
  async get(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  /**
   * Convenience method for POST requests
   */
  async post(url: string, body?: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Convenience method for PUT requests
   */
  async put(url: string, body?: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();

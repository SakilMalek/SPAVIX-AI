import { getApiUrl } from "@/config/api";

/**
 * Industry-standard API client with automatic auth handling and error interception
 * Handles 401 errors globally and redirects to login
 */
class ApiClient {
  private static instance: ApiClient;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(getApiUrl('/api/token/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.accessToken);
        return data.accessToken;
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
   */
  async fetch(url: string, options: RequestInit = {}, retryCount: number = 0): Promise<Response> {
    let token = localStorage.getItem("token");

    // Check token expiration before making request
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresIn = (payload.exp * 1000) - Date.now();
        
        // If token expires in less than 1 minute, refresh it proactively
        if (expiresIn < 60000 && expiresIn > 0) {
          try {
            token = await this.refreshAccessToken();
          } catch (error) {
            console.error('Proactive token refresh failed', error);
          }
        } else if (expiresIn <= 0) {
          // Token already expired, try to refresh
          try {
            token = await this.refreshAccessToken();
          } catch (error) {
            this.handleUnauthorized();
            throw new Error('Token expired');
          }
        }
      } catch (e) {
        console.error('Invalid token format', e);
        this.handleUnauthorized();
        throw new Error('Invalid token');
      }
    }

    const response = await fetch(getApiUrl(url), {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // Handle 401 Unauthorized - try to refresh token once
    if (response.status === 401 && retryCount === 0) {
      try {
        const newToken = await this.refreshAccessToken();
        // Retry the request with new token
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

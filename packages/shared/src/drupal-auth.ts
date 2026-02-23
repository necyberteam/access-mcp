/* eslint-disable @typescript-eslint/no-explicit-any -- Generic HTTP client for untyped JSON:API responses */
import axios, { AxiosInstance } from "axios";
import { randomUUID } from "crypto";

/**
 * Authentication provider for Drupal JSON:API using cookie-based auth.
 *
 * This is a temporary implementation for development/testing.
 * Production should use Key Auth with the access_mcp_author module.
 *
 * @see ../../../access-qa-planning/06-mcp-authentication.md
 */
export class DrupalAuthProvider {
  private sessionCookie?: string;
  private csrfToken?: string;
  private logoutToken?: string;
  private userUuid?: string;
  private httpClient: AxiosInstance;
  private isAuthenticated = false;
  private actingUser?: string;

  constructor(
    private baseUrl: string,
    private username: string,
    private password: string,
    actingUser?: string
  ) {
    this.actingUser = actingUser;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      validateStatus: () => true,
    });
  }

  /**
   * Set the acting user (ACCESS ID) for attribution.
   * This user will be set as the author of created content.
   */
  setActingUser(accessId: string): void {
    this.actingUser = accessId;
  }

  /**
   * Get the current acting user
   */
  getActingUser(): string | undefined {
    return this.actingUser;
  }

  /**
   * Ensure we have a valid session, logging in if necessary
   */
  async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated) {
      await this.login();
    }
  }

  /**
   * Login to Drupal and store session cookie + CSRF token
   */
  async login(): Promise<void> {
    const response = await this.httpClient.post(
      "/user/login?_format=json",
      {
        name: this.username,
        pass: this.password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`Drupal login failed: ${response.status} ${response.statusText}`);
    }

    // Extract session cookie from Set-Cookie header
    const setCookie = response.headers["set-cookie"];
    if (setCookie && setCookie.length > 0) {
      // Parse the session cookie (format: SESS...=value; path=/; ...)
      const cookieParts = setCookie[0].split(";")[0];
      this.sessionCookie = cookieParts;
    }

    // Store CSRF token and logout token from response
    this.csrfToken = response.data.csrf_token;
    this.logoutToken = response.data.logout_token;
    this.userUuid = response.data.current_user?.uuid;

    if (!this.sessionCookie || !this.csrfToken) {
      throw new Error("Login succeeded but missing session cookie or CSRF token");
    }

    this.isAuthenticated = true;
  }

  /**
   * Get headers required for authenticated JSON:API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.isAuthenticated || !this.sessionCookie || !this.csrfToken) {
      throw new Error("Not authenticated. Call ensureAuthenticated() first.");
    }

    const headers: Record<string, string> = {
      Cookie: this.sessionCookie,
      "X-CSRF-Token": this.csrfToken,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      "X-Request-ID": randomUUID(),
    };

    // Include acting user header if set - Drupal will use this for attribution
    if (this.actingUser) {
      headers["X-Acting-User"] = this.actingUser;
    }

    return headers;
  }

  /**
   * Get the authenticated user's UUID
   */
  getUserUuid(): string | undefined {
    return this.userUuid;
  }

  /**
   * Invalidate the current session
   */
  invalidate(): void {
    this.sessionCookie = undefined;
    this.csrfToken = undefined;
    this.logoutToken = undefined;
    this.userUuid = undefined;
    this.isAuthenticated = false;
  }

  /**
   * Make an authenticated GET request to JSON:API
   */
  async get(path: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.get(path, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      // Session may have expired, try re-authenticating
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.get(path, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Make an authenticated POST request to JSON:API
   */
  async post(path: string, data: any): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.post(path, data, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.post(path, data, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Make an authenticated PATCH request to JSON:API
   */
  async patch(path: string, data: any): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.patch(path, data, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.patch(path, data, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Make an authenticated DELETE request to JSON:API
   */
  async delete(path: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.delete(path, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.delete(path, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Handle JSON:API response, throwing on errors
   */
  private handleResponse(response: any): any {
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    // JSON:API error format
    if (response.data?.errors) {
      const errors = response.data.errors
        .map((e: any) => e.detail || e.title || "Unknown error")
        .join("; ");
      throw new Error(`Drupal API error (${response.status}): ${errors}`);
    }

    throw new Error(`Drupal API error: ${response.status} ${response.statusText}`);
  }
}

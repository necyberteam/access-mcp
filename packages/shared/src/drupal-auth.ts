/* eslint-disable @typescript-eslint/no-explicit-any -- Generic HTTP client for untyped JSON:API responses */
import axios, { AxiosInstance } from "axios";
import { randomUUID } from "crypto";
import https from "https";

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

  constructor(
    private baseUrl: string,
    private username: string,
    private password: string
  ) {
    // Skip TLS verification for local dev domains (DDEV self-signed certs).
    const isLocalDev = /\.(ddev\.site|localhost|local)$/.test(
      new URL(this.baseUrl).hostname
    );

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      validateStatus: () => true,
      ...(isLocalDev && {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }),
    });
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
   * Get headers required for authenticated requests.
   *
   * Defaults to JSON:API content type. Pass overrides for non-JSON:API
   * endpoints (e.g., { "Content-Type": "application/json" }).
   */
  getAuthHeaders(
    actingUser: string,
    overrides?: Record<string, string>
  ): Record<string, string> {
    if (!this.isAuthenticated || !this.sessionCookie || !this.csrfToken) {
      throw new Error("Not authenticated. Call ensureAuthenticated() first.");
    }

    return {
      Cookie: this.sessionCookie,
      "X-CSRF-Token": this.csrfToken,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      "X-Request-ID": randomUUID(),
      "X-Acting-User": actingUser,
      ...overrides,
    };
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
  async get(actingUser: string, path: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.get(path, {
      headers: this.getAuthHeaders(actingUser),
    });

    if (response.status === 401 || response.status === 403) {
      // Session may have expired, try re-authenticating
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.get(path, {
        headers: this.getAuthHeaders(actingUser),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Make an authenticated POST request.
   *
   * Defaults to JSON:API content type. Pass headerOverrides for non-JSON:API
   * endpoints (e.g., { "Content-Type": "application/json", Accept: "application/json" }).
   */
  async post(
    actingUser: string,
    path: string,
    data: any,
    headerOverrides?: Record<string, string>
  ): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.post(path, data, {
      headers: this.getAuthHeaders(actingUser, headerOverrides),
    });

    if (response.status === 401 || response.status === 403) {
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.post(path, data, {
        headers: this.getAuthHeaders(actingUser, headerOverrides),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Make an authenticated request and return the raw status + body WITHOUT
   * throwing on non-2xx.
   *
   * Unlike get/post/delete (which call handleResponse and throw on non-2xx,
   * discarding the body), this returns { status, data } straight from the
   * resolved axios response. Callers branch on status themselves — e.g.
   * treating a Drupal 409 as a first-class refusal and reading its flat
   * { error, message } body. Uses application/json (not JSON:API) content type.
   *
   * Deliberately omits the 401/403 re-auth retry that get/post/delete have,
   * so a 403 surfaces to the caller for its own branching.
   */
  async requestRaw(
    actingUser: string,
    method: "GET" | "POST" | "DELETE",
    path: string,
    data?: unknown
  ): Promise<{ status: number; data: any }> {
    await this.ensureAuthenticated();

    const headers = this.getAuthHeaders(actingUser, {
      "Content-Type": "application/json",
    });

    // validateStatus: () => true (set in the constructor) means every status
    // resolves, so the raw response is always available. Branch on the verb and
    // call the verb-specific httpClient method (get/post/delete).
    let response: any;
    switch (method) {
      case "GET":
        response = await this.httpClient.get(path, { headers });
        break;
      case "POST":
        response = await this.httpClient.post(path, data, { headers });
        break;
      case "DELETE":
        response = await this.httpClient.delete(path, { headers });
        break;
    }

    return { status: response.status, data: response.data };
  }

  /**
   * Make an authenticated PATCH request to JSON:API
   */
  async patch(actingUser: string, path: string, data: any): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.patch(path, data, {
      headers: this.getAuthHeaders(actingUser),
    });

    if (response.status === 401 || response.status === 403) {
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.patch(path, data, {
        headers: this.getAuthHeaders(actingUser),
      });

      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  /**
   * Make an authenticated DELETE request to JSON:API
   */
  async delete(actingUser: string, path: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.httpClient.delete(path, {
      headers: this.getAuthHeaders(actingUser),
    });

    if (response.status === 401 || response.status === 403) {
      this.invalidate();
      await this.ensureAuthenticated();

      const retryResponse = await this.httpClient.delete(path, {
        headers: this.getAuthHeaders(actingUser),
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OAuthClientInformationFull, OAuthTokenRevocationRequest } from "@modelcontextprotocol/sdk/shared/auth.js";
import { CILogonOAuthProvider, InMemoryClientStore } from "../cilogon-provider.js";

describe("InMemoryClientStore", () => {
  let store: InMemoryClientStore;

  beforeEach(() => {
    store = new InMemoryClientStore();
  });

  it("should register and retrieve a client", async () => {
    const client = {
      client_id: "test-client-id",
      client_secret: "test-secret",
      redirect_uris: ["http://localhost:3000/callback"],
    } as OAuthClientInformationFull;

    await store.registerClient(client);
    const retrieved = await store.getClient("test-client-id");
    expect(retrieved).toBeDefined();
    expect(retrieved?.client_id).toBe("test-client-id");
  });

  it("should return undefined for unknown client", async () => {
    const result = await store.getClient("nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("CILogonOAuthProvider", () => {
  let provider: CILogonOAuthProvider;

  beforeEach(() => {
    provider = new CILogonOAuthProvider({
      clientId: "test-cilogon-client-id",
      clientSecret: "test-cilogon-secret",
      externalBaseUrl: "https://mcp.access-ci.org/auth",
    });
  });

  it("should have skipLocalPkceValidation enabled", () => {
    expect(provider.skipLocalPkceValidation).toBe(true);
  });

  it("should have a clients store", () => {
    expect(provider.clientsStore).toBeDefined();
  });

  describe("authorize", () => {
    it("should redirect to CILogon with correct parameters", async () => {
      const client = {
        client_id: "mcp-client",
        redirect_uris: ["http://localhost:3000/callback"],
      } as OAuthClientInformationFull;

      const params = {
        state: "test-state",
        scopes: ["openid"],
        codeChallenge: "test-challenge",
        redirectUri: "http://localhost:3000/callback",
      };

      const res = {
        redirect: vi.fn(),
      } as unknown as import("express").Response;

      await provider.authorize(client, params, res);

      expect(res.redirect).toHaveBeenCalledTimes(1);
      const redirectUrl = new URL(res.redirect.mock.calls[0][0]);
      expect(redirectUrl.hostname).toBe("cilogon.org");
      expect(redirectUrl.pathname).toBe("/authorize");
      expect(redirectUrl.searchParams.get("client_id")).toBe("test-cilogon-client-id");
      expect(redirectUrl.searchParams.get("response_type")).toBe("code");
      expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
        "https://mcp.access-ci.org/auth/callback"
      );
      expect(redirectUrl.searchParams.get("scope")).toContain("openid");
    });
  });

  describe("handleCallback", () => {
    it("should reject invalid state", async () => {
      await expect(
        provider.handleCallback("some-code", "invalid-state")
      ).rejects.toThrow("Invalid or expired authorization state");
    });
  });

  describe("exchangeAuthorizationCode", () => {
    it("should reject invalid code", async () => {
      const client = { client_id: "test" } as OAuthClientInformationFull;
      await expect(
        provider.exchangeAuthorizationCode(client, "invalid-code")
      ).rejects.toThrow("Invalid or expired authorization code");
    });
  });

  describe("verifyAccessToken", () => {
    it("should reject invalid tokens", async () => {
      await expect(
        provider.verifyAccessToken("invalid-token")
      ).rejects.toThrow("Invalid or expired access token");
    });
  });

  describe("revokeToken", () => {
    it("should not throw", async () => {
      const client = { client_id: "test" } as OAuthClientInformationFull;
      await expect(
        provider.revokeToken!(client, { token: "some-token" } as OAuthTokenRevocationRequest)
      ).resolves.not.toThrow();
    });
  });
});

#!/usr/bin/env node
/**
 * ACCESS-CI MCP Auth Service
 *
 * Shared OAuth authorization server that proxies to CILogon.
 * Individual MCP servers verify tokens via CILogon's userinfo endpoint.
 */

import express from "express";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { CILogonOAuthProvider } from "./cilogon-provider.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const CILOGON_CLIENT_ID = process.env.CILOGON_CLIENT_ID;
const CILOGON_CLIENT_SECRET = process.env.CILOGON_CLIENT_SECRET;
const EXTERNAL_BASE_URL =
  process.env.OAUTH_EXTERNAL_BASE_URL || "https://mcp.access-ci.org/auth";

if (!CILOGON_CLIENT_ID || !CILOGON_CLIENT_SECRET) {
  console.error(
    "CILOGON_CLIENT_ID and CILOGON_CLIENT_SECRET must be set"
  );
  process.exit(1);
}

const provider = new CILogonOAuthProvider({
  clientId: CILOGON_CLIENT_ID,
  clientSecret: CILOGON_CLIENT_SECRET,
  externalBaseUrl: EXTERNAL_BASE_URL,
});

const app = express();
app.set("trust proxy", 1); // Behind Caddy reverse proxy
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Protected resource metadata for all MCP servers.
// Claude discovers OAuth by fetching /.well-known/oauth-protected-resource/<server-path>
// from the server URL it was given. We serve this for all server paths,
// pointing to our auth service as the authorization server.
app.use((req, res, next) => {
  const prefix = "/.well-known/oauth-protected-resource/";
  if (req.method === "GET" && req.path.startsWith(prefix)) {
    const resourcePath = req.path.slice(prefix.length);
    res.json({
      resource: `https://mcp.access-ci.org/${resourcePath}`,
      authorization_servers: [EXTERNAL_BASE_URL],
      scopes_supported: ["openid", "email", "org.cilogon.userinfo"],
      resource_name: "ACCESS-CI MCP Servers",
      resource_documentation: "https://mcp.access-ci.org/docs/",
    });
    return;
  }
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    server: "access-mcp-auth",
    version: "0.1.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// CILogon callback — receives the auth code from CILogon after user login
app.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    if (!code || !state) {
      res.status(400).send("Missing code or state parameter");
      return;
    }

    const { redirectUri } = await provider.handleCallback(code, state);
    res.redirect(redirectUri);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("OAuth callback error:", message);
    res.status(500).send(`Authentication error: ${message}`);
  }
});

// Token verification endpoint — internal use by MCP servers
app.post("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Bearer token" });
      return;
    }

    const token = authHeader.slice(7);
    const authInfo = await provider.verifyAccessToken(token);
    res.json(authInfo);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// MCP OAuth router — serves .well-known, /authorize, /token, /register, /revoke
const issuerUrl = new URL(EXTERNAL_BASE_URL);
app.use(
  mcpAuthRouter({
    provider,
    issuerUrl,
    scopesSupported: ["openid", "email", "org.cilogon.userinfo"],
    resourceName: "ACCESS-CI MCP Servers",
    serviceDocumentationUrl: new URL(
      "https://mcp.access-ci.org/docs/"
    ),
  })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ACCESS-CI MCP Auth Service running on port ${PORT}`);
  console.log(`External URL: ${EXTERNAL_BASE_URL}`);
  console.log(`CILogon callback: ${EXTERNAL_BASE_URL}/callback`);
});

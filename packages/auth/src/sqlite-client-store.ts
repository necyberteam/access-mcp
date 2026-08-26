import Database from "better-sqlite3";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * SQLite-backed OAuth client registry. Dynamically-registered MCP clients
 * (claude.ai connectors) persist here so they survive container restarts —
 * the in-memory predecessor lost every registration on restart.
 *
 * Only the client store persists. Pending authorizations, auth codes, and the
 * token cache stay in memory in CILogonOAuthProvider (ephemeral by design).
 */
export class SqliteClientStore implements OAuthRegisteredClientsStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS clients (client_id TEXT PRIMARY KEY, data TEXT NOT NULL)"
    );
  }

  async getClient(
    clientId: string
  ): Promise<OAuthClientInformationFull | undefined> {
    const row = this.db
      .prepare("SELECT data FROM clients WHERE client_id = ?")
      .get(clientId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as OAuthClientInformationFull) : undefined;
  }

  async registerClient(
    client: OAuthClientInformationFull
  ): Promise<OAuthClientInformationFull> {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO clients (client_id, data) VALUES (?, ?)"
      )
      .run(client.client_id, JSON.stringify(client));
    return client;
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Resolve the client-store DB path from the environment.
 * - CLIENT_STORE_PATH set → use it.
 * - unset AND NODE_ENV==="test" → ":memory:" (explicitly ephemeral for tests).
 * - unset otherwise → THROW. A production deploy must never silently run a
 *   non-persistent store — that reintroduces the exact bug this fixes.
 */
export function resolveClientStorePath(env: NodeJS.ProcessEnv): string {
  if (env.CLIENT_STORE_PATH) return env.CLIENT_STORE_PATH;
  if (env.NODE_ENV === "test") return ":memory:";
  throw new Error(
    "CLIENT_STORE_PATH must be set (persistent client store required in production)"
  );
}

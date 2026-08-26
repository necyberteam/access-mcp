## Client registration persistence

Dynamically-registered OAuth clients (claude.ai connectors) are stored in a
SQLite database so they survive container restarts. Configure the path with
`CLIENT_STORE_PATH` (e.g. `/data/clients.db`, on the `mcp_auth_data` volume in
`docker-compose.prod.yml`).

- In production `CLIENT_STORE_PATH` is REQUIRED — the service fails to start if
  it is unset, rather than silently running a non-persistent store.
- Tests/dev use `:memory:` (set `CLIENT_STORE_PATH=:memory:` or run with
  `NODE_ENV=test`).
- The `mcp_auth_data` volume is the auth client registry of record. If it is
  lost, every connector must re-register once (the pre-persistence behavior).
  Host-level backup should include Docker named volumes.

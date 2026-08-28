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

### Backup posture (accepted loss, not separately backed up)

`mcp_auth_data` is deliberately NOT given its own backup job. The store holds
only OAuth client registrations, which regenerate automatically the next time
each connector authenticates — losing the volume costs one reconnect per
connector and nothing else. There is no user content or irreplaceable state
here, so the recovery cost is bounded and self-service.

This is a conscious decision, contrasted with the reporting/usage databases,
which dump to dedicated `*_backups` volumes because their data is irreplaceable.
The auth store is not in that pattern.

On the current host (burrow), the volume's bytes live under the rootless Docker
data dir in the service user's home, so the store is only protected if a
host-level filesystem/VM snapshot covers that home directory. As of 2026-08-27
no such snapshot has been confirmed; if one is later confirmed, it covers this
volume incidentally. Either way, the accepted-loss posture above stands — no
per-store backup is warranted for regenerable registration data.

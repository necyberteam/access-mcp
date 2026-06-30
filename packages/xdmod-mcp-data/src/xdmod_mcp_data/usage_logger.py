"""Best-effort MCP usage logger (Python parity with the TS UsageLogger).

Writes one row per tool call to the same mcp_usage.tool_calls table the
TypeScript servers use — same DDL, same hash algorithm — so rows are uniform
across all servers. Every failure is swallowed: logging must never fail or
delay a tool call.
"""
import hashlib
import logging
import math
from typing import Any, Dict, Optional

import psycopg

logger = logging.getLogger(__name__)

_SCHEMA_DDL = """
CREATE SCHEMA IF NOT EXISTS mcp_usage;
CREATE TABLE IF NOT EXISTS mcp_usage.tool_calls (
  id                bigserial PRIMARY KEY,
  ts                timestamptz NOT NULL DEFAULT now(),
  server            text NOT NULL,
  tool              text NOT NULL,
  arg_keys          text[] NOT NULL DEFAULT '{}',
  success           boolean NOT NULL,
  duration_ms       integer,
  user_hash         text,
  was_authenticated boolean NOT NULL,
  client            text
);
CREATE INDEX IF NOT EXISTS tool_calls_ts_idx ON mcp_usage.tool_calls (ts);
CREATE INDEX IF NOT EXISTS tool_calls_server_tool_idx ON mcp_usage.tool_calls (server, tool);
"""


def hash_actor(acting_user: Optional[str]) -> Optional[str]:
    # 16 hex = 64 bits. MUST match the TS hashActor exactly for uniform rows.
    if not acting_user:
        return None
    return hashlib.sha256(acting_user.encode()).hexdigest()[:16]


def _clamp_duration(duration_ms: float) -> int:
    # Parity with the TS logger: non-finite or negative durations (clock skew,
    # hung call) clamp to 0 so they can't poison the integer insert.
    if not math.isfinite(duration_ms):
        return 0
    return max(0, round(duration_ms))


def build_usage_row(
    *, server: str, tool: str, arguments: Optional[Dict[str, Any]],
    success: bool, duration_ms: float, acting_user: Optional[str],
) -> Dict[str, Any]:
    return {
        "server": server,
        "tool": tool,
        "arg_keys": list(arguments.keys()) if arguments else [],
        "success": success,
        "duration_ms": _clamp_duration(duration_ms),
        "user_hash": hash_actor(acting_user),
        "was_authenticated": bool(acting_user),
        "client": None,
    }


class UsageLogger:
    def __init__(self, connection_string: Optional[str]):
        self._conn_str = connection_string
        self.enabled = bool(connection_string)
        self._schema_ready = False

    async def record(self, *, server: str, tool: str,
                     arguments: Optional[Dict[str, Any]], success: bool,
                     duration_ms: float, acting_user: Optional[str]) -> None:
        """Fire-and-forget. Never raises."""
        if not self.enabled:
            return
        try:
            async with await psycopg.AsyncConnection.connect(self._conn_str) as conn:
                if not self._schema_ready:
                    await conn.execute(_SCHEMA_DDL)
                    self._schema_ready = True
                row = build_usage_row(
                    server=server, tool=tool, arguments=arguments,
                    success=success, duration_ms=duration_ms, acting_user=acting_user,
                )
                await conn.execute(
                    """INSERT INTO mcp_usage.tool_calls
                       (server, tool, arg_keys, success, duration_ms,
                        user_hash, was_authenticated, client)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (row["server"], row["tool"], row["arg_keys"], row["success"],
                     row["duration_ms"], row["user_hash"], row["was_authenticated"],
                     row["client"]),
                )
        except Exception as exc:  # best-effort: never propagate
            logger.debug("usage logging failed (ignored): %s", exc)

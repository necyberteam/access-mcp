import hashlib
from xdmod_mcp_data.usage_logger import hash_actor, build_usage_row


def test_hash_actor_matches_typescript_algorithm():
    # MUST equal the TS hashActor: sha256 hex, first 16 chars.
    actor = "alice@access-ci.org"
    expected = hashlib.sha256(actor.encode()).hexdigest()[:16]
    assert hash_actor(actor) == expected


def test_hash_actor_anonymous_is_none():
    assert hash_actor(None) is None


def test_build_usage_row_names_only_no_values():
    row = build_usage_row(
        server="xdmod-mcp-data", tool="get_chart_data",
        arguments={"realm": "Jobs", "statistic": "total_cpu_hours"},
        success=True, duration_ms=50, acting_user="alice@access-ci.org",
    )
    assert sorted(row["arg_keys"]) == ["realm", "statistic"]
    assert "Jobs" not in str(row)            # no values leaked
    assert row["was_authenticated"] is True
    assert row["user_hash"] == hashlib.sha256(b"alice@access-ci.org").hexdigest()[:16]


def test_build_usage_row_anonymous():
    row = build_usage_row(
        server="xdmod-mcp-data", tool="describe_realms", arguments={},
        success=True, duration_ms=5, acting_user=None,
    )
    assert row["was_authenticated"] is False
    assert row["user_hash"] is None


def test_build_usage_row_clamps_bad_duration():
    # Parity with the TS logger: negative / non-finite durations clamp to 0.
    assert build_usage_row(server="s", tool="t", arguments={}, success=False, duration_ms=-5, acting_user=None)["duration_ms"] == 0
    assert build_usage_row(server="s", tool="t", arguments={}, success=True, duration_ms=float("nan"), acting_user=None)["duration_ms"] == 0
    assert build_usage_row(server="s", tool="t", arguments={}, success=True, duration_ms=float("inf"), acting_user=None)["duration_ms"] == 0

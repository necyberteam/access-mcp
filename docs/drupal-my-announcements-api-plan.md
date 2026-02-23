# Plan: "My Announcements" API Endpoint

## Problem

The MCP server queries `/jsonapi/user/user` to look up user UUIDs, which exposes user profile data (emails, names, institutions).

## Solution

### 1. Restrict `/jsonapi/user/user`

Remove `access user profiles` permission from:
- `user.role.anonymous.yml`
- `user.role.authenticated.yml`

This blocks the JSON:API user endpoint for everyone. It won't affect:
- Community personas (`/community-persona/{uid}`) - uses custom controller with `access content` permission
- Contact forms, login, profile edit - have their own permissions

### 2. Create `/api/2.2/my-announcements` endpoint

Reads `X-Acting-User` header and returns that user's announcements.

**Route:** `GET /api/2.2/my-announcements?items_per_page=25`
**Header:** `X-Acting-User: user@access-ci.org`

**Response** (matches existing announcements API format):
```json
[
  {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "nid": 123,
    "title": "My Announcement",
    "summary": "Brief summary...",
    "body": "<p>Full content...</p>",
    "published_date": "2026-01-10",
    "status": "draft",
    "moderation_state": "draft",
    "edit_url": "/node/123/edit",
    "tags": "tag1,tag2",
    "affiliation": "Community"
  }
]
```

### Existing code to leverage

- `JsonApiEmailToUuidSubscriber.php` has `getUserUuidByUsername()` for resolving ACCESS IDs
- "My Announcements" view block shows the author filter pattern

## MCP Changes

Update `getMyAnnouncements()` to call `/api/2.2/my-announcements` instead of querying the user endpoint.

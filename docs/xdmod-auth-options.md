# XDMoD API Token Access for MCP Integration

We're adding OAuth authentication (via CILogon) to the ACCESS MCP servers so AI tools like Claude can identify users by their ACCESS credentials. This works well for most servers — once a user authenticates, we know who they are and can attribute actions to them.

The challenge with XDMoD Data is that knowing who the user is doesn't give us their XDMoD API token. Right now users have to manually copy their token from the XDMoD portal and paste it into their AI client config, which is a friction point we'd like to eliminate.

Here are some approaches we've been considering, roughly in order of how seamless the experience would be for users.

## Accept CILogon tokens directly

The cleanest option from a user perspective — XDMoD would accept CILogon OAuth bearer tokens for API access, the same way a user's browser session works after CILogon login. No separate API token needed at all. Users just log in through the normal ACCESS flow and everything works. This is probably the biggest lift on the XDMoD side since it means adding a new auth pathway to the API, but it aligns with how most modern APIs handle auth.

## Token generation or retrieval API

If CILogon tokens aren't feasible for direct API access, an endpoint that lets us generate or retrieve a user's API token programmatically would work. Something like: the MCP server authenticates the user via CILogon, then calls an XDMoD endpoint with the CILogon bearer token to get (or create) their API token. If XDMoD already stores the token server-side (which it must, since users can view it in the portal), a retrieval endpoint might be straightforward.

## Changes to the xdmod-data Python library

Another angle — if the `xdmod-data` library itself could accept CILogon tokens as an alternative to the API token, we could handle this at the library level without needing changes to the XDMoD web service. The MCP server would just pass through the CILogon token it already has.

## What we're doing in the meantime

For now, we're having users provide their XDMoD token manually when they first connect. Once we know who they are through OAuth, we store the association server-side so they don't have to provide it again. It works, but it's an extra step we'd love to remove.

## What would be most helpful to know

- Is there appetite for any of these approaches on the XDMoD side?
- Does the XDMoD REST API already accept CILogon-based auth for any endpoints?
- Would a token retrieval endpoint be a reasonable addition, or are there security concerns with exposing tokens programmatically?
- Any plans around the `xdmod-data` library that might intersect with this?

Happy to discuss further or work on the integration together.

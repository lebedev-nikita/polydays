# Connect an MCP client

Polydays serves an authenticated HTTP MCP endpoint at `${BETTER_AUTH_URL}/mcp`. On the Raspberry Pi deployment, use:

```text
https://polydays.gibbon-parrotfish.ts.net/mcp
```

Add this URL as a remote MCP server in your client. The client must support OAuth authorization code flow with PKCE and resource indicators. Discovery documents are served at the standard `/.well-known/` paths; the issuer and authorization endpoints are under `/api/auth`. Client ID metadata documents and dynamic client registration are supported. The HTTP transport supports the current MCP protocol and older Streamable HTTP clients without server-side sessions.

Sign in with your own Google account, check the application's name and requested permissions, then approve access. `polydays:read` reads tasks, recurring series, the schedule and history. `polydays:write` also permits task changes and schedule/timezone changes. `offline_access` allows refresh tokens. Access tokens expire after 15 minutes. An ordinary Polydays session token is not an MCP access token.

One server can serve multiple people and multiple MCP clients. Every account has its own tasks, schedule and history. The same MCP client can be authorized by several users, with separate grants and tokens. Client-supplied account IDs cannot select another user’s data. See [account admission settings](deployment.md#account-access).

Open `${BETTER_AUTH_URL}/connect` to review your connections or revoke one. Revocation removes the consent, refresh tokens, opaque access tokens and outstanding authorization codes for that user/client. Every MCP request checks its current consent; reconnecting does not reactivate JWTs from an older consent.

## Tools and synchronization

Read `get_context` first for the account timezone, schedule, current polyday and calendar revision. Use `list_polydays`, `list_tasks`, `get_task` and `list_series` to inspect destinations and revisions. List tools support bounded date ranges and task pagination.

Write tools are `create_task`, `update_task`, `complete_task`, `delete_task`, `create_series`, `update_series`, `set_schedule` and `set_timezone`. Each command requires a unique `requestId`. Retry the identical command with the same ID after a lost response; use a new ID for a new action. Updates require the revision returned by the latest read, including generated recurring occurrences. Stale revisions fail without changing data.

Commands run in one database transaction and write the same sync journal as the native and web applications. Clients receive the changes on their next synchronization. Completing or deleting an occurrence affects that occurrence only. Editing a series preserves past rules and explicit occurrences. Removing a deadline requires both a new destination and `clearDeadline: true`. Removing schedule slots requires a destination for their unfinished tasks.

## Tailscale and cloud clients

The service address is private to the tailnet. Local MCP clients need Tailscale connectivity; a cloud-hosted ChatGPT connector cannot reach this address just because the browser or phone has Tailscale installed. Use a supported private-network tunnel, or separately configure an authenticated public HTTPS entry point, before connecting a cloud client. Publishing a public endpoint is a separate infrastructure choice.

ChatGPT uses its subscription when it calls this MCP server from ChatGPT. MCP supplies access to Polydays; it does not give the Polydays backend a pool of ChatGPT subscription tokens or replace API billing for model calls initiated by the backend.

For a local development client, start the loopback development server and send `x-polydays-dev: 1` to `/mcp`. This bypass is disabled in production and cannot be enabled on a non-loopback development host. Production MCP always requires an OAuth grant bound to the signed-in user.

Protocol and authorization references: [MCP specification](https://modelcontextprotocol.io/specification/latest), [Better Auth MCP](https://better-auth.com/docs/plugins/mcp), [Tailscale Services](https://tailscale.com/docs/features/tailscale-services).

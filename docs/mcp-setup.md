# Connect Dev Radar to ChatGPT Tasks

The Worker exposes two MCP tools at `/mcp`:

- `get_recent_issues` reads up to seven recent issues.
- `publish_daily_issue` publishes exactly three articles for one date and
  replaces an existing issue on that date. It is a public, destructive write.

The MCP route fails closed until Cloudflare Access is configured. The existing
REST publisher remains available to clients using the Worker `PUBLISH_TOKEN`
secret. The public website and `GET /api/issues` stay open to all visitors.

## Cloudflare Access

1. Enable Zero Trust for the Cloudflare account. In **Access controls →
   Applications**, create a **self-hosted** application for only
   `dev-radar.ray-suen.workers.dev/mcp`. Add an **Allow** policy for the exact
   admin email addresses; do not protect the whole Worker or hostname.
2. Enable **Managed OAuth** on that application. Allow ChatGPT's redirect URI
   shown in its custom MCP connection screen. Use an access token lifetime of
   5–15 minutes and a longer grant session duration if daily Tasks need it.
3. Copy the Access **Application Audience (AUD) Tag** and your Zero Trust team
   domain, such as `https://your-team.cloudflareaccess.com`. Configure Worker
   environment variables `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` with those
   values, then deploy. The Worker verifies the Access JWT signature, issuer,
   audience, and expiry on every MCP request.
4. In ChatGPT **Plugins → Add custom MCP server**, enter
   `https://dev-radar.ray-suen.workers.dev/mcp` and choose **OAuth**. Complete
   Access login, install the resulting personal plugin, and in a Work chat
   call `get_recent_issues` before trying a publish.

Do not place `PUBLISH_TOKEN` in ChatGPT instructions or an MCP URL. ChatGPT's
custom MCP connection does not accept a fixed bearer token. Access Managed
OAuth supplies a user login while the REST token can remain for direct API
clients.

Use [daily-publisher.md](daily-publisher.md) as the Task instructions. Run it
once manually, then schedule it and inspect a real scheduled run. Tool write
confirmation is controlled by ChatGPT; the MCP server cannot guarantee that a
scheduled publish proceeds without a prompt.

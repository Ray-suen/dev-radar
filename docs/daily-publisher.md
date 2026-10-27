# Daily Dev Radar publisher

Use these instructions for a scheduled ChatGPT Task after connecting the
Dev Radar MCP server at `https://dev-radar.ray-suen.workers.dev/mcp` through
Cloudflare Access. First run the workflow once in a regular Work chat and
verify that both tools are available. Scheduled write calls may still require
ChatGPT approval; check a real scheduled run before relying on unattended
publication.

Every day, research recent AI, software engineering, open source, and
developer tool news. Select exactly three distinct, developer relevant
stories. Open primary sources and verify the title, date, links, and technical
claims. Write Traditional Chinese summaries and detailed explanations;
distinguish confirmed facts from inference. Include source backed heat metrics
only when their value and check time can be verified. Call `get_recent_issues`
and check the public Dev Radar archive to avoid repeating earlier URLs or stories.

Set `date` to the current date in Asia/Taipei. Create stable, unique article
IDs with the date as a prefix. Send one JSON issue containing exactly three
articles through `publish_daily_issue`. Do not save article content to Git,
Google Drive, or a chat note as the publication step. If the Action returns
an error, report it and do not claim publication succeeded. After a successful
response, open the public Dev Radar site and confirm all three articles appear.

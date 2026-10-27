# Dev Radar

Dev Radar is a minimal technology-news reader that presents three developer-focused stories per day in Traditional Chinese. It covers AI, software engineering, open source, and developer tools.

## Development

Install dependencies, apply the local D1 migration, and start the Worker:

```bash
npm ci
npx wrangler d1 migrations apply dev-radar --local
npm run dev:worker
```

Open the local URL shown by Vite for live preview.

Available checks:

```bash
npm run lint
npm run test:news
npm run test:assistant
npm run build
```

`npm run build` checks TypeScript and creates the production build.

## News publishing

The site reads published issues from Cloudflare D1 through `GET /api/issues`.
Publish exactly three articles with `POST /api/admin/issues` and
`Authorization: Bearer <PUBLISH_TOKEN>`. The payload uses the `NewsIssue`
fields without `displayDate`; `heat` is optional. Publishing the same date
replaces that issue atomically. Invalid content returns 400; an ID or URL
already used by another issue returns 409. Keep `PUBLISH_TOKEN` in a Worker
secret and only in direct API clients' secure credential storage, never in a prompt.

News lives in D1; no article content is stored in Git. The publication payload
and authentication are described in [openapi-publish.yaml](openapi-publish.yaml).
Run `npm run setup:publish-token` to rotate the secret; the new value is saved
to `.publish-token` locally (ignored by Git). For ChatGPT Tasks, the Worker also
exposes Access-protected MCP tools. Follow [docs/mcp-setup.md](docs/mcp-setup.md)
to connect them, then use [docs/daily-publisher.md](docs/daily-publisher.md)
for the scheduled research and publishing instructions.

Each issue must contain exactly three articles. IDs and source URLs must be
unique within the issue and across published issues.

Required article fields:

- `id`
- `title`
- `originalTitle`
- `category`
- `source`
- `publishedAt`
- `summary`
- `details`
- `url`

`projectUrl` and `discussionUrl` are optional.

`heat` is an optional list of source-backed community metrics. Each item records
`platform`, `metric`, numeric `value`, `sourceUrl`, and ISO 8601
`checkedAt`. Keep metrics from different platforms separate; Dev Radar does not
calculate a combined popularity score.

The story title opens an article reader at `#/article/:id`, where `summary` and `details` are rendered. The details support headings, paragraphs, lists, and fenced code blocks.

## News assistant

The **小助手** button opens a side panel on desktop and a bottom sheet on
smaller screens. `POST /api/assistant` selects up to three relevant stories from
the latest 300 articles in D1, then asks `@cf/openai/gpt-oss-120b` to answer in
Traditional Chinese. The assistant can also explain general technical concepts
when no story matches. Responses link to related stories when available, without
presenting general knowledge as article-backed reporting. On an article page,
questions referring to the current story include it first. The endpoint accepts a `question` of up to
300 characters and an optional `articleId`. It limits each visitor IP to about
five requests per minute; Cloudflare's rate limiting is approximate.

The Worker uses the `AI` binding in `wrangler.jsonc`; no separate API key is
needed in deployed code. Local `wrangler dev` with an AI binding requires
Cloudflare credentials and inference uses the account's Workers AI allowance.

## Mermaid diagrams

When a diagram improves understanding, add one `mermaid` fenced code block inside an article’s `details` field. Keep diagrams focused and add a two- or three-sentence explanation of what the reader should learn from it.

Diagrams load only when the corresponding article reader is opened. Invalid Mermaid syntax shows a friendly error without affecting the rest of the issue.

## ChatGPT discussion

Each article includes a **ChatGPT discussion** action. It opens a new ChatGPT conversation with a prompt containing the article title, summary, details, and source URL, and also copies the prompt as a fallback.

The prompt is carried in the destination URL, so use this only for public news content. The reader must review and submit the prompt in ChatGPT.

## Cloudflare Workers deployment

Cloudflare Workers serves the Vite build as static assets and reserves `/api/*`
and `/mcp` for the backend. Run the site locally with:

```bash
npm run dev:worker
```

Deploy after logging in with Wrangler and applying migrations:

```bash
npm run deploy
```

The GitHub Actions workflow deploys on `main` once `CLOUDFLARE_API_TOKEN` is
configured as a repository secret with Workers Scripts Write and D1 Write access. It does not
publish news; ChatGPT sends new issues directly to the Worker MCP endpoint.

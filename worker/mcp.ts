import { McpServer } from '@modelcontextprotocol/server'
import { createMcpHandler } from 'agents/mcp/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { z } from 'zod'
import { issueSchema } from '../src/lib/news-schema'
import { publishIssue, readIssues } from './data'
import type { PublishEnv } from './types'

export function createServer(env: PublishEnv) {
  const server = new McpServer({ name: 'dev-radar', version: '1.0.0' })
  server.registerTool('get_recent_issues', {
    description: 'Read the most recent published Dev Radar issues and their articles. Use this to avoid repeating recently covered news.',
    inputSchema: z.object({ limit: z.number().int().min(1).max(7).default(3) }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ limit }) => {
    // shortcut: reads the whole archive; query recent dates directly when it grows.
    const issues = (await readIssues(env.DB)).slice(0, limit).map(({ date, articles }) => ({
      date,
      articles: articles.map(({ id, title, url }) => ({ id, title, url })),
    }))
    return { content: [{ type: 'text', text: JSON.stringify(issues) }] }
  })
  server.registerTool('publish_daily_issue', {
    description: 'Publish exactly three sourced technology news articles for one date to the public Dev Radar website. Replaces any existing issue on that date.',
    inputSchema: z.object({ issue: issueSchema }),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true, idempotentHint: true },
  }, async ({ issue }) => {
    try {
      await publishIssue(env.DB, issue)
      return { content: [{ type: 'text', text: JSON.stringify({ date: issue.date, articles: issue.articles.length }) }] }
    } catch (error) {
      console.error('MCP issue publish failed', error)
      return { isError: true, content: [{ type: 'text', text: 'Publish failed; article IDs or URLs may already exist' }] }
    }
  })
  return server
}

export async function handleMcp(request: Request, env: PublishEnv, ctx: ExecutionContext): Promise<Response> {
  const issuer = env.ACCESS_TEAM_DOMAIN
  const audience = env.ACCESS_AUD
  const assertion = request.headers.get('cf-access-jwt-assertion')
  if (!issuer || !audience) return Response.json({ error: 'MCP authentication is not configured' }, { status: 503 })
  if (!assertion) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (Number(request.headers.get('content-length')) > 512_000) return Response.json({ error: 'Payload too large' }, { status: 413 })
  try {
    const normalizedIssuer = issuer.replace(/\/$/, '')
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(normalizedIssuer)) throw new Error('Invalid Access team domain')
    await jwtVerify(assertion, createRemoteJWKSet(new URL(`${normalizedIssuer}/cdn-cgi/access/certs`)), {
      issuer: normalizedIssuer,
      audience,
      algorithms: ['RS256'],
    })
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return createMcpHandler(() => createServer(env), { responseMode: 'json', corsOptions: false })(request, env, ctx)
}

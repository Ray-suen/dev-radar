import { issueSchema } from '../src/lib/news-schema'
import { publishIssue, readIssues } from './data'
import { handleMcp } from './mcp'

import type { PublishEnv } from './types'

export default {
  async fetch(request: Request, env: PublishEnv, ctx: ExecutionContext): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === '/mcp') return handleMcp(request, env, ctx)
    if (path === '/api/admin/issues' && request.method === 'POST') {
      if (!env.PUBLISH_TOKEN || request.headers.get('authorization') !== `Bearer ${env.PUBLISH_TOKEN}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (Number(request.headers.get('content-length')) > 512_000) {
        return Response.json({ error: 'Payload too large' }, { status: 413 })
      }
      const parsed = issueSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) {
        return Response.json({ error: 'Invalid issue', details: parsed.error.flatten() }, { status: 400 })
      }
      try {
        await publishIssue(env.DB, parsed.data)
      } catch (error) {
        console.error('Issue publish failed', error)
        return Response.json({ error: 'Publish failed; article IDs or URLs may already exist' }, { status: 409 })
      }
      return Response.json({ date: parsed.data.date, articles: parsed.data.articles.length })
    }
    if (path === '/api/issues' && request.method === 'GET') {
      return Response.json(await readIssues(env.DB))
    }
    if (path.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return env.ASSETS.fetch(request)
  },
}

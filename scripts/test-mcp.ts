import assert from 'node:assert/strict'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { createServer } from '../worker/mcp'

let publishes = 0
const db = {
  prepare(sql: string) {
    return { sql, bind(...args: unknown[]) { return { sql, args } } }
  },
  async batch(statements: { sql: string }[]) {
    if (statements[0]?.sql.startsWith('SELECT')) {
      return [
        { results: [{ id: 'a', issue_date: '2026-10-27', title: 'A', original_title: 'A', category: 'AI', source: 'Example', published_at: '2026-10-27', url: 'https://example.com/a', project_url: null, discussion_url: null, summary: 'S', details: 'D' }] },
        { results: [] },
        { results: [{ date: '2026-10-27' }] },
      ]
    }
    publishes += 1
    return []
  },
} as unknown as D1Database

const server = createServer({ DB: db } as Env)
const client = new Client({ name: 'dev-radar-test', version: '1.0.0' })
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

const tools = await client.listTools()
assert.deepEqual(tools.tools.map(({ name }) => name).sort(), ['get_recent_issues', 'publish_daily_issue'])
const recent = await client.callTool({ name: 'get_recent_issues', arguments: {} })
assert.match(JSON.stringify(recent), /example\.com\/a/)
assert.doesNotMatch(JSON.stringify(recent), /"details"/)

const invalid = await client.callTool({ name: 'publish_daily_issue', arguments: { issue: { date: '2026-10-27', articles: [] } } })
assert.equal(invalid.isError, true)
assert.equal(publishes, 0)

const article = {
  title: 'Test article', originalTitle: 'Test article', category: 'AI',
  source: 'Example', publishedAt: '2026-10-27', summary: 'Summary', details: 'Details',
}
const published = await client.callTool({
  name: 'publish_daily_issue',
  arguments: {
    issue: {
      date: '2026-10-27',
      articles: [1, 2, 3].map((number) => ({
        ...article, id: `test-${number}`, url: `https://example.com/${number}`,
      })),
    },
  },
})
assert.equal(published.isError, undefined)
assert.equal(publishes, 1)

await client.close()
await server.close()
console.log('MCP tool tests passed.')

import assert from 'node:assert/strict'
import { issueSchema } from '../src/lib/news-schema.ts'

const article = (id: number) => ({
  id: String(id), title: '標題', originalTitle: 'Title', category: 'AI',
  source: 'Source', publishedAt: '2026-10-25', url: `https://example.com/${id}`,
  summary: '摘要', details: '## 細節',
  heat: [{ platform: 'Hacker News', metric: 'Points', value: 120,
    sourceUrl: 'https://news.ycombinator.com/item?id=1', checkedAt: '2026-10-25T08:30:00Z' }],
})
const issue = { date: '2026-10-25', articles: [article(1), article(2), article(3)] }

assert.equal(issueSchema.safeParse(issue).success, true)
assert.equal(issueSchema.safeParse({ ...issue, articles: [article(1), article(1), article(3)] }).success, false)
assert.equal(issueSchema.safeParse({ ...issue, articles: [article(1), { ...article(2), url: article(1).url }, article(3)] }).success, false)
assert.equal(issueSchema.safeParse({ ...issue, date: '2026-02-30' }).success, false)
assert.equal(issueSchema.safeParse({ ...issue, articles: [article(1), { ...article(2), url: 'javascript:alert(1)' }, article(3)] }).success, false)
assert.equal(issueSchema.safeParse({ ...issue, articles: [article(1), { ...article(2), heat: [{ ...article(2).heat[0], checkedAt: '2026-10-25' }] }, article(3)] }).success, false)

console.log('News schema tests passed.')

import assert from 'node:assert/strict'
import { handleAssistant, selectRelevantArticles } from '../worker/assistant.ts'
import type { PublishEnv } from '../worker/types.ts'

const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
const rows = [
  { id: 'tool', issue_date: today, title: '新版開發工具', category: '工具', summary: '編輯器更新', details: '支援更多外掛' },
  { id: 'ai', issue_date: today, title: 'OpenAI 推出新模型', category: 'AI', summary: '模型更快', details: '適合程式開發' },
  { id: 'security', issue_date: '2025-01-01', title: '資安修補公告', category: '安全', summary: '修補漏洞', details: '請更新套件' },
]

assert.deepEqual(selectRelevantArticles(rows, 'OpenAI 有什麼新聞？').map(({ id }) => id), ['ai'])
assert.deepEqual(selectRelevantArticles(rows, '幫我整理最近新聞').map(({ id }) => id), ['tool', 'ai', 'security'])
assert.deepEqual(selectRelevantArticles(rows, '今天有哪些資安新聞？'), [])

const aiCalls: { model: string; prompt: string }[] = []
const env = {
  DB: { prepare: () => ({ all: async () => ({ results: rows }) }) },
  ASSISTANT_RATE_LIMITER: { limit: async () => ({ success: true }) },
  AI: { run: async (model: string, options: { messages: { content: string }[] }) => {
    const prompt = options.messages.at(-1)?.content ?? ''
    aiCalls.push({ model, prompt })
    return { choices: [{ message: { content: prompt.includes('RAG') ? 'RAG 是檢索增強生成。' : 'OpenAI 推出新模型，摘要指出速度更快。' } }] }
  } },
} as unknown as PublishEnv

const request = (question: unknown, articleId?: string) => new Request('https://example.com/api/assistant', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ question, articleId }),
})

assert.equal((await handleAssistant(request(''), env)).status, 400)
assert.equal((await handleAssistant(request('x'.repeat(301)), env)).status, 400)
assert.equal((await handleAssistant(new Request('https://example.com/api/assistant', { method: 'POST', body: 'hello' }), env)).status, 415)

const response = await handleAssistant(request('OpenAI 有什麼新聞？'), env)
assert.equal(response.status, 200)
assert.deepEqual(await response.json(), {
  answer: 'OpenAI 推出新模型，摘要指出速度更快。',
  sources: [{ id: 'ai', title: 'OpenAI 推出新模型', date: today }],
})
assert.equal(aiCalls.length, 1)
assert.equal(aiCalls[0].model, '@cf/openai/gpt-oss-120b')

const currentArticle = await handleAssistant(request('這篇重點是什麼？', 'security'), env)
assert.equal((await currentArticle.json()).sources[0].id, 'security')
assert.equal(aiCalls.length, 2)

const noMatch = await handleAssistant(request('今天有哪些資安新聞？'), env)
assert.equal(noMatch.status, 200)
assert.deepEqual((await noMatch.json()).sources, [])
assert.equal(aiCalls.length, 3)
assert.match(aiCalls[2].prompt, /目前沒有找到相關的本站新聞/)

const general = await handleAssistant(request('什麼是 RAG？'), env)
assert.equal(general.status, 200)
assert.deepEqual(await general.json(), { answer: 'RAG 是檢索增強生成。', sources: [] })
assert.equal(aiCalls.length, 4)

const generalFromArticle = await handleAssistant(request('什麼是 RAG？', 'security'), env)
assert.equal(generalFromArticle.status, 200)
assert.deepEqual(await generalFromArticle.json(), { answer: 'RAG 是檢索增強生成。', sources: [] })
assert.doesNotMatch(aiCalls.at(-1)?.prompt ?? '', /使用者目前閱讀的是新聞/)

const emptyEnv = {
  ...env,
  DB: { prepare: () => ({ all: async () => ({ results: [] }) }) },
} as PublishEnv
const withoutArticles = await handleAssistant(request('什麼是 RAG？'), emptyEnv)
assert.equal(withoutArticles.status, 200)
assert.deepEqual(await withoutArticles.json(), { answer: 'RAG 是檢索增強生成。', sources: [] })

const blocked = {
  ...env,
  ASSISTANT_RATE_LIMITER: { limit: async () => ({ success: false }) },
} as PublishEnv
assert.equal((await handleAssistant(request('OpenAI'), blocked)).status, 429)

console.log('Assistant tests passed.')

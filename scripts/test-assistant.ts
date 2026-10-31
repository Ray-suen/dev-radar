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

const aiCalls: { model: string; prompt: string; messages: { role: string; content: string }[]; maxTokens: number }[] = []
const env = {
  DB: { prepare: () => ({ all: async () => ({ results: rows }) }) },
  ASSISTANT_RATE_LIMITER: { limit: async () => ({ success: true }) },
  AI: { run: async (model: string, options: { messages: { role: string; content: string }[]; max_tokens: number }) => {
    const prompt = options.messages.at(-1)?.content ?? ''
    aiCalls.push({ model, prompt, messages: options.messages, maxTokens: options.max_tokens })
    return { choices: [{ message: { content: prompt.includes('RAG') ? 'RAG 是檢索增強生成。' : 'OpenAI 推出新模型，摘要指出速度更快。' } }] }
  } },
} as unknown as PublishEnv

const request = (question: unknown, articleId?: string, history?: unknown) => new Request('https://example.com/api/assistant', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ question, articleId, history }),
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
assert.equal(aiCalls[0].model, '@cf/qwen/qwen3-30b-a3b-fp8')
assert.equal(aiCalls[0].maxTokens, 8192)

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

const history = Array.from({ length: 3 }, (_, index) => ({ question: `第 ${index + 1} 題`, answer: `第 ${index + 1} 題的回答` }))
const followUp = await handleAssistant(request('它和 VS Code 差在哪？', undefined, history), env)
assert.equal(followUp.status, 200)
assert.deepEqual(aiCalls.at(-1)?.messages.slice(1, -1), history.flatMap(({ question, answer }) => [
  { role: 'user', content: question },
  { role: 'assistant', content: answer },
]))
assert.match(aiCalls.at(-1)?.prompt ?? '', /它和 VS Code 差在哪/)
assert.equal((await handleAssistant(request('下一題', undefined, [...history, history[0]]), env)).status, 400)
assert.equal((await handleAssistant(request('下一題', undefined, [{ question: '上一題', answer: 'x'.repeat(3001) }]), env)).status, 400)
assert.equal((await handleAssistant(request('下一題', undefined, [{ question: '上一題', answer: '中'.repeat(23000) }]), env)).status, 413)

const truncatedEnv = {
  ...emptyEnv,
  AI: { run: async (_model: string, options: { max_tokens: number }) => {
    assert.equal(options.max_tokens, 8192)
    return { choices: [{ finish_reason: 'length', message: { content: '未完成的回答' } }] }
  } },
} as unknown as PublishEnv
const truncated = await handleAssistant(request('請解釋這項技術'), truncatedEnv)
assert.equal(truncated.status, 503)
assert.deepEqual(await truncated.json(), { error: '回答內容太長，請縮小問題範圍後再試。' })

console.log('Assistant tests passed.')

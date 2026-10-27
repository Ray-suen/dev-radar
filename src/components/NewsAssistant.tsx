import { useEffect, useRef, useState } from 'react'

type Source = { id: string; title: string; date: string }
type Exchange = { question: string; answer?: string; sources?: Source[] }

const suggestions = ['這週有哪些 AI 新聞？', '最近有什麼開發工具更新？', '整理近期的資安新聞']

export function NewsAssistant({ articleId }: { articleId?: string }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.classList.toggle('assistant-open', open)
    if (open) inputRef.current?.focus()
    return () => document.body.classList.remove('assistant-open')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' })
  }, [exchanges, pending])

  async function ask(rawQuestion: string) {
    const submitted = rawQuestion.trim()
    if (!submitted || pending) return
    setQuestion('')
    setError('')
    setPending(true)
    setExchanges((previous) => [...previous, { question: submitted }])
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: submitted, ...(articleId && { articleId }) }),
      })
      const data: { answer?: string; sources?: Source[]; error?: string } = await response.json()
      if (!response.ok || !data.answer) throw new Error(data.error || '助手暫時無法回答，請稍後再試。')
      setExchanges((previous) => previous.map((exchange, index) =>
        index === previous.length - 1 ? { ...exchange, answer: data.answer, sources: data.sources ?? [] } : exchange,
      ))
    } catch (cause) {
      setExchanges((previous) => previous.slice(0, -1))
      setQuestion((current) => current || submitted)
      setError(cause instanceof Error ? cause.message : '助手暫時無法回答，請稍後再試。')
    } finally {
      setPending(false)
    }
  }

  function close() {
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <>
      {!open && (
        <button ref={triggerRef} type="button" className="assistant-trigger" aria-label="開啟小助手" title="小助手" aria-expanded="false" aria-controls="news-assistant" onClick={() => setOpen(true)}>
          小助手
        </button>
      )}
      {open && <button type="button" className="assistant-backdrop" aria-label="關閉小助手" onClick={close} />}
      {open && <aside id="news-assistant" className="assistant-panel" aria-label="小助手">
        <div className="assistant-heading">
          <div>
            <p className="assistant-eyebrow">DEV RADAR / NEWS</p>
            <h2>小助手</h2>
          </div>
          <button type="button" className="assistant-close" aria-label="關閉小助手" onClick={close}>×</button>
        </div>
        <div ref={conversationRef} className="assistant-conversation" aria-live="polite">
          {exchanges.length === 0 && (
            <div className="assistant-intro">
              <p>{articleId ? '可以問我這篇文章，或查找其他本站新聞。我會附上參考連結。' : '想找哪則新聞？我會根據本站文章回答，並附上參考連結。'}</p>
              <div className="assistant-suggestions">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void ask(suggestion)}>{suggestion}</button>
                ))}
              </div>
            </div>
          )}
          {exchanges.map((exchange, index) => (
            <div className="assistant-exchange" key={index}>
              <p className="assistant-question">{exchange.question}</p>
              {exchange.answer && (
                <div className="assistant-answer">
                  <p>{exchange.answer}</p>
                  {!!exchange.sources?.length && (
                    <div className="assistant-sources">
                      <span>參考新聞</span>
                      {exchange.sources.map((source) => (
                        <a key={source.id} href={`#/article/${encodeURIComponent(source.id)}`} onClick={close}>
                          {source.title} <small>{source.date}</small>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {pending && <p className="assistant-loading" role="status">正在查找新聞並整理回答…</p>}
          {error && <p className="assistant-error" role="alert">{error}</p>}
        </div>
        <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); void ask(question) }}>
          <label htmlFor="assistant-question" className="sr-only">你的新聞問題</label>
          <textarea id="assistant-question" ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question) } }} placeholder="問問近期的技術新聞…" maxLength={300} rows={2} disabled={!open} />
          <button type="submit" aria-label="送出問題" title="送出問題" disabled={pending || !question.trim()}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5m-6 6 6-6 6 6" />
            </svg>
          </button>
        </form>
        <p className="assistant-footnote">回答由 AI 整理，請點開來源核對。</p>
      </aside>}
    </>
  )
}
